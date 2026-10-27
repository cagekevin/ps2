import { describe, expect, it } from 'vitest';
import { applyItemDrop, applyListDrop, dropInsertIndex, isSameSlot } from './reorder';

describe('dropInsertIndex', () => {
  it('同组向后插前：下标不变', () => {
    expect(
      dropInsertIndex({ from: { group: 0, index: 1 }, to: { group: 0, index: 3 }, position: 'before' })
    ).toBe(2);
  });

  it('同组向后插后：删源后目标前移，结果为 to.index', () => {
    /* [a,b,c,d] 拖 b(1) 到 d(3) 之后 → 删 b 得 [a,c,d]，d 在 2，插其后得 3 */
    expect(
      dropInsertIndex({ from: { group: 0, index: 1 }, to: { group: 0, index: 3 }, position: 'after' })
    ).toBe(3);
  });

  it('同组向前插前：-1', () => {
    expect(
      dropInsertIndex({ from: { group: 0, index: 3 }, to: { group: 0, index: 1 }, position: 'before' })
    ).toBe(1);
  });

  it('同组向前插后：下标不变', () => {
    expect(
      dropInsertIndex({ from: { group: 0, index: 3 }, to: { group: 0, index: 1 }, position: 'after' })
    ).toBe(2);
  });

  it('跨组不修正', () => {
    expect(
      dropInsertIndex({ from: { group: 0, index: 3 }, to: { group: 1, index: 1 }, position: 'before' })
    ).toBe(1);
  });
});

describe('isSameSlot', () => {
  it('组与下标都相同才算同位置', () => {
    expect(isSameSlot({ group: 0, index: 1 }, { group: 0, index: 1 })).toBe(true);
    expect(isSameSlot({ group: 0, index: 1 }, { group: 1, index: 1 })).toBe(false);
    expect(isSameSlot({ group: 0, index: 1 }, { group: 0, index: 2 })).toBe(false);
  });
});

describe('applyListDrop', () => {
  it('向后移动并插到目标之后', () => {
    const list = ['a', 'b', 'c', 'd'];
    const at = applyListDrop(list, 0, 2, 'after');
    expect(list).toEqual(['b', 'c', 'a', 'd']);
    expect(at).toBe(2);
  });

  it('向前移动并插到目标之前', () => {
    const list = ['a', 'b', 'c', 'd'];
    applyListDrop(list, 3, 1, 'before');
    expect(list).toEqual(['a', 'd', 'b', 'c']);
  });

  it('原位不动返回 -1', () => {
    const list = ['a', 'b', 'c'];
    expect(applyListDrop(list, 1, 1, 'after')).toBe(-1);
    expect(list).toEqual(['a', 'b', 'c']);
  });

  it('下标越界抛错，不静默跳过', () => {
    expect(() => applyListDrop(['a'], 0, 5, 'after')).toThrow(RangeError);
    expect(() => applyListDrop(['a'], -1, 0, 'after')).toThrow(RangeError);
  });
});

describe('applyItemDrop', () => {
  it('同组移动', () => {
    const lists = [['a', 'b', 'c'], ['x']];
    applyItemDrop(lists, {
      from: { group: 0, index: 0 },
      to: { group: 0, index: 2 },
      position: 'after'
    });
    expect(lists[0]).toEqual(['b', 'c', 'a']);
  });

  it('跨组移动', () => {
    const lists = [['a', 'b'], ['x', 'y']];
    const at = applyItemDrop(lists, {
      from: { group: 0, index: 1 },
      to: { group: 1, index: 0 },
      position: 'before'
    });
    expect(lists[0]).toEqual(['a']);
    expect(lists[1]).toEqual(['b', 'x', 'y']);
    expect(at).toBe(0);
  });

  it('同位置返回 -1', () => {
    const lists = [['a', 'b']];
    expect(
      applyItemDrop(lists, {
        from: { group: 0, index: 0 },
        to: { group: 0, index: 0 },
        position: 'after'
      })
    ).toBe(-1);
  });

  it('分组不存在抛错', () => {
    expect(() =>
      applyItemDrop([['a']], {
        from: { group: 0, index: 0 },
        to: { group: 5, index: 0 },
        position: 'before'
      })
    ).toThrow(RangeError);
  });
});
