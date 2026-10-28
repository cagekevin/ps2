/**
 * `commands/common-use.patchItem` 的失败可见性。
 *
 * 判据（`ADR-0001` 一诚实）：**读时判过、写时也要判** —— 两次读之间该项可能已被删除；
 * mutator 找不到就不能当成功，否则页面以为改了、磁盘上什么都没有。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from '../types/result';

const h = vi.hoisted(() => ({
  /** mutator 执行时传给它的「队列里的最新记录」 */
  queuedItems: [] as { id?: string; isShow?: boolean }[],
  loaded: 0
}));

vi.mock('../repo/common-use-repo', () => ({
  readCommonUseFile: () =>
    ok({
      items: [{ id: 'keep' }, { id: 'gone' }],
      records: [{ id: 'keep' }, { id: 'gone' }],
      dropped: []
    }),
  /* 现在是 Or 入口：mutator 直接返回 Result，不再「返回 null 由外面捞」 */
  updateCommonUseFile: async (
    mutator: (items: { id?: string }[]) => { status: string; value?: unknown }
  ) => {
    h.queuedItems = [{ id: 'keep' }];
    const outcome = mutator(h.queuedItems);
    if (outcome.status === 'error') return outcome;
    return ok(undefined);
  }
}));

vi.mock('../store/common-use', () => ({
  useCommonUseStore: {
    getState: () => ({
      load: () => {
        h.loaded += 1;
      }
    })
  }
}));

vi.mock('../core/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

beforeEach(() => {
  h.queuedItems = [];
  h.loaded = 0;
  vi.resetModules();
});

describe('patchItem 的读写两次判', () => {
  it('读时还在、写时已被删 → 返回 VALIDATION，不是 ok', async () => {
    const { setShow } = await import('./common-use');

    const result = await setShow('gone', true);

    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('VALIDATION');
  });

  it('写时还在 → 成功', async () => {
    const { setShow } = await import('./common-use');

    const result = await setShow('keep', true);

    expect(result.status).toBe('ok');
  });
});

describe('reorder 的队列内判据', () => {
  it('下标越界 → VALIDATION（判在队列里，用的是最新长度）', async () => {
    const { reorder } = await import('./common-use');

    const result = await reorder(5, 0, 'before');

    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('VALIDATION');
  });
});
