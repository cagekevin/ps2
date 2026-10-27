import { describe, expect, it } from 'vitest';
import type { Classification } from './classification';
import type { FontItem } from './font-item';
import { filterFonts, hasActiveFilter, matchFilter, usableCategories } from './font-filter';

const data: Classification = {
  categories: [
    { key: 'rating', name: '评分', tags: [] },
    { key: 'language', name: '字体语言', tags: [] },
    { key: 'commercial', name: '授权类型', tags: [] },
    { key: 'type', name: '字体类型', tags: [] }
  ]
};

function font(family: string, names: string[] = [family], post: string[] = [family]): FontItem {
  return { family, weights: ['Regular'], names, postScriptNames: post };
}

describe('usableCategories', () => {
  it('只放语言：评分 / 授权 / 类型 / 风格都没有数据来源', () => {
    expect(usableCategories(data).map((item) => item.key)).toEqual(['language']);
  });
});

describe('matchFilter', () => {
  it('语言：1/2 中文，3 英文，其余 id 不参与', () => {
    expect(matchFilter('思源黑体', { language: [1] })).toBe(true);
    expect(matchFilter('思源黑体', { language: [2] })).toBe(true);
    expect(matchFilter('思源黑体', { language: [3] })).toBe(false);
    expect(matchFilter('MiSans', { language: [3] })).toBe(true);
    expect(matchFilter('MiSans', { language: [4] })).toBe(false);
  });

  it('同一组内多选是 OR', () => {
    expect(matchFilter('MiSans', { language: [1, 3] })).toBe(true);
    expect(matchFilter('思源黑体', { language: [1, 3] })).toBe(true);
  });

  it('没有选中条件时放行', () => {
    expect(matchFilter('任意', {})).toBe(true);
  });
});

describe('filterFonts', () => {
  const fonts = [font('MiSans'), font('思源黑体', ['思源黑体'], ['SourceHanSansSC'])];

  it('关键词匹配家族名 / 字体名 / PostScript 名', () => {
    expect(filterFonts(fonts, { keyword: 'misan', tag: '', state: {} })).toHaveLength(1);
    expect(filterFonts(fonts, { keyword: 'sourcehan', tag: '', state: {} })).toHaveLength(1);
    expect(filterFonts(fonts, { keyword: '黑体', tag: '', state: {} })).toHaveLength(1);
  });

  it('标签存在时按家族名过滤；标签不存在时不过滤', () => {
    expect(
      filterFonts(fonts, { keyword: '', tag: '标题', tagFonts: ['MiSans'], state: {} })
    ).toEqual([fonts[0]]);
    expect(
      filterFonts(fonts, { keyword: '', tag: '标题', tagFonts: undefined, state: {} })
    ).toHaveLength(2);
  });

  it('关键词与语言筛选之间是 AND', () => {
    expect(
      filterFonts(fonts, { keyword: 'misan', tag: '', state: { language: [1] } })
    ).toHaveLength(0);
    expect(
      filterFonts(fonts, { keyword: 'misan', tag: '', state: { language: [3] } })
    ).toHaveLength(1);
  });
});

describe('hasActiveFilter', () => {
  it('关键词 / 标签 / 面板任意一个有值即为 true', () => {
    expect(hasActiveFilter({ keyword: ' ', tag: '', state: {} })).toBe(false);
    expect(hasActiveFilter({ keyword: 'a', tag: '', state: {} })).toBe(true);
    expect(hasActiveFilter({ keyword: '', tag: 't', state: {} })).toBe(true);
    expect(hasActiveFilter({ keyword: '', tag: '', state: { language: [1] } })).toBe(true);
  });
});
