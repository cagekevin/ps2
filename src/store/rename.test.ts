/**
 * `normalizeMode` 的判据测试。
 *
 * 为什么必须有一条：`prefs.json` 是**用户可改的文件**，`rename.mode` 里出现任何值都可能。
 * 归一化只在 `store/rename` 一处，页面不判 —— 所以这条测试是「页面不需要判」的唯一凭据。
 *
 * 三个 mock：store 模块在 import 期就会读 prefs（拿到就建初值）、读 repo（不读，但要能加载）。
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../core/prefs', () => ({
  getPref: (_key: string, fallback: unknown) => fallback,
  savePref: vi.fn(async () => undefined)
}));
vi.mock('../core/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));
vi.mock('../repo/rename-repo', () => ({
  readPreset: vi.fn(),
  updatePreset: vi.fn(),
  replacePreset: vi.fn(),
  readArchive: vi.fn(),
  writeArchive: vi.fn()
}));

const { normalizeColorSign, normalizeMode } = await import('./rename');

describe('normalizeMode', () => {
  it('只认两个字面量', () => {
    expect(normalizeMode('default')).toBe('default');
    expect(normalizeMode('replace')).toBe('replace');
  });

  it('坏值一律归默认（含旧版数字、大小写、空串、null）', () => {
    expect(normalizeMode(1)).toBe('default');
    expect(normalizeMode(0)).toBe('default');
    expect(normalizeMode('Replace')).toBe('default');
    expect(normalizeMode('')).toBe('default');
    expect(normalizeMode(null)).toBe('default');
    expect(normalizeMode(undefined)).toBe('default');
    expect(normalizeMode({ mode: 'replace' })).toBe('default');
  });
});

describe('normalizeColorSign', () => {
  it('缺省与坏值都展开（收起时那一行看不出是功能区，等于这个功能不存在）', () => {
    expect(normalizeColorSign(undefined)).toBe(true);
    expect(normalizeColorSign(null)).toBe(true);
    expect(normalizeColorSign('yes')).toBe(true);
    expect(normalizeColorSign(1)).toBe(true);
  });

  it('只有明确的 false 才收起', () => {
    expect(normalizeColorSign(false)).toBe(false);
    expect(normalizeColorSign(true)).toBe(true);
  });
});
