/**
 * 【范本】`.kux` 仓库容器：导出 / 导入。
 *
 * 容器格式（契约 §2.4）：`{ arrFileData: [{name, data}], store: 索引镜像 }`。
 * `data` 是库文件的 base64；`false` 表示「这个文件当时读不到」（导出格式要求）。
 * 旁路图只有 `kuStyle/*`（样式 PSD/PNG）和 `Gradient/*`（渐变预览图）。
 * 导入前必须给内层文件发新 id（`remapKuContainer`，契约 §5.2），否则同名文件会覆盖本地。
 * 编解码纯函数在 `domain/ku-io.ts`（app 移植）；本文件只管磁盘与索引。
 */
import { userSubPath } from '../core/paths';
import type { StorageRoot } from '../core/storage';
import {
  ROOTS,
  copyFileAt,
  readTextAt,
  readTextResult,
  removeFile,
  writeTextAtomic,
  writeTextAtAtomic
} from '../core/storage';
import { log } from '../core/logger';

/** 样式库全部在官方数据根下（与 `style-repo` 同一个常量写法） */
const ROOT: StorageRoot = 'legacy';
import { fileNameOf, kuGuid } from '../domain/style-library';
import { decodeBase64, encodeBase64 } from '../core/cep/base64';
import { readIndex, readIndexText, writeIndexRaw } from './style-repo';
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

import { normalizeStyleIndex, type StyleWarehouse, type StyleWarehouseIndex } from '../domain/style-library';
import { MSG } from '../types/messages';
import { fail, failWithDetail, ok, type Result } from '../types/result';
import { isRecord } from '../types/guards';
import { parseJson } from '../types/json';

function userDir(): string {
  return userSubPath(ROOTS.legacy.replace(/^\//, ''));
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
  const names: string[] = [];
  for (const kind of ['style', 'gradient'] as const) {
    const fileName = fileNameOf(warehouse, kind);
    if (!fileName) continue;

    /* 库文件不存在 = 这个库没导出过，跳过；读坏 / IO 失败必须中止
       （跳过会让导出的包少几张旁路图，而用户以为导全了） */
    const text = readTextResult(fileName, ROOT);
    if (text.status === 'error') {
      if (text.code === 'NOT_FOUND') continue;
      return text;
    }

    const parsed = parseJson(text.value, fileName);
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

export async function exportKuArchive(
  current: boolean,
  targetPath: string
): Promise<Result<void>> {
  const index = readIndex();
  if (index.status === 'error') return index;

  const list = current ? [index.value.list[index.value.index]].filter(Boolean) : index.value.list;
  if (!list.length) return failWithDetail('VALIDATION', MSG.stale, 'index:no-entry');

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
      const read = readTextResult(fileName, ROOT);
      if (read.status === 'ok') data = encodeBase64(read.value);
      else log.warn('导出：库文件读不到', { fileName, reason: read.reason });
      arrFileData.push({ name: fileName, data });
    }
    const sidecars = sidecarNamesOfWarehouse(warehouse);
    if (sidecars.status === 'error') return sidecars;
    for (const name of sidecars.value) {
      let data: string | false = false;
      const read = readTextResult(name, ROOT);
      if (read.status === 'ok') data = encodeBase64(read.value);
      else log.warn('导出：旁路图读不到', { name, reason: read.reason });
      arrFileData.push({ name, data });
    }
  }

  if (!arrFileData.length) {
    return failWithDetail('VALIDATION', MSG.stale, 'index:disk-mismatch');
  }

  return writeTextAtAtomic(targetPath, encodeKuContainer({ arrFileData, store }));
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

/**
 * 覆盖导入后清理旧文件：先复制进 `.deleted-<时间戳>/` 再删（复制失败就保留原件）。
 * 用 `copyFileAt` 走二进制复制——旧实现按 utf8 读写，PNG/PSD 旁路图会被写坏。
 */
function recycleOldFiles(names: readonly string[]): void {
  const dir = `${userDir()}/.deleted-${Date.now()}`;
  for (const name of names) {
    const copied = copyFileAt(`${userDir()}/${name}`, `${dir}/${name}`);
    if (copied.status === 'error') {
      log.warn('替换导入：旧文件回收失败（保留原件）', { name, reason: copied.reason });
      continue;
    }
    removeFile(name, ROOT);
  }
}

export interface KuImportResult {
  warehouses: number;
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
  const read = readTextAt(sourcePath);
  if (read.status === 'error') return read;

  const decoded = parseKuContainer(read.value);
  if (decoded.status === 'error') {
    /* 只加「这是导入文件」的语境，`code` 与 `detail` 原样带过去——
       以前用 `fail(code, ...)` 重包，`detail` 被静默丢掉（刀 14：重包必须逐字段声明） */
    return failWithDetail(decoded.code, `导入文件结构不认识：${decoded.reason}`, decoded.detail);
  }
  const imported = decoded.value;

  const safe = validateContainer(imported);
  if (safe.status === 'error') return safe;

  const remapped = remapKuContainer(imported, kuGuid, {
    encode: encodeBase64,
    decode: decodeBase64
  });
  if (remapped.status === 'error') {
    return fail(remapped.code, `导入文件内层结构不认识：${remapped.reason}`);
  }
  const file = remapped.value;

  const safe2 = validateContainer(file);
  if (safe2.status === 'error') return safe2;

  const before = readIndex();
  const oldFiles = append || before.status === 'error' ? [] : collectIndexFiles(before.value);

  /* 写内层文件：b64 → utf8 落盘（remap 已换新 id，不会覆盖本地同名）；已有文件先 .bak */
  for (const entry of file.arrFileData) {
    if (typeof entry.data !== 'string') continue;
    /* 写内层文件统一走 storage：自动 `.bak` + 同文件串行 */
    const written = await writeTextAtomic(entry.name, decodeBase64(entry.data), ROOT);
    if (written.status === 'error') {
      return fail(written.code, `写入 ${entry.name} 失败：${written.reason}`);
    }
  }

  /* 索引：覆盖 = 整份替换；追加 = 包里的仓库 push 到现有 list（原始 JSON 上改，保未知键） */
  const nextIndex = normalizeStyleIndex(file.store);
  const incoming = (nextIndex.list as StyleWarehouse[]).map((warehouse) => ({ ...warehouse }));
  if (append && before.status === 'ok') {
    const local = readIndexText();
    if (local.status === 'error') return local;

    const parsed = parseJson(local.value, '本地索引');
    if (parsed.status === 'error') {
      return failWithDetail('CORRUPT', MSG.corrupt, 'index:unreadable');
    }
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
