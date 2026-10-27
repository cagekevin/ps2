/**
 * 【范本】拖拽落点的纯函数
 *
 * 把原版四个分支的 splice 收敛成「先删后插」的下标计算。
 * 样式库、动作、重命名、自由面板四处拖拽共用这一份，不各写一套。
 *
 * 下标越界一律抛错，不静默跳过——下标来自 DOM 数据集，
 * 取不到就是页面与数据对不上，兜底只会把错误藏起来。
 */

/** 插在目标前还是后 */
export type DropPosition = 'before' | 'after';

/** 一个落点坐标：第几组的第几项（组排序时 index 不用） */
export interface DropSlot {
  group: number;
  index: number;
}

export interface DropMove {
  from: DropSlot;
  to: DropSlot;
  position: DropPosition;
}

export function isSameSlot(from: DropSlot, to: DropSlot): boolean {
  return from.group === to.group && from.index === to.index;
}

/**
 * 落点插入下标 —— **在源元素已被删掉的数组上使用**。
 *
 * | 情况 | 插前 | 插后 |
 * |---|---|---|
 * | 跨组，或同组向后（from.index > to.index） | to.index | to.index + 1 |
 * | 同组向前（from.index < to.index） | to.index - 1 | to.index |
 *
 * 同组向前要 -1：源元素先被删掉，目标整体前移了一位。
 * 组排序走同一张表（组只有一列，永远算同组）。
 */
export function dropInsertIndex(move: DropMove): number {
  const { from, to, position } = move;
  const after = position === 'after' ? 1 : 0;
  const sameGroupForward = from.group === to.group && from.index < to.index;
  return to.index - (sameGroupForward ? 1 : 0) + after;
}

function requireIndex(value: number, length: number, what: string): void {
  if (!Number.isInteger(value) || value < 0 || value >= length) {
    throw new RangeError(`${what} ${value} 超出范围（长度 ${length}）`);
  }
}

/**
 * 一维数组上的落点（组排序）：原地改，返回落点后的下标；-1 表示原位没动。
 */
export function applyListDrop<T>(
  list: T[],
  from: number,
  to: number,
  position: DropPosition
): number {
  requireIndex(from, list.length, '源下标');
  requireIndex(to, list.length, '目标下标');
  if (from === to) return -1;

  const [item] = list.splice(from, 1);
  if (item === undefined) return -1;

  const at = dropInsertIndex({
    from: { group: 0, index: from },
    to: { group: 0, index: to },
    position
  });
  list.splice(at, 0, item);
  return at;
}

/**
 * 「组 → 项」两级结构上的落点（项拖拽，可跨组）：原地改，返回目标组里的新下标；-1 表示原位。
 *
 * `lists` 是各组的项数组本身（不是拷贝），splice 直接改到调用方手里的数组上。
 */
export function applyItemDrop(lists: unknown[][], move: DropMove): number {
  const source = lists[move.from.group];
  const target = lists[move.to.group];
  if (!source) throw new RangeError(`源分组 ${move.from.group} 不存在`);
  if (!target) throw new RangeError(`目标分组 ${move.to.group} 不存在`);

  requireIndex(move.from.index, source.length, '源下标');
  requireIndex(move.to.index, target.length, '目标下标');
  if (isSameSlot(move.from, move.to)) return -1;

  const [item] = source.splice(move.from.index, 1);
  if (item === undefined) return -1;

  const at = dropInsertIndex(move);
  target.splice(at, 0, item);
  return at;
}
