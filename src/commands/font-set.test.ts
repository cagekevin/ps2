/**
 * 快捷字体命令的「队列内判据」。
 *
 * `domain/quick-font` 测了判据本身；这里测**命令层有没有真的用队列里的最新值**：
 * 写队列执行时列表已经变了（并发删掉一项），越界就必须返回失败，不能静默 `ok`。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from '../types/result';
import type { QuickFont, QuickFontFile } from '../domain/quick-font';

const h = vi.hoisted(() => ({
  /** mutator 执行时「队列里」的快捷字体家族列表 */
  queued: [] as string[],
  written: 0
}));

vi.mock('../repo/font-set-repo', () => ({
  /* Or 入口：mutator 直接返回 Result，失败原样上抛（不再靠 null 表示不写） */
  updateQuickFonts: async (
    mutator: (file: QuickFontFile) => { status: string; value?: unknown }
  ) => {
    const list: QuickFont[] = h.queued.map((family) => ({
      family,
      name: family,
      scriptName: family,
      zz: [],
      hjm: [],
      mz: []
    }));
    const outcome = mutator({ index: 0, list });
    if (outcome.status === 'error') return outcome;
    if (outcome.value) h.written += 1;
    return ok(undefined);
  }
}));

vi.mock('../core/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

beforeEach(() => {
  h.queued = [];
  h.written = 0;
  vi.resetModules();
});

describe('quickFont 的队列内判据', () => {
  it('select：写队列里的列表比读时短 → 返回 VALIDATION，不是静默 ok', async () => {
    const { quickFont } = await import('./font-set');
    h.queued = ['A'];

    const result = await quickFont({ action: 'select', index: 3 });

    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('VALIDATION');
    expect(h.written).toBe(0);
  });

  it('delete：只剩一个 → 返回 VALIDATION（至少保留一个）', async () => {
    const { quickFont } = await import('./font-set');
    h.queued = ['A'];

    const result = await quickFont({ action: 'delete', index: 0 });

    expect(result.status).toBe('error');
    expect(h.written).toBe(0);
  });

  it('select 正常 → 写一次', async () => {
    const { quickFont } = await import('./font-set');
    h.queued = ['A', 'B'];

    const result = await quickFont({ action: 'select', index: 1 });

    expect(result.status).toBe('ok');
    expect(h.written).toBe(1);
  });
});
