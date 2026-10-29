/**
 * 【范本】动作库：形状 + 解码 + 纯编辑（零 IO）
 *
 * 一个库两个文件，形状别混（`05` §1.3）：
 *   - 索引 `sj_dzStoreInfo.json`：`{ index: number, list: [{ name, fileName }] }`
 *   - 仓库文件（名字由索引给）：根是**裸数组** `[{ groupName, show, list: [{ group, name, alias? }] }]`
 *
 * 坏项策略与常用库一致（`05` §2.4）：**结构 reject、项 filter**
 *   - 顶层不是数组 / 组不是对象 / `list` 不是数组 → `CORRUPT`（文件不是我认识的文件）
 *   - 动作项缺 `group` 或 `name` → 跳过 + 记 `dropped`，写回时读原始记录，坏项原样留在文件里
 *
 * 编辑函数全部**返回新数组、不改入参**；下标越界一律 `VALIDATION`（不当静默 no-op）。
 */

import { decodeList, type Dropped } from '../types/decode-list';
import { isRecord } from '../types/guards';
import { failWithDetail, ok, type Result } from '../types/result';
import { MSG } from '../types/messages';
import type { DropPosition } from './reorder';

/* ---------------- 形状（7 个里属于本文件的 4 个） ---------------- */

/** 一条动作：`group` 是 PS 动作组名，执行时必须带 */
export interface ActionItem {
  group: string;
  name: string;
  alias?: string;
}

/** 一个分组 */
export interface ActionGroup {
  groupName: string;
  show: boolean;
  list: ActionItem[];
}

/** 仓库（索引里的一项） */
export interface WarehouseEntry {
  name: string;
  fileName: string;
}

/** 索引文件（根是对象） */
export interface WarehouseIndex {
  index: number;
  list: WarehouseEntry[];
}

/** 仓库文件（根是裸数组） */
export type ActionLibraryFile = ActionGroup[];

export const DEFAULT_WAREHOUSE = '默认仓库';
export const DEFAULT_GROUP = '默认分组';

/** 索引缺文件时的默认值（不写盘；官方 `:298259` 同款） */
export function defaultIndex(fileName: string): WarehouseIndex {
  return { index: 0, list: [{ name: DEFAULT_WAREHOUSE, fileName }] };
}

/** 仓库文件缺文件时的默认值（不写盘；官方 `:1813661` 同款） */
export function defaultLibrary(): ActionLibraryFile {
  return [{ groupName: DEFAULT_GROUP, show: true, list: [] }];
}

/**
 * 新建仓库文件名：`sj_dz` + 唯一串 + `.json`（官方 `:299511` 同款前缀）。
 *
 * `taken` 传当前索引里的全部文件名，冲突就重生成——**不覆盖已有仓库文件**。
 */
export function newWarehouseFileName(taken: readonly string[]): string {
  const used = new Set(taken);
  for (;;) {
    const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const name = `sj_dz${stamp}.json`;
    if (!used.has(name)) return name;
  }
}

/* ---------------- 解码 ---------------- */

/** 仓库索引项：`name` / `fileName` 都必须是非空字符串，否则无法定位文件 */
function decodeEntry(value: unknown, path: string): Result<WarehouseEntry> {
  if (!isRecord(value)) return failWithDetail('CORRUPT', MSG.corrupt, path);
  const { name, fileName } = value;
  if (typeof name !== 'string' || !name) return failWithDetail('CORRUPT', MSG.corrupt, `${path}.name`);
  if (typeof fileName !== 'string' || !fileName) {
    return failWithDetail('CORRUPT', MSG.corrupt, `${path}.fileName`);
  }
  return ok({ name, fileName });
}

/**
 * 索引解码。
 *
 * `index` 越界（用户手改过、或删仓库时崩过）**不算失败**：本次按 0 展示，
 * 由调用方 `log.warn` 并等下一次真正的写操作再落盘（`05` §3.7 第 2 条：读操作不许改用户文件）。
 * 仓库项坏 → 跳过并记 `dropped`；全坏/空 → 回落默认仓库（否则整页没有可读文件）。
 */
export function decodeIndex(raw: unknown): Result<{ index: WarehouseIndex; dropped: Dropped[] }> {
  if (!isRecord(raw)) return failWithDetail('CORRUPT', MSG.corrupt, 'root');

  const listed = decodeList(raw.list, decodeEntry, 'filter', 'root.list');
  if (listed.status === 'error') return listed;

  const entries = listed.value.items;
  const index = entries.length ? entries : [{ name: DEFAULT_WAREHOUSE, fileName: '' }];
  /* fileName 为空说明走了「全坏」分支，调用方读不到文件 —— 那时按默认值处理，不在这里造文件名 */
  const safeIndex = typeof raw.index === 'number' && Number.isInteger(raw.index) ? raw.index : 0;

  return ok({
    index: {
      index: safeIndex >= 0 && safeIndex < index.length ? safeIndex : 0,
      list: index
    },
    dropped: listed.value.dropped
  });
}

/** 一条动作：缺 `group` 或 `name` 就是坏项（官方 `checkError` 会直接 splice，我们不删只跳过） */
function decodeItem(value: unknown, path: string): Result<ActionItem> {
  if (!isRecord(value)) return failWithDetail('CORRUPT', MSG.corrupt, path);
  const { group, name, alias } = value;
  if (typeof group !== 'string' || !group) {
    return failWithDetail('CORRUPT', MSG.corrupt, `${path}.group`);
  }
  if (typeof name !== 'string' || !name) {
    return failWithDetail('CORRUPT', MSG.corrupt, `${path}.name`);
  }
  /* 空串别名 = 无别名（官方会显示空标签，属 bug，`05` §4.2 已定案） */
  return ok(typeof alias === 'string' && alias ? { group, name, alias } : { group, name });
}

/**
 * 仓库文件解码。
 *
 * 组用 `reject`（不是数组 / 不是对象 / `list` 不是数组 = 文件结构不对），
 * 组内动作用 `filter`（缺 `group`/`name` 只跳过那一项）。
 * `dropped` 通过闭包收集——`decodeList` 逐项串行调用，顺序稳定。
 */
export function decodeLibrary(raw: unknown): Result<{ groups: ActionLibraryFile; dropped: Dropped[] }> {
  const dropped: Dropped[] = [];

  const decoded = decodeList<ActionGroup>(
    raw,
    (value, path) => {
      if (!isRecord(value)) return failWithDetail('CORRUPT', MSG.corrupt, path);
      if (typeof value.groupName !== 'string' || !value.groupName) {
        return failWithDetail('CORRUPT', MSG.corrupt, `${path}.groupName`);
      }

      const items = decodeList(value.list, decodeItem, 'filter', `${path}.list`);
      if (items.status === 'error') return items;
      dropped.push(...items.value.dropped);

      return ok({
        groupName: value.groupName,
        /* 缺 show 按展开处理：官方默认 true，缺键不该被读成「用户收起了」 */
        show: value.show !== false,
        list: items.value.items
      });
    },
    'reject',
    'root'
  );

  if (decoded.status === 'error') return decoded;
  return ok({ groups: decoded.value.items, dropped });
}

/* ---------------- PS 动作列表 → 动作项（唯一映射点） ---------------- */

/**
 * `dz_getActionList` 的返回 → 我们的动作项。
 *
 * 两种常见包装都认（Vue 版同样兜两种，`ps/src/domain/action.ts:40`）：
 *   `[{ name: <组名>, children: [{ name }] }]` 或 `{ info: [...] }`
 * 其余形状 → `CORRUPT` + `detail` 带收到的类型，**不谎报「没有动作」**。
 */
export function mapPsActions(raw: unknown): Result<ActionItem[]> {
  const groups = Array.isArray(raw) ? raw : isRecord(raw) && Array.isArray(raw.info) ? raw.info : null;
  if (!groups) {
    return failWithDetail('CORRUPT', MSG.corrupt, `shape:${typeof raw}`);
  }

  const out: ActionItem[] = [];
  for (const group of groups) {
    if (!isRecord(group) || typeof group.name !== 'string') continue;
    const children = Array.isArray(group.children) ? group.children : [];
    for (const child of children) {
      if (!isRecord(child) || typeof child.name !== 'string' || !child.name) continue;
      out.push({ group: group.name, name: child.name });
    }
  }
  return ok(out);
}

/* ---------------- 纯编辑（返回新数组） ---------------- */

function groupAt(file: ActionLibraryFile, index: number): Result<ActionGroup> {
  const group = file[index];
  if (!group) return failWithDetail('VALIDATION', MSG.stale, `group:${index}`);
  return ok(group);
}

/** 新增分组：`afterIndex` 落在其后，缺省追加到末尾（官方 `:1815876`） */
export function withGroupAdded(
  file: ActionLibraryFile,
  name: string,
  afterIndex?: number
): ActionLibraryFile {
  const next = [...file];
  const group: ActionGroup = { groupName: name, show: true, list: [] };
  const at = afterIndex === undefined ? next.length : afterIndex + 1;
  next.splice(Math.min(Math.max(at, 0), next.length), 0, group);
  return next;
}

/** 改名：**不查重**（官方也不查，`05` §4.8 第 1 条，别顺手加校验） */
export function withGroupRenamed(
  file: ActionLibraryFile,
  index: number,
  name: string
): Result<ActionLibraryFile> {
  const found = groupAt(file, index);
  if (found.status === 'error') return found;
  return ok(file.map((group, at) => (at === index ? { ...group, groupName: name } : group)));
}

/**
 * 删分组：删到空自动补一个「默认分组」。
 *
 * 官方拼的是 `this.text + "默认分组"`，而 `text` 从未赋值 ⇒ 真机会出现 `undefined默认分组`
 * （`05` §0.4 第 3 条）。我们补干净的名字，登记为偏离 A-2。
 */
export function withGroupRemoved(
  file: ActionLibraryFile,
  index: number
): Result<ActionLibraryFile> {
  const found = groupAt(file, index);
  if (found.status === 'error') return found;

  const next = file.filter((_, at) => at !== index);
  return ok(next.length ? next : defaultLibrary());
}

/** 折叠状态写的是仓库文件里的 `show` 字段（**不是**我们自己的偏好文件） */
export function withGroupToggled(
  file: ActionLibraryFile,
  index: number,
  show: boolean
): Result<ActionLibraryFile> {
  const found = groupAt(file, index);
  if (found.status === 'error') return found;
  return ok(file.map((group, at) => (at === index ? { ...group, show } : group)));
}

/** 设别名：空串 = 删别名（`05` §3.10 F1），不写空 `alias` 字段 */
export function withItemAlias(
  file: ActionLibraryFile,
  groupIndex: number,
  itemIndex: number,
  alias: string
): Result<ActionLibraryFile> {
  return patchItem(file, groupIndex, itemIndex, (item) => {
    const text = alias.trim();
    return text ? { ...item, alias: text } : { group: item.group, name: item.name };
  });
}

/** 删别名：重建项，只留 `group` / `name`（官方 `splice(i,1,{group,name})` 同款） */
export function withItemAliasRemoved(
  file: ActionLibraryFile,
  groupIndex: number,
  itemIndex: number
): Result<ActionLibraryFile> {
  return patchItem(file, groupIndex, itemIndex, (item) => ({ group: item.group, name: item.name }));
}

/** 追加动作：**不去重**（官方直接 push，`05` §4.8 第 2 条） */
export function withItemAdded(
  file: ActionLibraryFile,
  groupIndex: number,
  items: ActionItem[]
): Result<ActionLibraryFile> {
  const found = groupAt(file, groupIndex);
  if (found.status === 'error') return found;
  return ok(
    file.map((group, at) => (at === groupIndex ? { ...group, list: [...group.list, ...items] } : group))
  );
}

/** 删动作 */
export function withItemRemoved(
  file: ActionLibraryFile,
  groupIndex: number,
  itemIndex: number
): Result<ActionLibraryFile> {
  const found = groupAt(file, groupIndex);
  if (found.status === 'error') return found;
  if (!found.value.list[itemIndex]) return failWithDetail('VALIDATION', MSG.stale, `item:${itemIndex}`);

  return ok(
    file.map((group, at) =>
      at === groupIndex ? { ...group, list: group.list.filter((_, i) => i !== itemIndex) } : group
    )
  );
}

/** 分组排序：落点算法与常用页共用 `applyListDrop` 的调用方（这里只搬数组） */
export function withGroupsMoved(
  file: ActionLibraryFile,
  from: number,
  to: number,
  position: DropPosition
): Result<ActionLibraryFile> {
  const moved = moveWithin(file, from, to, position);
  return moved;
}

/**
 * 动作排序：组内与跨组**同一个函数**（组内就是 `fromGroup === toGroup`）。
 * 跨组时先从源组取出，再插到目标组——两次都走同一套下标校验。
 */
export function withItemsMoved(
  file: ActionLibraryFile,
  fromGroup: number,
  fromIndex: number,
  toGroup: number,
  toIndex: number,
  position: DropPosition
): Result<ActionLibraryFile> {
  const source = groupAt(file, fromGroup);
  if (source.status === 'error') return source;
  const target = groupAt(file, toGroup);
  if (target.status === 'error') return target;

  const item = source.value.list[fromIndex];
  if (!item) return failWithDetail('VALIDATION', MSG.stale, `from:${fromGroup}.${fromIndex}`);
  if (toIndex < 0 || toIndex > target.value.list.length) return failWithDetail('VALIDATION', MSG.stale, `to:${toIndex}`);

  if (fromGroup === toGroup) {
    const moved = moveWithin(source.value.list, fromIndex, toIndex, position);
    if (moved.status === 'error') return moved;
    return ok(file.map((group, at) => (at === fromGroup ? { ...group, list: moved.value } : group)));
  }

  return ok(
    file.map((group, at) => {
      if (at === fromGroup) return { ...group, list: group.list.filter((_, i) => i !== fromIndex) };
      if (at === toGroup) {
        const list = [...group.list];
        const at2 = position === 'after' ? toIndex + 1 : toIndex;
        list.splice(at2, 0, item);
        return { ...group, list };
      }
      return group;
    })
  );
}

/* ---------------- 内部 ---------------- */

/** 改一项：库里只留一条「取出 → 校验 → 放回」的路径，别每个编辑函数各写一遍 */
function patchItem(
  file: ActionLibraryFile,
  groupIndex: number,
  itemIndex: number,
  patch: (item: ActionItem) => ActionItem
): Result<ActionLibraryFile> {
  const found = groupAt(file, groupIndex);
  if (found.status === 'error') return found;
  const item = found.value.list[itemIndex];
  if (!item) return failWithDetail('VALIDATION', MSG.stale, `item:${itemIndex}`);

  return ok(
    file.map((group, at) =>
      at === groupIndex
        ? { ...group, list: group.list.map((one, i) => (i === itemIndex ? patch(one) : one)) }
        : group
    )
  );
}

/**
 * 数组内移动：`after` 的落点语义是「插到目标项之后」。
 *
 * 与 `domain/reorder.applyListDrop` 的关系：那个函数处理的是**拖拽落点换算**（含左右半区判定），
 * 这里只需要「按下标搬」——两件事，不合并。
 */
function moveWithin<T>(list: T[], from: number, to: number, position: DropPosition): Result<T[]> {
  if (from < 0 || from >= list.length) return failWithDetail('VALIDATION', MSG.stale, `from:${from}`);
  if (to < 0 || to >= list.length) return failWithDetail('VALIDATION', MSG.stale, `to:${to}`);

  const next = [...list];
  const [moved] = next.splice(from, 1);
  const at = position === 'after' ? to + (from < to ? 0 : 1) : to + (from < to ? -1 : 0);
  next.splice(Math.min(Math.max(at, 0), next.length), 0, moved as T);
  return ok(next);
}
