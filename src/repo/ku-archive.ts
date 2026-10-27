/**
 * 【范本】`.kux` 仓库容器：导出 / 导入。
 *
 * 容器格式（契约 §2.4）：`{ arrFileData: [{name, data}], store: 索引镜像 }`。
 * `data` 是库文件的 base64；`false` 表示「这个文件当时读不到」（导出格式要求）。
 * 旁路图只有 `kuStyle/*`（样式 PSD/PNG）和 `Gradient/*`（渐变预览图）。
 * 导入前必须给内层文件发新 id（`remapKuContainer`，契约 §5.2），否则同名文件会覆盖本地。
 * 编解码纯函数在 `domain/ku-io.ts`（app 移植）；本文件只管磁盘与索引。
 */
import { nodeRequire } from '../core/cep/node';
import { getUserDataPath } from '../core/cep/bridge';
import { ROOTS, writeTextAtomic } from '../core/storage';
import { log } from '../core/logger';
import { fileNameOf, kuGuid } from '../domain/style-library';
import { readIndex, decodeBase64 } from './style-repo';
import {
  encodeKuContainer,
  isSafeKuEntryName,
  KU_CONTAINER_ORDER,
  parseKuContainer,
  remapKuContainer,
  type KuContainerFile,
  type KuFileEntry,
  type KuRawGroup
} from '../domain/ku-io';
import { isDecodeFail } from '../types/decode';
import { normalizeStyleIndex, type StyleWarehouse, type StyleWarehouseIndex } from '../domain/style-library';
import { fail, ok, type Result } from '../types/result';
import { isRecord } from '../types/guards';
import { parseJson } from '../types/json';

interface FsLike {
  readFileSync(path: string, encoding: 'utf8'): string;
  writeFileSync(path: string, data: string, encoding: 'utf8'): void;
  existsSync(path: string): boolean;
  mkdirSync(path: string, options: { recursive: boolean }): void;
  unlinkSync(path: string): void;
}

function fs(): FsLike | null {
  return nodeRequire<FsLike>('fs');
}

function utf8ToB64(text: string): string {
  const mod = nodeRequire<{
    Buffer: { from(data: string, encoding: 'utf8'): { toString(encoding: 'base64'): string } };
  }>('buffer');
  if (mod?.Buffer) return mod.Buffer.from(text, 'utf8').toString('base64');
  return btoa(unescape(encodeURIComponent(text)));
}

function userDir(): string {
  return `${getUserDataPath()}/${ROOTS.legacy.replace(/^\//, '')}`;
}

/** 库数据里引用的旁路图（app `sidecarNamesOf` :138-164） */
function sidecarNamesOf(kind: 'style' | 'gradient', groups: readonly KuRawGroup[]): string[] {
  const names = new Set<string>();
  for (const group of groups) {
    const list = Array.isArray(group.list) ? group.list : [];
    if (kind === 'style') {
      if (typeof group.id === 'string' && group.id) names.add(`kuStyle/${group.id}.psd`);
      for (const item of list) {
        if (isRecord(item) && typeof item.id === 'string' && item.id) {
          names.add(`kuStyle/${item.id}.png`);
        }
      }
      continue;
    }
    for (const item of list) {
      if (!isRecord(item)) continue;
      const gradient = item.gradient;
      if (isRecord(gradient) && typeof gradient.fileName === 'string' && gradient.fileName) {
        names.add(`Gradient/${gradient.fileName}`);
      }
    }
  }
  return [...names];
}

function sidecarNamesOfWarehouse(warehouse: StyleWarehouse): Result<string[]> {
  const fileSystem = fs();
  if (!fileSystem) return fail('IO_ERROR', 'Node 文件模块不可用');

  const names: string[] = [];
  for (const kind of ['style', 'gradient'] as const) {
    const fileName = fileNameOf(warehouse, kind);
    if (!fileName) continue;

    const path = `${userDir()}/${fileName}`;
    if (!fileSystem.existsSync(path)) continue; // 库文件不存在 = 这个库没导出过，跳过

    /* 读到了但解析失败必须中止（app 同位置同规则）：跳过会让导出的包
       少几张旁路图，而用户以为导全了——「读不到」和「读不懂」不许同待遇 */
    const text = fileSystem.readFileSync(path, 'utf8');
    const parsed = parseJson(text, fileName);
    if (parsed.status === 'error') return parsed;
    if (!Array.isArray(parsed.value)) return fail('CORRUPT', `${fileName} 顶层不是数组`);
    names.push(...sidecarNamesOf(kind, parsed.value as KuRawGroup[]));
  }
  return ok(names);
}

export function kuArchiveDefaultName(current: boolean): string {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `样式仓库_${current ? '当前' : '全部'}_${day}.kux`;
}

export function exportKuArchive(current: boolean, targetPath: string): Result<void> {
  const fileSystem = fs();
  if (!fileSystem) return fail('IO_ERROR', 'Node 文件模块不可用');

  const index = readIndex();
  if (index.status === 'error') return index;

  const list = current ? [index.value.list[index.value.index]].filter(Boolean) : index.value.list;
  if (!list.length) return fail('VALIDATION', '没有可导出的仓库');

  const store = (current
    ? { ...index.value, index: 0, list: [{ ...list[0] }] }
    : index.value) as StyleWarehouseIndex;

  const arrFileData: KuFileEntry[] = [];
  for (const warehouse of list as StyleWarehouse[]) {
    for (const kind of KU_CONTAINER_ORDER) {
      const fileName = fileNameOf(warehouse, kind);
      if (!fileName) continue;
      /* 契约 §2.5：读不到就写 false，不中断 */
      let data: string | false = false;
      try {
        data = utf8ToB64(fileSystem.readFileSync(`${userDir()}/${fileName}`, 'utf8'));
      } catch (error) {
        log.warn('导出：库文件读不到', { fileName, error });
      }
      arrFileData.push({ name: fileName, data });
    }
    const sidecars = sidecarNamesOfWarehouse(warehouse);
    if (sidecars.status === 'error') return sidecars;
    for (const name of sidecars.value) {
      let data: string | false = false;
      try {
        data = utf8ToB64(fileSystem.readFileSync(`${userDir()}/${name}`, 'utf8'));
      } catch (error) {
        log.warn('导出：旁路图读不到', { name, error });
      }
      arrFileData.push({ name, data });
    }
  }

  if (!arrFileData.length) return fail('VALIDATION', '没有可导出的库文件（索引与磁盘不符）');

  try {
    fileSystem.writeFileSync(targetPath, encodeKuContainer({ arrFileData, store }), 'utf8');
  } catch (error) {
    return fail('IO_ERROR', `写入导出文件失败：${String(error)}`);
  }
  return ok(undefined);
}

/* ---------------- 导入 ---------------- */

function assertSafeNames(entries: readonly KuFileEntry[]): Result<void> {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!isSafeKuEntryName(entry.name)) {
      return fail('VALIDATION', `导入文件名不合法：${entry.name}`);
    }
    if (seen.has(entry.name)) return fail('VALIDATION', `导入文件名重复：${entry.name}`);
    seen.add(entry.name);
  }
  return ok(undefined);
}

/** `store.list` 引用的库文件必须在 `arrFileData` 里，否则写完索引就指向不存在的文件 */
function validateContainer(file: KuContainerFile): Result<void> {
  const safe = assertSafeNames(file.arrFileData);
  if (safe.status === 'error') return safe;
  const names = new Set(file.arrFileData.map((entry) => entry.name));
  for (const warehouse of file.store.list) {
    for (const kind of KU_CONTAINER_ORDER) {
      const fileName = fileNameOf(warehouse, kind);
      if (fileName && !names.has(fileName)) {
        return fail('VALIDATION', `索引引用的库文件不在包里：${fileName}`);
      }
    }
  }
  return ok(undefined);
}

/** 覆盖导入后清理旧文件：先复制进 `.deleted-<时间戳>/` 再删（复制失败就保留原件） */
function recycleOldFiles(names: readonly string[]): void {
  const fileSystem = fs();
  if (!fileSystem) return;
  const dir = `${userDir()}/.deleted-${Date.now()}`;
  for (const name of names) {
    try {
      fileSystem.mkdirSync(dir, { recursive: true });
      fileSystem.writeFileSync(
        `${dir}/${name}`,
        fileSystem.readFileSync(`${userDir()}/${name}`, 'utf8'),
        'utf8'
      );
      fileSystem.unlinkSync(`${userDir()}/${name}`);
    } catch (error) {
      log.warn('替换导入：旧文件回收失败（保留原件）', { name, error });
    }
  }
}

export interface KuImportResult {
  warehouses: number;
}

/** 索引写回：原始 JSON 上改（保未知键），走 writeTextAtomic（.bak） */
async function writeIndexRaw(next: Record<string, unknown>): Promise<Result<void>> {
  return writeTextAtomic('sj_kuStoreInfo.ini', JSON.stringify(next), 'legacy');
}

/** 旧索引引用的全部文件，用于覆盖导入后的回收 */
function collectIndexFiles(index: StyleWarehouseIndex): string[] {
  const names: string[] = [];
  for (const warehouse of index.list) {
    for (const kind of KU_CONTAINER_ORDER) {
      const fileName = fileNameOf(warehouse, kind);
      if (fileName) names.push(fileName);
    }
    const sidecars = sidecarNamesOfWarehouse(warehouse);
    if (sidecars.status === 'ok') names.push(...sidecars.value);
  }
  return [...new Set(names)];
}

/**
 * 导入 `.kux`。`append = false` 是覆盖：旧文件先复制进回收目录再删；
 * `append = true` 是追加：只 push 仓库，本地文件不动。两条路径都先发新 id。
 */
export async function importKuArchive(
  append: boolean,
  sourcePath: string
): Promise<Result<KuImportResult>> {
  const fileSystem = fs();
  if (!fileSystem) return fail('IO_ERROR', 'Node 文件模块不可用');

  let text: string;
  try {
    text = fileSystem.readFileSync(sourcePath, 'utf8');
  } catch {
    return fail('IO_ERROR', '读取导入文件失败');
  }

  const decoded = parseKuContainer(text);
  if (isDecodeFail(decoded)) {
    return fail('CORRUPT', `导入文件结构不认识：${decoded.fail}`);
  }
  const imported = decoded.value;

  const safe = validateContainer(imported);
  if (safe.status === 'error') return safe;

  const remapped = remapKuContainer(imported, kuGuid, {
    encode: utf8ToB64,
    decode: decodeBase64
  });
  if (isDecodeFail(remapped)) {
    return fail('CORRUPT', `导入文件内层结构不认识：${remapped.fail}`);
  }
  const file = remapped.value;

  const safe2 = validateContainer(file);
  if (safe2.status === 'error') return safe2;

  const before = readIndex();
  const oldFiles = append || before.status === 'error' ? [] : collectIndexFiles(before.value);

  /* 写内层文件：b64 → utf8 落盘（remap 已换新 id，不会覆盖本地同名）；已有文件先 .bak */
  for (const entry of file.arrFileData) {
    if (typeof entry.data !== 'string') continue;
    const target = `${userDir()}/${entry.name}`;
    try {
      if (fileSystem.existsSync(target)) {
        fileSystem.writeFileSync(`${target}.bak`, fileSystem.readFileSync(target, 'utf8'), 'utf8');
      }
      fileSystem.writeFileSync(target, decodeBase64(entry.data), 'utf8');
    } catch (error) {
      return fail('IO_ERROR', `写入 ${entry.name} 失败：${String(error)}`);
    }
  }

  /* 索引：覆盖 = 整份替换；追加 = 包里的仓库 push 到现有 list（原始 JSON 上改，保未知键） */
  const nextIndex = normalizeStyleIndex(file.store);
  const incoming = (nextIndex.list as StyleWarehouse[]).map((warehouse) => ({ ...warehouse }));
  if (append && before.status === 'ok') {
    const parsed = parseJson(
      fileSystem.readFileSync(`${userDir()}/sj_kuStoreInfo.ini`, 'utf8'),
      '本地索引'
    );
    if (parsed.status === 'error') return fail('CORRUPT', '本地索引读不懂，无法追加导入');
    const raw = isRecord(parsed.value) ? parsed.value : {};
    const list = Array.isArray(raw.list) ? raw.list : [];
    raw.list = [...list, ...incoming];
    const written = await writeIndexRaw(raw);
    if (written.status === 'error') return fail(written.code, written.reason);
  } else {
    const written = await writeIndexRaw(file.store as unknown as Record<string, unknown>);
    if (written.status === 'error') return fail(written.code, written.reason);
    recycleOldFiles(oldFiles);
  }

  return ok({ warehouses: incoming.length });
}
