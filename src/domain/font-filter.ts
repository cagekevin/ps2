/**
 * 字体筛选：**纯函数、零 IO**。可单测。
 *
 * 目前只有「语言」一组能筛：评分 / 授权 / 类型 / 风格都依赖云端字体数据，
 * 本面板没有那份数据，也不拿 MOCK 冒充（计划 §1.2）。
 *
 * `FilterState` 是「分类键 → 选中 id」的映射，但唯一能写入键的地方是筛选面板，
 * 而面板只渲染 `usableCategories` 放行的组（现在只有 `language`）——
 * 也就是类型上还能写出别的键，实际写不出来。其余键没有数据来源，别往里加。
 */
import type { Classification } from './classification';
import { isAsciiFamily } from './font-lang';
import type { FontItem } from './font-item';

export type FilterState = Record<string, number[]>;

/** 哪些分组对系统字体**真正有效**（其余四组的数据不在本面板里） */
const USABLE_KEYS = new Set(['language']);

export function usableCategories(data: Classification): Classification['categories'] {
  return data.categories.filter((category) => USABLE_KEYS.has(category.key));
}

/** 语言判据委托 `font-lang`，这里不重复写正则 */
function isChinese(family: string): boolean {
  return !isAsciiFamily(family);
}

export function matchFilter(family: string, state: FilterState): boolean {
  const ids = state.language ?? [];
  if (!ids.length) return true;

  /* 1 简体 / 2 繁体 都算中文，3 English，4 日文等其余项不参与判定 */
  const chinese = isChinese(family);
  return ids.some((id) => {
    if (id === 1 || id === 2) return chinese;
    if (id === 3) return !chinese;
    return false;
  });
}

export interface FontFilter {
  /** 搜索词：家族名 / 字体名 / PostScript 名，忽略大小写 */
  keyword: string;
  /** 当前标签名，空串表示不按标签过滤 */
  tag: string;
  /** 该标签下的家族名；标签不存在时为 undefined（此时不过滤） */
  tagFonts?: readonly string[];
  /** 筛选面板选中的条件 */
  state: FilterState;
}

export function hasActiveFilter(
  input: Pick<FontFilter, 'keyword' | 'tag' | 'state'>
): boolean {
  return (
    input.keyword.trim().length > 0 ||
    input.tag.length > 0 ||
    Object.values(input.state).some((ids) => ids.length > 0)
  );
}

export function filterFonts(fonts: readonly FontItem[], input: FontFilter): FontItem[] {
  const keyword = input.keyword.trim().toLowerCase();
  /* Set 只建一次：标签名单是「每个字体查一次」 */
  const tagFonts = input.tag && input.tagFonts ? new Set(input.tagFonts) : undefined;

  return fonts.filter((font) => {
    if (tagFonts && !tagFonts.has(font.family)) return false;
    if (!matchFilter(font.family, input.state)) return false;
    if (!keyword) return true;

    return (
      font.family.toLowerCase().includes(keyword) ||
      font.names.some((name) => name.toLowerCase().includes(keyword)) ||
      font.postScriptNames.some((name) => name.toLowerCase().includes(keyword))
    );
  });
}
