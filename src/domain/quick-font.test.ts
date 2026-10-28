import { describe, expect, it } from 'vitest';
import type { FontItem } from './font-item';
import {
  canAddQuickFont,
  decodeQuickFontFile,
  deleteQuickFont,
  QUICK_FONT_LIMIT,
  selectQuickFont,
  toQuickFont,
  type QuickFont,
  type QuickFontFile
} from './quick-font';

function font(overrides: Partial<FontItem> = {}): FontItem {
  return {
    family: 'MiSans',
    weights: ['Bold', 'Regular', 'Light'],
    names: ['MiSans Bold', 'MiSans', 'MiSans Light'],
    postScriptNames: ['MiSans-Bold', 'MiSans-Regular', 'MiSans-Light'],
    ...overrides
  };
}

function quick(family: string): QuickFont {
  return { family, name: family, scriptName: `${family}-Regular`, zz: ['Regular'], hjm: ['x'], mz: [family] };
}

describe('quick-font', () => {
  it('转换：三个数组按字重顺序重排且保持同索引对齐', () => {
    const result = toQuickFont(font());
    expect(result.zz).toEqual(['Light', 'Regular', 'Bold']);
    expect(result.hjm).toEqual(['MiSans-Light', 'MiSans-Regular', 'MiSans-Bold']);
    expect(result.mz).toEqual(['MiSans Light', 'MiSans', 'MiSans Bold']);
    expect(result.name).toBe('MiSans Light');
    expect(result.scriptName).toBe('MiSans-Light');
  });

  it('上限 15：满了就不再收', () => {
    const list = Array.from({ length: QUICK_FONT_LIMIT }, (_, index) => quick(`F${index}`));
    const result = canAddQuickFont(list, 'NewComer');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('VALIDATION');
      expect(result.reason).toContain(String(QUICK_FONT_LIMIT));
    }
  });

  it('同家族去重：已有就拒绝', () => {
    const result = canAddQuickFont([quick('MiSans')], 'MiSans');
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.reason).toContain('MiSans');
  });

  it('索引越界：读文件时夹到合法范围，不返回越界索引', () => {
    const file = { index: 9, list: [quick('A'), quick('B')] };
    expect(decodeQuickFontFile(file)).toEqual({ status: 'ok', value: { index: 1, list: file.list } });

    const empty = decodeQuickFontFile({ index: 3, list: [] });
    expect(empty).toEqual({ status: 'ok', value: { index: 0, list: [] } });
  });

  it('坏形状：三个数组不等长（缺键）整份拒绝，指出第几条', () => {
    const broken = { index: 0, list: [quick('A'), { family: 'B', name: 'B', zz: ['Regular'] }] };
    const result = decodeQuickFontFile(broken);
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('CORRUPT');
      expect(result.detail).toBe('root.list[1]');
    }
  });
});

describe('selectQuickFont / deleteQuickFont', () => {
  function file(families: string[], index = 0): QuickFontFile {
    return { index, list: families.map(quick) };
  }

  it('select：下标合法 → 只改 index，列表不动', () => {
    const result = selectQuickFont(file(['A', 'B']), 1);

    if (result.status === 'error') throw new Error('应当成功');
    expect(result.value.index).toBe(1);
    expect(result.value.list.map((item) => item.family)).toEqual(['A', 'B']);
  });

  it('select：越界 → VALIDATION（负数、等于长度都算）', () => {
    for (const index of [-1, 2, 99]) {
      const result = selectQuickFont(file(['A', 'B']), index);
      expect(result.status).toBe('error');
      if (result.status === 'error') expect(result.code).toBe('VALIDATION');
    }
  });

  it('delete：下标合法 → 删掉该项并把 index 归 0', () => {
    const result = deleteQuickFont(file(['A', 'B', 'C'], 2), 1);

    if (result.status === 'error') throw new Error('应当成功');
    expect(result.value.list.map((item) => item.family)).toEqual(['A', 'C']);
    expect(result.value.index).toBe(0);
  });

  it('delete：只剩一个 → VALIDATION（至少保留一个）', () => {
    const result = deleteQuickFont(file(['A']), 0);

    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('VALIDATION');
  });

  it('delete：越界 → VALIDATION', () => {
    const result = deleteQuickFont(file(['A', 'B']), 2);

    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('VALIDATION');
  });
});
