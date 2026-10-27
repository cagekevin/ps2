/**
 * 【范本】样式库数据访问
 * 只负责「从磁盘读到结构化数据」，不做业务判断、不碰 UI。
 * 所有失败都返回三态，让页面如实显示。
 */

import { nodeRequire } from '../core/cep/node';
import { readTextOutcome, writeTextAtomic } from '../core/storage';
import { parseJson } from '../domain/json';
import { resolveKuGroups } from '../domain/ku-format';
import { applyItemDrop, applyListDrop, type DropMove, type DropPosition } from '../domain/reorder';
import {
  decodeStyleIndex,
  fileNameOf,
  kuGuid,
  readKuGroups,
  type KuGroup,
  type KuKind,
  type StyleWarehouse,
  type StyleWarehouseIndex
} from '../domain/style-library';
import { isRecord } from '../types/guards';
import type { ReadOutcome } from '../types/read';

/** 仓库索引文件名（原版 sj_kuStoreInfo.ini，位于 SheJiZhuLi 根目录） */
const INDEX_FILE = 'sj_kuStoreInfo.ini';

interface BufferLike {
  from(data: string, encoding: 'base64'): { toString(encoding: 'utf8'): string };
}

/**
 * base64 → utf8。
 * 优先 Node Buffer；非 CEP 环境兜底 atob + TextDecoder。
 */
export function decodeBase64(text: string): string {
  const mod = nodeRequire<{ Buffer: BufferLike }>('buffer');
  if (mod?.Buffer) return mod.Buffer.from(text, 'base64').toString('utf8');

  const binary = atob(text);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** 读仓库索引 */
export function readIndex(): ReadOutcome<StyleWarehouseIndex> {
  const text = readTextOutcome(INDEX_FILE, 'legacy');
  if (text.status !== 'ok') return text;

  const parsed = parseJson(text.value);
  if (parsed.status !== 'ok') return parsed;

  return decodeStyleIndex(parsed.value);
}

/** 读库文件文本：索引没登记 → missing，IO 失败 → unreadable */
function readLibraryText(
  warehouse: StyleWarehouse | undefined,
  kind: KuKind
): ReadOutcome<string> {
  const fileName = fileNameOf(warehouse, kind);
  if (!fileName) return { status: 'missing' };
  return readTextOutcome(fileName, 'legacy');
}

/**
 * 读原始组数组（含 id、未知键）。
 * 写操作和「读原始项」都基于它，避免反复解析。
 */
export function readRawGroups(
  warehouse: StyleWarehouse | undefined,
  kind: KuKind
): ReadOutcome<Record<string, unknown>[]> {
  const text = readLibraryText(warehouse, kind);
  if (text.status !== 'ok') return text;

  const parsed = parseJson(text.value);
  if (parsed.status !== 'ok') return parsed;

  return resolveKuGroups(parsed.value, decodeBase64);
}

/** 读某个仓库的某一类库（归一化后的视图模型） */
export function readLibrary(
  warehouse: StyleWarehouse | undefined,
  kind: KuKind
): ReadOutcome<KuGroup[]> {
  const text = readLibraryText(warehouse, kind);
  if (text.status !== 'ok') return text;

  return readKuGroups(kind, text.value, decodeBase64);
}

/** 读库文件原文（导出、诊断用） */
export function readKuFileText(fileName: string): ReadOutcome<string> {
  return readTextOutcome(fileName, 'legacy');
}

/**
 * 读一个分组的**原始**项列表（发送到色板用）。
 *
 * 必须从库文件原文取，不能走 `readRawGroups`——那返回的是归一化后的 `KuGroup`，
 * `items` 是视图模型，丢原始字段；色板面板要的是 jsx 认识的原始形状。
 * 库文件顶层就是分组数组（每库一个文件），`[groupIndex].list` 即原始项。
 */
export function readKuGroupItems(
  warehouse: StyleWarehouse | undefined,
  kind: KuKind,
  groupIndex: number
): ReadOutcome<Record<string, unknown>[]> {
  const text = readLibraryText(warehouse, kind);
  if (text.status !== 'ok') return text;

  const parsed = parseJson(text.value);
  if (parsed.status !== 'ok') return parsed;

  const groups = parsed.value;
  if (!Array.isArray(groups)) {
    return { status: 'corrupt', reason: '库文件顶层不是数组' };
  }

  const group = groups[groupIndex] as { list?: unknown } | undefined;
  return {
    status: 'ok',
    value: Array.isArray(group?.list) ? (group.list as Record<string, unknown>[]) : []
  };
}

/**
 * 读磁盘上的原始项。
 * 应用颜色/渐变/样式时必须发这个，不能发视图模型——jsx 内部认 isFill 等未知键。
 */
export function readKuItem(
  warehouse: StyleWarehouse | undefined,
  kind: KuKind,
  groupIndex: number,
  itemIndex: number
): ReadOutcome<Record<string, unknown>> {
  const groups = readRawGroups(warehouse, kind);
  if (groups.status !== 'ok') return groups;

  const group = groups.value[groupIndex];
  if (!group) return { status: 'corrupt', reason: `分组 ${groupIndex} 不存在` };

  const list = Array.isArray(group.list) ? group.list : [];
  const item = list[itemIndex];
  if (!isRecord(item)) return { status: 'corrupt', reason: `项 ${itemIndex} 不存在` };

  return { status: 'ok', value: item };
}

/** 读分组的 id（应用图层样式时作为 groupId 传给 jsx） */
export function readKuGroupId(
  warehouse: StyleWarehouse | undefined,
  kind: KuKind,
  groupIndex: number
): string {
  const groups = readRawGroups(warehouse, kind);
  if (groups.status !== 'ok') return '';

  const id = groups.value[groupIndex]?.id;
  return typeof id === 'string' ? id : '';
}

/* ---------------- 写 ---------------- */

/** 修改函数返回 null 表示「不需要写」 */
type Mutator<T> = (current: T) => T | null;

/**
 * 【范本】读-改-写库文件。
 *
 * 三条约束都在这里，调用方不需要重复判断：
 *   1. 读失败直接返回，**不执行 mutator**——读不到就写，等于把用户数据换成默认值
 *   2. 写入走 writeTextAtomic（备份 .bak + 串行）
 *   3. 写失败返回 unreadable，不静默成功
 */
export async function mutateRawGroups(
  warehouse: StyleWarehouse,
  kind: KuKind,
  mutator: Mutator<Record<string, unknown>[]>
): Promise<ReadOutcome<void>> {
  const current = readRawGroups(warehouse, kind);
  if (current.status !== 'ok') return current;

  const next = mutator(current.value);
  if (next === null) return { status: 'ok', value: undefined };

  const fileName = fileNameOf(warehouse, kind);
  if (!fileName) return { status: 'missing' };

  const written = await writeTextAtomic(fileName, JSON.stringify(next), 'legacy');
  if (!written) return { status: 'unreadable', reason: '写入失败' };

  return { status: 'ok', value: undefined };
}

/**
 * 【范本】读-改-写仓库索引。
 * 约束同 mutateRawGroups：读失败不写、写走原子替换。
 */
export async function mutateIndex(
  mutator: Mutator<StyleWarehouseIndex>
): Promise<ReadOutcome<StyleWarehouseIndex>> {
  const current = readIndex();
  if (current.status !== 'ok') return current;

  const next = mutator(current.value);
  if (next === null) return current;

  const written = await writeTextAtomic(INDEX_FILE, JSON.stringify(next), 'legacy');
  if (!written) return { status: 'unreadable', reason: '写入失败' };

  return { status: 'ok', value: next };
}

/* ---------------- 写：分组 ---------------- */

/** 新建分组；afterIndex 缺省时追加到末尾 */
export function addKuGroup(
  warehouse: StyleWarehouse,
  kind: KuKind,
  name: string,
  afterIndex?: number
): Promise<ReadOutcome<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    const group: Record<string, unknown> = {
      id: kuGuid(),
      name: name || '未命名分组',
      show: true,
      list: []
    };
    const at = afterIndex === undefined ? groups.length : afterIndex + 1;
    groups.splice(at, 0, group);
    return groups;
  });
}

export function renameKuGroup(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number,
  name: string
): Promise<ReadOutcome<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    const group = groups[groupIndex];
    if (!group) return null;
    group.name = name;
    return groups;
  });
}

export function deleteKuGroup(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number
): Promise<ReadOutcome<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    if (!groups[groupIndex]) return null;
    groups.splice(groupIndex, 1);
    return groups;
  });
}

/** 折叠 / 展开写回库文件 */
export function setKuGroupShow(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number,
  show: boolean
): Promise<ReadOutcome<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    const group = groups[groupIndex];
    if (!group) return null;
    group.show = show;
    return groups;
  });
}

/** 分组拖拽排序 */
export function moveKuGroupTo(
  warehouse: StyleWarehouse,
  kind: KuKind,
  from: number,
  to: number,
  position: DropPosition
): Promise<ReadOutcome<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    applyListDrop(groups, from, to, position);
    return groups;
  });
}

/* ---------------- 写：项 ---------------- */

export function renameKuItem(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number,
  itemIndex: number,
  name: string
): Promise<ReadOutcome<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    const list = groups[groupIndex]?.list;
    if (!Array.isArray(list)) return null;
    const item = list[itemIndex];
    if (!isRecord(item)) return null;
    item.name = name;
    return groups;
  });
}

export function deleteKuItem(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number,
  itemIndex: number
): Promise<ReadOutcome<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    const list = groups[groupIndex]?.list;
    if (!Array.isArray(list) || itemIndex < 0 || itemIndex >= list.length) return null;
    list.splice(itemIndex, 1);
    return groups;
  });
}

/** 往分组末尾追加一项 */
export function addKuItem(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number,
  item: Record<string, unknown>
): Promise<ReadOutcome<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    const group = groups[groupIndex];
    if (!group) return null;
    if (!Array.isArray(group.list)) group.list = [];
    (group.list as unknown[]).push(item);
    return groups;
  });
}

/** 项拖拽排序（可跨组） */
export function moveKuItemTo(
  warehouse: StyleWarehouse,
  kind: KuKind,
  move: DropMove
): Promise<ReadOutcome<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    /* applyItemDrop 改的是数组本身，所以要让每个组都持有真实数组 */
    const lists = groups.map((group) => {
      if (!Array.isArray(group.list)) group.list = [];
      return group.list as unknown[];
    });

    applyItemDrop(lists, move);
    return groups;
  });
}
