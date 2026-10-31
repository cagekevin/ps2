/**
 * 字体切片的读失败姿态。
 *
 * 判据（`CONVENTIONS` §3.1.4）：同一数据源刷新失败 → **保留旧值 + 存失败臂 + 记日志**。
 * 读失败把列表清空且不写日志时，用户看到的是「标签没了」，排障看到的是空白。
 *
 * 只测这条规则，不测 zustand 本身。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '../types/result';

const readFontTags = vi.fn();
const readFontStars = vi.fn();
const readClassification = vi.fn();
const warn = vi.fn();

vi.mock('../repo/font-repo', () => ({
  readFontTags: () => readFontTags(),
  readFontStars: () => readFontStars(),
  readClassification: () => readClassification()
}));
vi.mock('../core/prefs', () => ({
  getPref: (_key: string, fallback: unknown) => fallback,
  setPref: vi.fn()
}));
vi.mock('../core/logger', () => ({
  log: { info: vi.fn(), warn: (...args: unknown[]) => warn(...args), error: vi.fn() }
}));

async function loadStore() {
  vi.resetModules();
  return import('./font');
}

beforeEach(() => {
  readFontTags.mockReset();
  readFontStars.mockReset();
  readClassification.mockReset();
  warn.mockReset();
});

describe('坏项记账与失败臂分家（`TD-05-2`）', () => {
  it('读到带坏项的标签 → 值与 dropped 同时落地，失败臂为 null', async () => {
    const { useFontStore } = await loadStore();
    const bad = { path: 'tags[1]', code: 'CORRUPT' as const, reason: '文件无法识别', detail: 'tags[1]' };

    readFontTags.mockReturnValue(ok({ tags: [{ text: '粗', arr: ['思源黑体'], xz: false }], dropped: [bad] }));
    useFontStore.getState().loadTags();

    const state = useFontStore.getState();
    expect(state.tags).toHaveLength(1);
    expect(state.dropped.tags).toEqual([bad]);
    expect(state.failures.tags).toBeNull();
  });

  it('读失败不覆盖 dropped（坏项记账只属于成功那一次读）', async () => {
    const { useFontStore } = await loadStore();
    const bad = { path: 'tags[0]', code: 'CORRUPT' as const, reason: '文件无法识别', detail: 'tags[0]' };

    readFontTags.mockReturnValue(ok({ tags: [], dropped: [bad] }));
    useFontStore.getState().loadTags();

    readFontTags.mockReturnValue(fail('IO_ERROR', '读失败'));
    useFontStore.getState().loadTags();

    const state = useFontStore.getState();
    expect(state.failures.tags?.code).toBe('IO_ERROR');
    expect(state.dropped.tags).toEqual([bad]);
  });
});

describe('读失败保留旧值', () => {
  it('标签：第二次读失败 → 上一次的标签还在，只标 tagsRead', async () => {
    const { useFontStore } = await loadStore();

    readFontTags.mockReturnValue(ok({ tags: [{ text: '粗', arr: ['思源黑体'], xz: false }], dropped: [] }));
    useFontStore.getState().loadTags();

    readFontTags.mockReturnValue(fail('IO_ERROR', '读失败'));
    useFontStore.getState().loadTags();

    const state = useFontStore.getState();
    expect(state.tags).toHaveLength(1);
    expect(state.failures.tags?.code).toBe('IO_ERROR');
    expect(warn).toHaveBeenCalled();
  });

  it('星级：第二次读失败 → 上一次的星级还在', async () => {
    const { useFontStore } = await loadStore();

    readFontStars.mockReturnValue(ok({ stars: { 思源黑体: 3 }, dropped: [] }));
    useFontStore.getState().loadStars();

    readFontStars.mockReturnValue(fail('CORRUPT', '坏文件'));
    useFontStore.getState().loadStars();

    const state = useFontStore.getState();
    expect(state.stars).toEqual({ 思源黑体: 3 });
    expect(state.failures.stars?.code).toBe('CORRUPT');
  });

  it('成功一次后状态归零失败标记', async () => {
    const { useFontStore } = await loadStore();

    readFontTags.mockReturnValue(fail('IO_ERROR', '读失败'));
    useFontStore.getState().loadTags();
    readFontTags.mockReturnValue(ok({ tags: [], dropped: [] }));
    useFontStore.getState().loadTags();

    expect(useFontStore.getState().failures.tags).toBeNull();
  });
});
