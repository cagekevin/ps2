/**
 * 字体标签 / 星级的解码（纯函数）。
 *
 * 两个文件都是用户数据，**只解码视图，不重建原始项**：
 * 写操作在 `repo/font-repo.ts` 里读**原始记录**再改，避免未知键被这里丢掉。
 *
 * 坏条目丢弃但计数，调用方把 `dropped` 显示出来——「读不到」与「没有」
 * 是两件事，不允许拿空列表冒充。
 */

import { isArrayOf, isRecord, isString } from '../types/guards';
import { parseJson } from '../types/json';
import { failWithDetail, ok, type Result } from '../types/result';

/** 标签项（字段名保持原版：text / arr / xz） */
export interface FontTag {
  text: string;
  /** 该标签下挂的家族名 */
  arr: string[];
  /** 原版折叠状态；v1 只读不改 */
  xz: boolean;
}

function isStringArray(value: unknown): value is string[] {
  return isArrayOf(value, isString);
}

/** `sj_ztglTags.ini` → 标签列表 */
export function decodeFontTags(raw: unknown): Result<{ tags: FontTag[]; dropped: number }> {
  if (!Array.isArray(raw)) return failWithDetail('CORRUPT', '标签文件顶层不是数组', 'root');

  const tags: FontTag[] = [];
  let dropped = 0;

  for (const [index, item] of raw.entries()) {
    if (!isRecord(item) || tagFieldFail(item, index)) {
      dropped += 1;
      continue;
    }

    /* 只为类型收窄；字段合法性已由 tagFieldFail 证明 */
    const text = item.text;
    if (typeof text !== 'string') {
      dropped += 1;
      continue;
    }

    tags.push({
      text,
      arr: isStringArray(item.arr) ? item.arr : [],
      xz: item.xz === true
    });
  }

  return ok({ tags, dropped });
}

/** `sj_ztglStar.ini` → `{ 家族名: 1~3 }`；`star` 数字/字符串混用都收 */
export function decodeFontStars(
  raw: unknown
): Result<{ stars: Record<string, number>; dropped: number }> {
  if (!Array.isArray(raw)) return failWithDetail('CORRUPT', '星级文件顶层不是数组', 'root');

  const stars: Record<string, number> = {};
  let dropped = 0;

  for (const [index, item] of raw.entries()) {
    if (!isRecord(item) || starFieldFail(item, index)) {
      dropped += 1;
      continue;
    }

    /* 只为类型收窄；字段合法性已由 starFieldFail 证明 */
    const name = item.name;
    if (typeof name !== 'string') {
      dropped += 1;
      continue;
    }

    const value = typeof item.star === 'number' ? item.star : Number(item.star);

    if (!Number.isFinite(value) || value <= 0) {
      dropped += 1;
      continue;
    }

    stars[name] = Math.trunc(value);
  }

  return ok({ stars, dropped });
}


/* ---------------- 标签导入文件 ---------------- */

export type RawFontRecord = Record<string, unknown>;

export interface FontTagArchive {
  tags: RawFontRecord[];
  /** 缺省 = 不覆盖评分；存在（哪怕空数组）= 覆盖 */
  stars?: RawFontRecord[];
}

/** `field` 进 `detail`（机器可查），`message` 进 `reason`（给用户看） */
interface FieldFail {
  field: string;
  message: string;
}

function tagFieldFail(tag: RawFontRecord, index: number): FieldFail | null {
  if (typeof tag.text !== 'string' || !tag.text) {
    return { field: 'text', message: `第 ${index + 1} 个标签缺少 text` };
  }
  if (tag.arr !== undefined && !isStringArray(tag.arr)) {
    return { field: 'arr', message: `第 ${index + 1} 个标签的 arr 必须是字符串数组` };
  }
  if (tag.xz !== undefined && typeof tag.xz !== 'boolean') {
    return { field: 'xz', message: `第 ${index + 1} 个标签的 xz 必须是布尔值` };
  }
  return null;
}

function starFieldFail(star: RawFontRecord, index: number): FieldFail | null {
  if (typeof star.name !== 'string' || !star.name) {
    return { field: 'name', message: `第 ${index + 1} 个评分缺少 name` };
  }
  if (typeof star.star !== 'string' && typeof star.star !== 'number') {
    return { field: 'star', message: `第 ${index + 1} 个评分的 star 必须是字符串或数字` };
  }
  return null;
}

/** 逐项校验标签；`detail` 指出第几个条目的哪个字段（`reason` 不承担定位职责） */
function parseTags(raw: readonly unknown[]): Result<RawFontRecord[]> {
  const tags: RawFontRecord[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    if (!isRecord(item)) {
      return failWithDetail('CORRUPT', `第 ${index + 1} 个标签不是对象`, `tags[${index}]`);
    }
    const error = tagFieldFail(item, index);
    if (error) return failWithDetail('CORRUPT', error.message, `tags[${index}].${error.field}`);
    tags.push(item);
  }
  return ok(tags);
}

/** 逐项校验评分；规则同上 */
function parseStars(raw: readonly unknown[]): Result<RawFontRecord[]> {
  const stars: RawFontRecord[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    if (!isRecord(item)) {
      return failWithDetail('CORRUPT', `第 ${index + 1} 个评分不是对象`, `stars[${index}]`);
    }
    const error = starFieldFail(item, index);
    if (error) return failWithDetail('CORRUPT', error.message, `stars[${index}].${error.field}`);
    stars.push(item);
  }
  return ok(stars);
}

/**
 * 解析标签导入文件。**先校验、后写盘**：校验不过一个字都不写。
 *
 * 两种合法形状：
 *   `[ {text, arr?, xz?}, ... ]`                只覆盖标签
 *   `{ tags: [...], stars?: [...] }`            可同时覆盖评分
 *
 * 项**原样返回**（不重建对象），未知键和 `star` 的字符串/数字混用都保留。
 */
export function parseTagArchive(text: string): Result<FontTagArchive> {
  const parsed = parseJson(text, '标签导入文件');
  if (parsed.status === 'error') return parsed;

  const root = parsed.value;

  if (Array.isArray(root)) {
    const tags = parseTags(root);
    if (tags.status === 'error') return tags;
    return ok({ tags: tags.value });
  }

  if (!isRecord(root)) {
    return failWithDetail('CORRUPT', '标签导入文件顶层必须是对象或数组', 'root');
  }
  if (!Array.isArray(root.tags)) {
    return failWithDetail('CORRUPT', '标签导入文件缺少 tags 数组', 'root.tags');
  }

  const tags = parseTags(root.tags);
  if (tags.status === 'error') return tags;

  if (root.stars === undefined) return ok({ tags: tags.value });
  if (!Array.isArray(root.stars)) {
    return failWithDetail('CORRUPT', 'stars 必须是数组', 'root.stars');
  }

  const stars = parseStars(root.stars);
  if (stars.status === 'error') return stars;

  return ok({ tags: tags.value, stars: stars.value });
}
