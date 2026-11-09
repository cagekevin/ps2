/**
 * token 编码的边界（`domain/dlss-token.ts`）。
 *
 * **不做「编码 → 解码」往返**：往返测试有个陷阱 —— 编解码两边一起写错时测试照样绿
 * （自己跟自己一致），而 token 是写进用户 PSD 的，错了是永久的。所以这里断言**精确字符串**，
 * 精确串的契约摘要见 `docs/plan/23` §3.2。
 */
import { describe, expect, it } from 'vitest';
import { DLSS_BUILTIN, dlssResultName, dlssTokenBody } from './dlss-token';
import type { DlssParams } from '../types/dlss';

const STANDARD: DlssParams = { ...DLSS_BUILTIN.standard, sc: 2 };
const WITH_WIDTH: DlssParams = { ...DLSS_BUILTIN.standard, w: 1024 };

describe('dlssTokenBody', () => {
  it('键序 = PKEYS，sc 在最前', () => {
    expect(dlssTokenBody(STANDARD)).toBe('sc2 i1.5 d1 c1 ls1 lt1 sk-1 st0 srdefault am0 ui0');
  });

  it('宽度档写 w、不写 sc', () => {
    expect(dlssTokenBody(WITH_WIDTH)).toBe('w1024 i1.5 d1 c1 ls1 lt1 sk-1 st0 srdefault am0 ui0');
  });

  it('去尾零：1.50 → 1.5，2.00 → 2', () => {
    expect(dlssTokenBody({ ...STANDARD, i: 1.5, d: 2 })).toContain('i1.5 d2 ');
  });

  it('-0 写成 0（不让同一组参数出现两种串）', () => {
    expect(dlssTokenBody({ ...STANDARD, sk: -0 })).toContain('sk0 ');
  });

  it('非有限值落 0，不写 NaN', () => {
    expect(dlssTokenBody({ ...STANDARD, i: Number.NaN })).toContain('i0 ');
  });

  it('st 取整（旧调用方可能传 1.9）', () => {
    expect(dlssTokenBody({ ...STANDARD, st: 1 })).toContain('st1 ');
  });

  it('sr=default 照写 srdefault（原插件行为，不是省略）', () => {
    expect(dlssTokenBody({ ...STANDARD, sr: 'M' })).toContain('srM ');
  });

  it('am / ui 是 0/1 而不是布尔', () => {
    expect(dlssTokenBody({ ...STANDARD, am: 1, ui: 1 })).toContain('am1 ui1');
  });
});

describe('dlssResultName', () => {
  it('倍率档：<名> · DLSS NR 2x [NR5 …]', () => {
    expect(dlssResultName('图层 A', STANDARD)).toBe(
      '图层 A · DLSS NR 2x [NR5 sc2 i1.5 d1 c1 ls1 lt1 sk-1 st0 srdefault am0 ui0]'
    );
  });

  it('宽度档写 px', () => {
    expect(dlssResultName('图层 A', WITH_WIDTH)).toContain('· DLSS NR 1024px [NR5 w1024 ');
  });

  it('对结果层再跑一次不叠加后缀', () => {
    const first = dlssResultName('图层 A', STANDARD);
    expect(dlssResultName(first, STANDARD)).toBe(first);
  });

  it('名字被清空时兜底 Layer', () => {
    expect(dlssResultName('  ', STANDARD).startsWith('Layer · DLSS NR 2x')).toBe(true);
  });
});
