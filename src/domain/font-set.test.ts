import { describe, expect, it } from 'vitest';
import {
  bumpCounter,
  dayKey,
  FONT_SET_DEFAULTS,
  mergeFontSetSettings,
  normalizeFontSetSettings,
  validateLevels,
  type TranslateCounter
} from './font-set';

describe('font-set', () => {
  it('默认值：空对象读出来等于 FONT_SET_DEFAULTS', () => {
    expect(normalizeFontSetSettings({})).toEqual(FONT_SET_DEFAULTS);
  });

  it('写盘只改传入的键，未知键原样保留', () => {
    const raw = { foo: 'bar', ztShowQuick: false, other: { nested: 1 } };
    const merged = mergeFontSetSettings(raw, { ztShowQuick: true });

    expect(merged.foo).toBe('bar');
    expect(merged.other).toEqual({ nested: 1 });
    expect(merged.ztShowQuick).toBe(true);
    /* 没传的 zt* 不该被顺手写成默认值 */
    expect('ztPreview' in merged).toBe(false);
  });

  it('写盘校验：6 级不合法时保持原值，不写坏值也不写默认值', () => {
    const merged = mergeFontSetSettings({ ztHierarych: [92, 48, 36, 24, 15, 12] }, {
      ztHierarych: [1, 2]
    });
    expect(merged.ztHierarych).toEqual([92, 48, 36, 24, 15, 12]);
  });

  it('6 级校验：多一级少一级非正数都拒绝', () => {
    expect(validateLevels([92, 48, 36, 24, 15, 12])).toEqual({
      status: 'ok',
      value: [92, 48, 36, 24, 15, 12]
    });
    expect(validateLevels([1, 2, 3]).status).toBe('error');
    expect(validateLevels([1, 2, 3, 4, 5, 0]).status).toBe('error');
  });

  it('坏形状：坏字段回落默认值，其余字段照常读出', () => {
    const settings = normalizeFontSetSettings({
      ztHierarych: 'not-array',
      ztPasteFont: null,
      ztCreateButton: { type: 5, isLine: 'yes', padding: '' },
      ztTranslate: { from: 'zh' },
      ztPreview: 38
    });

    expect(settings.ztHierarych).toEqual(FONT_SET_DEFAULTS.ztHierarych);
    expect(settings.ztPasteFont).toEqual(FONT_SET_DEFAULTS.ztPasteFont);
    expect(settings.ztCreateButton).toEqual(FONT_SET_DEFAULTS.ztCreateButton);
    expect(settings.ztTranslate).toEqual({ from: 'zh', to: 'auto', delete: true });
    expect(settings.ztPreview).toBe(38);
  });

  it('计数器：跨天重置成 1，同一天 +1，max 缺失按 380 兜', () => {
    const yesterday: TranslateCounter = { num: 12, max: 0, time: '20202610' };
    expect(bumpCounter(yesterday, dayKey(new Date(2026, 9, 27)))).toEqual({
      num: 1,
      max: 380,
      time: '27202610'
    });

    expect(bumpCounter({ num: 12, max: 380, time: '27202610' }, '27202610')).toEqual({
      num: 13,
      max: 380,
      time: '27202610'
    });
  });
});
