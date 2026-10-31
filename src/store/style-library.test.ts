/**
 * `normalizeExpandedGroups` 的判据测试。
 *
 * 为什么必须有一条：`prefs.json` 是用户可改的文件，`style.expandedGroups` 里出现
 * 字符串 / `null` / 负数 / 非数组都可能。归一化只在 store 一处（页面不判），
 * 所以这条测试是「页面不需要判」的唯一凭据（同 `store/rename.test.ts` 的 `normalizeMode`）。
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../core/prefs', () => ({
  getPref: (_key: string, fallback: unknown) => fallback,
  savePref: vi.fn(async () => undefined)
}));
vi.mock('../core/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));
vi.mock('../repo/style-repo', () => ({
  readIndex: vi.fn(),
  readLibrary: vi.fn()
}));

const { normalizeExpandedGroups, useStyleLibraryStore } = await import('./style-library');
const { readIndex, readLibrary } = await import('../repo/style-repo');
const repo = { readIndex: vi.mocked(readIndex), readLibrary: vi.mocked(readLibrary) };

describe('normalizeExpandedGroups', () => {
  it('只留下标（非负整数），并按出现顺序去重', () => {
    expect(normalizeExpandedGroups([2, 0, 2, 1])).toEqual([2, 0, 1]);
  });

  it('空数组照收（全收起是合法状态，不是坏值）', () => {
    expect(normalizeExpandedGroups([])).toEqual([]);
  });

  it('混进字符串 / null / 负数 / 小数 → 逐项丢掉', () => {
    expect(normalizeExpandedGroups([0, '1', null, -3, 1.5, 2])).toEqual([0, 2]);
  });

  it('不是数组 → 默认只展开第一组', () => {
    expect(normalizeExpandedGroups(undefined)).toEqual([0]);
    expect(normalizeExpandedGroups('[]')).toEqual([0]);
    expect(normalizeExpandedGroups({ 0: 1 })).toEqual([0]);
  });
});

describe('失败臂形状（`TD-05-1`）', () => {
  it('索引读失败 → `indexFailure` 带 code/reason/detail，且不保留上一轮的库', async () => {
    const { failWithDetail } = await import('../types/result');
    repo.readIndex.mockReturnValueOnce(failWithDetail('CORRUPT', '文件无法识别', 'root'));

    await useStyleLibraryStore.getState().load();
    const state = useStyleLibraryStore.getState();

    expect(state.indexFailure?.code).toBe('CORRUPT');
    expect(state.indexFailure?.reason).toBe('文件无法识别');
    expect(state.indexFailure?.detail).toBe('root');
    expect(state.warehouses).toEqual([]);
    expect(state.libraries.color).toBeNull();
    expect(state.failures.color).toBeNull();
  });

  it('单类库读失败 → 只那一类进 `failures`，值留 null；其它类照常落地', async () => {
    const { failWithDetail, ok } = await import('../types/result');
    repo.readIndex.mockReturnValueOnce(
      ok({ index: 0, list: [{ id: 'w1', name: '默认' }] }) as never
    );
    repo.readLibrary.mockImplementation((_warehouse, kind) =>
      kind === 'color'
        ? (failWithDetail('IO_ERROR', '文件读写失败', 'path:x') as never)
        : (ok([]) as never)
    );

    await useStyleLibraryStore.getState().load();
    const state = useStyleLibraryStore.getState();

    expect(state.indexFailure).toBeNull();
    expect(state.failures.color?.code).toBe('IO_ERROR');
    expect(state.failures.color?.detail).toBe('path:x');
    /* 失败那一类**不许**留下值（否则「读失败」与「读到空」同形） */
    expect(state.libraries.color).toBeNull();
    expect(state.failures.gradient).toBeNull();
    expect(state.libraries.gradient).toEqual([]);
  });
});
