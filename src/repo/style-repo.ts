/**
 * 【范本】样式库数据访问
 * 只负责「从磁盘读到结构化数据」，不做业务判断、不碰 UI。
 * 所有失败都返回 Result（全仓唯一形状，见 types/result.ts），码区分缺文件 / 读坏 / IO。
 */

import { decodeBase64 } from '../core/cep/base64';
import { readTextResult, type StorageRoot } from '../core/storage';
import { resolveKuGroups } from '../domain/ku-format';
import { mutateJsonFile, readJsonFile, replaceJsonFile, type JsonMutator } from './json-file';
import { applyItemDrop, applyListDrop, type DropMove, type DropPosition } from '../domain/reorder';
import {
  decodeStyleIndex,
  fileNameOf,
  kuEnsureListOf,
  kuGuid,
  kuListOf,
  readKuGroups,
  type KuGroup,
  type KuKind,
  type StyleWarehouse,
  type StyleWarehouseIndex
} from '../domain/style-library';
import { isRecord } from '../types/guards';
import { parseJson } from '../types/json';
import { fail, failWithDetail, ok, type Result } from '../types/result';

/** 仓库索引文件名（原版 sj_kuStoreInfo.ini，位于 SheJiZhuLi 根目录） */
const INDEX_FILE = 'sj_kuStoreInfo.ini';

/** 样式库全部在官方数据根下（与 `font-repo` 同一个写法：根写一次，不在每个调用点重复字面量） */
const ROOT: StorageRoot = 'legacy';

/** 读仓库索引 */
export function readIndex(): Result<StyleWarehouseIndex> {
  const text = readTextResult(INDEX_FILE, ROOT);
  if (text.status === 'error') return text;

  const parsed = parseJson(text.value, '仓库索引');
  if (parsed.status === 'error') return parsed;

  return decodeStyleIndex(parsed.value);
}

/** 读库文件文本：索引没登记 → NOT_FOUND，IO 失败 → IO_ERROR */
function readLibraryText(
  warehouse: StyleWarehouse | undefined,
  kind: KuKind
): Result<string> {
  const fileName = fileNameOf(warehouse, kind);
  if (!fileName) return fail('NOT_FOUND', '索引里没有登记这个库的文件名');
  return readTextResult(fileName, ROOT);
}

/** 索引里取库文件名；没登记就是 NOT_FOUND */
function libraryFileName(
  warehouse: StyleWarehouse | undefined,
  kind: KuKind
): Result<string> {
  const fileName = fileNameOf(warehouse, kind);
  return fileName ? ok(fileName) : fail('NOT_FOUND', '索引里没有登记这个库的文件名');
}

/**
 * 读原始组数组（含 id、未知键）。
 * 写操作和「读原始项」都基于它，避免反复解析。
 */
export function readRawGroups(
  warehouse: StyleWarehouse | undefined,
  kind: KuKind
): Result<Record<string, unknown>[]> {
  const name = libraryFileName(warehouse, kind);
  if (name.status === 'error') return name;

  return readJsonFile(name.value, ROOT, '库文件', (raw) => resolveKuGroups(raw, decodeBase64));
}

/** 读某个仓库的某一类库（归一化后的视图模型） */
export function readLibrary(
  warehouse: StyleWarehouse | undefined,
  kind: KuKind
): Result<KuGroup[]> {
  const text = readLibraryText(warehouse, kind);
  if (text.status === 'error') return text;

  return readKuGroups(kind, text.value, decodeBase64);
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
): Result<Record<string, unknown>[]> {
  const text = readLibraryText(warehouse, kind);
  if (text.status === 'error') return text;

  const parsed = parseJson(text.value, '库文件');
  if (parsed.status === 'error') return parsed;

  const groups = parsed.value;
  if (!Array.isArray(groups)) {
    return fail('CORRUPT', '库文件顶层不是数组');
  }

  const group = groups[groupIndex] as { list?: unknown } | undefined;
  return ok(Array.isArray(group?.list) ? (group.list as Record<string, unknown>[]) : []);
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
): Result<Record<string, unknown>> {
  const groups = readRawGroups(warehouse, kind);
  if (groups.status === 'error') return groups;

  const group = groups.value[groupIndex];
  if (!group) return fail('CORRUPT', `分组 ${groupIndex} 不存在`);

  const item = (kuListOf(group) ?? [])[itemIndex];
  if (!isRecord(item)) return fail('CORRUPT', `项 ${itemIndex} 不存在`);

  return ok(item);
}

/** 读分组的 id（应用图层样式时作为 groupId 传给 jsx） */
export function readKuGroupId(
  warehouse: StyleWarehouse | undefined,
  kind: KuKind,
  groupIndex: number
): Result<string> {
  const groups = readRawGroups(warehouse, kind);
  if (groups.status === 'error') return groups;

  const id = groups.value[groupIndex]?.id;
  return typeof id === 'string' && id ? ok(id) : fail('CORRUPT', `分组 ${groupIndex} 缺少 id`);
}

/* ---------------- 写 ---------------- */

/** 修改函数返回 null 表示「不需要写」 */

/**
 * 【范本】读-改-写库文件。
 *
 * 三条约束由 `repo/json-file.ts` 保证，这里只做「库文件名解析 + 库格式解码」：
 *   1. 读失败直接返回，**不执行 mutator**
 *   2. 写入走 writeTextAtomic（备份 .bak + 串行）
 *   3. 写失败返回 IO_ERROR，不静默成功
 */
export async function mutateRawGroups(
  warehouse: StyleWarehouse,
  kind: KuKind,
  mutator: JsonMutator<Record<string, unknown>[]>
): Promise<Result<void>> {
  const name = libraryFileName(warehouse, kind);
  if (name.status === 'error') return name;

  return mutateJsonFile(
    name.value,
    ROOT,
    '库文件',
    (raw) => resolveKuGroups(raw, decodeBase64),
    mutator
  );
}

/* ---------------- 写：索引（唯一入口） ---------------- */

/**
 * 索引原文（`sj_kuStoreInfo.ini` 的字节内容）。
 *
 * 给云同步上传用：**必须读原文**，不能 `readIndex()` 之后 `JSON.stringify` ——
 * 那会把文件里的未知键（官方客户端的字段）洗掉，上传一次就丢一次。
 */
export function readIndexText(): Result<string> {
  return readTextResult(INDEX_FILE, ROOT);
}

/**
 * 索引整包写回（导入 / 云同步下载共用）。
 *
 * 原先这个函数写在 `repo/ku-archive.ts` 里（`writeIndexRaw`），于是索引有**两个潜在写入者**
 * 的错觉：一个模块只读、另一个模块写。索引归本文件所有，写入口也只在这里。
 * 走 `replaceJsonFile`：`.bak` + 串行 + 未知键保留（传入对象本身带全量键）。
 */
export async function writeIndexRaw(next: Record<string, unknown>): Promise<Result<void>> {
  return replaceJsonFile(INDEX_FILE, ROOT, next);
}

/* ---------------- 写：分组 ---------------- */

/** 新建分组；afterIndex 缺省时追加到末尾 */
export function addKuGroup(
  warehouse: StyleWarehouse,
  kind: KuKind,
  name: string,
  afterIndex?: number
): Promise<Result<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    const group: Record<string, unknown> = {
      id: kuGuid(),
      name: name || '未命名分组',
      show: true,
      list: []
    };
    const at = afterIndex === undefined ? groups.length : afterIndex + 1;
    groups.splice(at, 0, group);
    return ok(groups);
  });
}

/** 新建分组并一次写入全部项（拖图提取的「保存到分组」用，避免 N 次「读改写」） */
export function addKuGroupWithItems(
  warehouse: StyleWarehouse,
  kind: KuKind,
  name: string,
  items: Record<string, unknown>[]
): Promise<Result<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    const group: Record<string, unknown> = {
      id: kuGuid(),
      name: name || '未命名分组',
      show: true,
      list: items
    };
    groups.push(group);
    return ok(groups);
  });
}

export function renameKuGroup(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number,
  name: string
): Promise<Result<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    const group = groups[groupIndex];
    if (!group) return fail('VALIDATION', '目标分组已不存在（可能已被删除）');
    group.name = name;
    return ok(groups);
  });
}

export function deleteKuGroup(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number
): Promise<Result<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    if (!groups[groupIndex]) return fail('VALIDATION', '目标分组已不存在（可能已被删除）');
    groups.splice(groupIndex, 1);
    return ok(groups);
  });
}

/** 折叠 / 展开写回库文件 */
export function setKuGroupShow(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number,
  show: boolean
): Promise<Result<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    const group = groups[groupIndex];
    if (!group) return fail('VALIDATION', '目标分组已不存在（可能已被删除）');
    group.show = show;
    return ok(groups);
  });
}

/** 分组拖拽排序 */
export function moveKuGroupTo(
  warehouse: StyleWarehouse,
  kind: KuKind,
  from: number,
  to: number,
  position: DropPosition
): Promise<Result<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    applyListDrop(groups, from, to, position);
    return ok(groups);
  });
}

/* ---------------- 写：项 ---------------- */

export function renameKuItem(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number,
  itemIndex: number,
  name: string
): Promise<Result<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    const list = kuListOf(groups[groupIndex]);
    if (!list) return fail('VALIDATION', '目标分组的项列表已不存在');
    const item = list[itemIndex];
    if (!isRecord(item)) return failWithDetail('CORRUPT', '目标项不是对象', `index:${itemIndex}`);
    item.name = name;
    return ok(groups);
  });
}

export function deleteKuItem(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number,
  itemIndex: number
): Promise<Result<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    const list = kuListOf(groups[groupIndex]);
    if (!list || itemIndex < 0 || itemIndex >= list.length) {
      return fail('VALIDATION', '目标项已不存在（可能已被删除）');
    }
    list.splice(itemIndex, 1);
    return ok(groups);
  });
}

/** 往分组末尾追加一项 */
export function addKuItem(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number,
  item: Record<string, unknown>
): Promise<Result<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    const group = groups[groupIndex];
    if (!group) return fail('VALIDATION', '目标分组已不存在（可能已被删除）');
    kuEnsureListOf(group).push(item);
    return ok(groups);
  });
}

/** 项拖拽排序（可跨组） */
export function moveKuItemTo(
  warehouse: StyleWarehouse,
  kind: KuKind,
  move: DropMove
): Promise<Result<void>> {
  return mutateRawGroups(warehouse, kind, (groups) => {
    /* applyItemDrop 改的是数组本身，所以要让每个组都持有真实数组 */
    applyItemDrop(groups.map(kuEnsureListOf), move);
    return ok(groups);
  });
}
