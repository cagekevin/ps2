// 【范本】是什么：样式库文件的导出/导入编解码 —— `.kux` 容器、`.kus/.kug` 扁平清单、`.kuc/.kuf` 裸组数组，纯函数
// 唯一入口：三种顶层形态的编解码与「导入时 id 重写」只能经过这里
// 替代了什么：`domain/ku-format.ts` 只有读取侧的形态识别；写侧与 id 重写此前没有（台账 T-48 尾部）
// 谁在用：`repo/ku-archive.ts`
// 禁止：不读文件、不碰 CEP；base64 编解码由调用方注入（与 `ku-format` 的 `decode` 同口径）
// 结果：与全仓一致用 `Result<T>`，不再有第二套 `Decoded/DecodeFail`

import { decodeKuData, isKuLibraryFileName, kuLibraryKind } from './ku-format';
import type { KuKind, StyleWarehouseIndex } from './style-library';
import { isArrayOf, isRecord } from '../types/guards';
import { parseJson } from '../types/json';
import { fail, failWithDetail, ok, type Result } from '../types/result';

/** 导出文件里的一个条目。`data` 是布尔 `false` 时表示「这个文件当时读不到」（契约 §2.5/§2.6） */
export interface KuFileEntry {
  name: string;
  data: string | false;
}

/** `.kux` 容器（契约 §2.4）。`store` 是磁盘索引的镜像，不裁剪不补字段 */
export interface KuContainerFile {
  arrFileData: KuFileEntry[];
  store: StyleWarehouseIndex;
}

/** 库文件里的一组；未知键原样保留（契约 §7 第 8 条） */
export type KuRawGroup = Record<string, unknown>;

/** base64 编解码由调用方注入，domain 不依赖 CEP/Node */
export interface KuCodec {
  encode(text: string): string;
  decode(base64: string): string;
}

/** 生成 16 位大写 hex；测试注入固定序列 */
export type KuGuid = () => string;

/** 容器内层库文件的顺序 = `["color","style","font","gradient"]`（契约 §2.5 第 1 点实测） */
export const KU_CONTAINER_ORDER: readonly KuKind[] = ['color', 'style', 'font', 'gradient'];

const KU_LIBRARY_FIELDS = ['color', 'gradient', 'font', 'style'] as const;

function describeShape(raw: unknown): string {
  if (raw === null) return 'null';
  if (raw === undefined) return 'undefined';
  if (Array.isArray(raw)) return 'array';
  return typeof raw;
}

function shapeFail(
  field: string,
  expected: 'object' | 'array' | 'string' | 'number',
  raw: unknown
): Result<never> {
  return failWithDetail(
    'CORRUPT',
    `${field || '顶层'} 期望 ${expected}，实际 ${describeShape(raw)}`,
    `shape:${field}`
  );
}

function badItem(index: number): Result<never> {
  return fail('CORRUPT', `第 ${index} 项不是对象`);
}

function emptyContent(): Result<never> {
  return fail('CORRUPT', '内容为空');
}

function normalizeEntry(raw: unknown, index: number): Result<KuFileEntry> {
  if (!isRecord(raw)) return badItem(index + 1);
  if (typeof raw.name !== 'string' || !raw.name) return shapeFail('name', 'string', raw.name);

  // `data` 不是字符串（实测是布尔 `false`）= 文件缺失；绝不丢给 base64 解码（契约 §2.5 第 3 点）
  return ok({ name: raw.name, data: typeof raw.data === 'string' ? raw.data : false });
}

function entriesOf(raw: unknown[]): Result<KuFileEntry[]> {
  const out: KuFileEntry[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const one = normalizeEntry(raw[index], index);
    if (one.status === 'error') return one;
    out.push(one.value);
  }
  return ok(out);
}

/** `.kux` / `.dzx` 容器：`{ arrFileData, store }`。失败带码，成功才给值 */
export function parseKuContainer(text: string): Result<KuContainerFile> {
  const parsed = parseJson(text, '库文件');
  if (parsed.status === 'error') return parsed;
  if (!isRecord(parsed.value)) return shapeFail('', 'object', parsed.value);

  const rawEntries = parsed.value.arrFileData;
  if (!Array.isArray(rawEntries)) return shapeFail('arrFileData', 'array', rawEntries);

  const store = parsed.value.store;
  if (!isRecord(store)) return shapeFail('store', 'object', store);

  const rawList = store.list;
  if (!Array.isArray(rawList)) return shapeFail('store.list', 'array', rawList);

  const list = rawList.filter(isRecord) as StyleWarehouseIndex['list'];
  if (!list.length) return emptyContent();

  const entries = entriesOf(rawEntries);
  if (entries.status === 'error') return entries;

  return ok({
    arrFileData: entries.value,
    store: {
      ...store,
      index: typeof store.index === 'number' ? store.index : 0,
      list
    } as StyleWarehouseIndex
  });
}

export function encodeKuContainer(file: KuContainerFile): string {
  return JSON.stringify(file);
}

/** `.kus` / `.kug`：扁平 `[{ name, data }]`，`[0]` 是库文件、其余是旁路图（契约 §2.6） */
export function parseKuFlatList(text: string): Result<KuFileEntry[]> {
  const parsed = parseJson(text, '库文件');
  if (parsed.status === 'error') return parsed;
  if (!Array.isArray(parsed.value)) return shapeFail('', 'array', parsed.value);
  if (!parsed.value.length) return emptyContent();
  return entriesOf(parsed.value);
}

export function encodeKuFlatList(entries: readonly KuFileEntry[]): string {
  return JSON.stringify(entries);
}

/** `.kuc` / `.kuf`：数组本身就是组数据（契约 §0.1） */
export function parseKuGroups(text: string): Result<KuRawGroup[]> {
  const parsed = parseJson(text, '库文件');
  if (parsed.status === 'error') return parsed;
  if (!Array.isArray(parsed.value)) return shapeFail('', 'array', parsed.value);
  if (!isArrayOf(parsed.value, isRecord)) return badItem(parsed.value.length);
  return ok(parsed.value);
}

export function encodeKuGroups(groups: readonly KuRawGroup[]): string {
  return JSON.stringify(groups);
}

/**
 * 旁路文件名只允许 `kuStyle/*`、`Gradient/*`（契约 §2.3 的缩略图与渐变预览图）。
 * 导入时要拼绝对路径，`../` 一律拒绝。
 */
export function isSafeKuEntryName(name: string): boolean {
  if (isKuLibraryFileName(name)) return !/[\\/]/.test(name);
  return /^(?:kuStyle|Gradient)\/[^\\/]+$/.test(name);
}

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  const slash = name.lastIndexOf('/');
  return dot > slash + 1 ? name.slice(dot) : '';
}

function stripExt(name: string): string {
  const ext = extOf(name);
  return ext ? name.slice(0, -ext.length) : name;
}

/** `sj_kuCol…` → 同前缀 + 新 GUID + 原扩展名；库文件名里的 ID 必须换新，否则覆盖本地（契约 §5.2） */
function renameLibraryFile(name: string, guid: KuGuid): string {
  return `${name.slice(0, 8)}${guid().toUpperCase()}${extOf(name)}`;
}

export interface KuIdRewrite {
  groups: KuRawGroup[];
  /** 旧 id → 新 id（样式组 id 带 `YS` 前缀；渐变是去掉扩展名的文件名） */
  ids: Map<string, string>;
}

/**
 * 重写一组库数据里的 id。
 *
 * 契约 §3.4 的 `replaceFileName` 是在**整串 JSON 文本**上做字符串替换；
 * 这里改成结构化改写（只动 `group.id` / `item.id` / `gradient.fileName`），
 * 避免 id 恰好出现在别的字段里被误替换。
 * UNVERIFIED: 若样式项的未知扩展字段里也引用了组/项 id，这里不会跟着改（契约 §6.1 #1a 未定案）。
 */
export function rewriteKuIds(
  kind: KuKind,
  groups: readonly KuRawGroup[],
  guid: KuGuid
): Result<KuIdRewrite> {
  const ids = new Map<string, string>();

  const nextId = (key: string): string => {
    const hit = ids.get(key);
    if (hit) return hit;
    // 样式组 id 是 `YS` + 16 位 hex（契约 §2.3）；项 id 是裸 hex
    const value = `${key.startsWith('YS') ? 'YS' : ''}${guid().toUpperCase()}`;
    ids.set(key, value);
    return value;
  };

  // `structuredClone` 保留元素类型，但入参是 `readonly` ⇒ 展开成可变数组，不用 `as`
  const next: KuRawGroup[] = [...structuredClone(groups)];

  for (const group of next) {
    if (kind === 'style') {
      // 组 / 项的 id 是原版校验的必含键（契约 §2.3 的 `checkError`）；
      // 缺了原版会把整组 / 单项 splice 掉，我们宁可整份拒绝，也不静默丢数据
      if (typeof group.id !== 'string' || !group.id) return shapeFail('id', 'string', group.id);
      group.id = nextId(group.id);
    }

    const list = Array.isArray(group.list) ? group.list : [];
    for (const item of list) {
      if (!isRecord(item)) continue;

      if (kind === 'style') {
        if (typeof item.id !== 'string' || !item.id) return shapeFail('list[].id', 'string', item.id);
        item.id = nextId(item.id);
      }
      if (kind !== 'gradient') continue;

      const gradient = item.gradient;
      if (!isRecord(gradient)) continue;
      const fileName = gradient.fileName;
      if (typeof fileName !== 'string' || !fileName) continue;

      gradient.fileName = `${nextId(stripExt(fileName))}${extOf(fileName)}`;
    }
  }

  return ok({ groups: next, ids });
}

/** 按 id 映射改旁路图文件名；映射里没有的（不属于这个库的）不动 */
export function renameKuSidecars(
  names: readonly string[],
  ids: ReadonlyMap<string, string>
): Map<string, string> {
  const renamed = new Map<string, string>();
  for (const name of names) {
    const slash = name.lastIndexOf('/');
    const dir = name.slice(0, slash + 1);
    const base = name.slice(slash + 1);
    const ext = extOf(base);
    const next = ids.get(stripExt(base));
    if (next) renamed.set(name, `${dir}${next}${ext}`);
  }
  return renamed;
}

/** 没被任何库引用的旁路图也要换名，否则会覆盖本地同名文件 */
export function renameKuSidecar(name: string, guid: KuGuid): string {
  const slash = name.lastIndexOf('/');
  const dir = name.slice(0, slash + 1);
  const base = name.slice(slash + 1);
  const ext = extOf(base);
  const key = stripExt(base);
  return `${dir}${key.startsWith('YS') ? 'YS' : ''}${guid().toUpperCase()}${ext}`;
}

/**
 * 重写 `.kux` 容器内层：库文件名 / 样式组与项 id / 渐变预览图名，并把 `store.list` 的四个文件字段跟着换。
 * 库载荷同步重新编码（原版也是 `b64ToUtf8` → 替换 → `utf8ToB64`）。
 */
export function remapKuContainer(
  file: KuContainerFile,
  guid: KuGuid,
  codec: KuCodec
): Result<KuContainerFile> {
  const sidecarNames = file.arrFileData
    .filter((entry) => !isKuLibraryFileName(entry.name))
    .map((entry) => entry.name);

  const nameMap = new Map<string, string>();
  const sidecarMap = new Map<string, string>();
  const rewritten = new Map<string, KuFileEntry>();

  for (const entry of file.arrFileData) {
    const kind = kuLibraryKind(entry.name);
    // 旁路图（`kuStyle/*` / `Gradient/*`）不是库文件 ⇒ 内容不动，改名由 `sidecarMap` 统一处理
    if (kind === 'sidecar') continue;

    const name = renameLibraryFile(entry.name, guid);
    nameMap.set(entry.name, name);

    if (typeof entry.data !== 'string') {
      rewritten.set(entry.name, { name, data: entry.data });
      continue;
    }

    // 没有内容（`data:false` / 空串）⇒ 原样保留，不重写。
    // 宿主的 decodeKuData 也返回 Result；失败同样原样保留
    const content = decodeKuData(entry.data, codec.decode);
    if (content.status === 'error') {
      rewritten.set(entry.name, { name, data: entry.data });
      continue;
    }

    // 内层库文件的失败**原样上抛**：本文件只表达一次「读不懂」，不为写侧另造说法
    const groups = parseKuGroups(content.value);
    if (groups.status === 'error') return groups;

    const result = rewriteKuIds(kind, groups.value, guid);
    if (result.status === 'error') return result;
    for (const [oldName, newName] of renameKuSidecars(sidecarNames, result.value.ids)) {
      if (!sidecarMap.has(oldName)) sidecarMap.set(oldName, newName);
    }
    rewritten.set(entry.name, {
      name,
      data: codec.encode(encodeKuGroups(result.value.groups))
    });
  }

  const arrFileData = file.arrFileData.map((entry) => {
    if (isKuLibraryFileName(entry.name)) return rewritten.get(entry.name) ?? entry;
    return {
      name: sidecarMap.get(entry.name) ?? renameKuSidecar(entry.name, guid),
      data: entry.data
    };
  });

  const list = file.store.list.map((warehouse) => {
    const next: Record<string, unknown> = { ...warehouse };
    for (const field of KU_LIBRARY_FIELDS) {
      const value = next[field];
      if (typeof value === 'string') next[field] = nameMap.get(value) ?? value;
    }
    return next as StyleWarehouseIndex['list'][number];
  });

  return ok({ arrFileData, store: { ...file.store, list } });
}

export interface KuAppendPayload {
  groups: KuRawGroup[];
  /** 旁路图（`data: false` 的条目保留，调用方按契约跳过不写） */
  sidecars: KuFileEntry[];
}

/** 单库追加导入：重写组/项 id 与旁路图名，返回要追加的组与要落盘的图片 */
export function prepareKuAppend(
  kind: KuKind,
  groups: readonly KuRawGroup[],
  sidecars: readonly KuFileEntry[],
  guid: KuGuid
): Result<KuAppendPayload> {
  const rewritten = rewriteKuIds(kind, groups, guid);
  if (rewritten.status === 'error') return rewritten;

  const renamed = renameKuSidecars(
    sidecars.map((entry) => entry.name),
    rewritten.value.ids
  );

  return ok({
    groups: rewritten.value.groups,
    sidecars: sidecars.map((entry) => ({
      name: renamed.get(entry.name) ?? renameKuSidecar(entry.name, guid),
      data: entry.data
    }))
  });
}
