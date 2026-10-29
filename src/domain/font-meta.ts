/**
 * 字体标签 / 星级的解码（纯函数）。
 *
 * 两个文件都是用户数据，**只解码视图，不重建原始项**：
 * 写操作在 `repo/font-repo.ts` 里读**原始记录**再改，避免未知键被这里丢掉。
 *
 * 坏条目丢弃但**记账**（`dropped` 带 path 与原因），调用方把它显示出来——「读不到」与「没有」
 * 是两件事，不允许拿空列表冒充。逐项循环统一走 `types/decode-list` 的 `decodeList`。
 */

import { decodeList, type Dropped } from '../types/decode-list';
import { isArrayOf, isRecord, isString } from '../types/guards';
import { parseJson } from '../types/json';
import { MSG } from '../types/messages';
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

/**
 * 缺哪个字段就返回字段名，**不返回句子**：句子只有一句 `MSG.corrupt`，
 * 字段名进 `detail`（`root[2].text`）。这里是「逐字段造句」的老窝，改掉了才不会有 5 种说法。
 */
function tagFieldFail(tag: Record<string, unknown>): string | null {
  if (typeof tag.text !== 'string' || !tag.text) return 'text';
  if (tag.arr !== undefined && !isStringArray(tag.arr)) return 'arr';
  if (tag.xz !== undefined && typeof tag.xz !== 'boolean') return 'xz';
  return null;
}

function starFieldFail(star: Record<string, unknown>): string | null {
  if (typeof star.name !== 'string' || !star.name) return 'name';
  if (typeof star.star !== 'string' && typeof star.star !== 'number') return 'star';
  return null;
}

/** 一项标签 → `FontTag`；缺省 `arr` / `xz` 补默认值 */
function tagItem(value: unknown, path: string): Result<FontTag> {
  if (!isRecord(value)) return failWithDetail('CORRUPT', MSG.corrupt, path);

  const error = tagFieldFail(value);
  if (error) return failWithDetail('CORRUPT', MSG.corrupt, `${path}.${error}`);

  /* 只为类型收窄；字段合法性已由 tagFieldFail 证明 */
  const text = value.text;
  if (typeof text !== 'string') return failWithDetail('CORRUPT', MSG.corrupt, `${path}.text`);

  return ok({ text, arr: isStringArray(value.arr) ? value.arr : [], xz: value.xz === true });
}

/** 一项评分 → `{ name, star }`；`star` 数字/字符串混用都收，非正数算坏项 */
function starItem(value: unknown, path: string): Result<{ name: string; star: number }> {
  if (!isRecord(value)) return failWithDetail('CORRUPT', MSG.corrupt, path);

  const error = starFieldFail(value);
  if (error) return failWithDetail('CORRUPT', MSG.corrupt, `${path}.${error}`);

  const name = value.name;
  if (typeof name !== 'string') return failWithDetail('CORRUPT', MSG.corrupt, `${path}.name`);

  const star = typeof value.star === 'number' ? value.star : Number(value.star);
  if (!Number.isFinite(star) || star <= 0) {
    return failWithDetail('CORRUPT', MSG.corrupt, `${path}.star`);
  }

  return ok({ name, star: Math.trunc(star) });
}

/** `sj_ztglTags.ini` → 标签列表；坏条目丢弃并记账 */
export function decodeFontTags(raw: unknown): Result<{ tags: FontTag[]; dropped: Dropped[] }> {
  const decoded = decodeList(raw, tagItem, 'filter');
  if (decoded.status === 'error') return decoded;

  return ok({ tags: decoded.value.items, dropped: decoded.value.dropped });
}

/** `sj_ztglStar.ini` → `{ 家族名: 1~3 }`；同名重复取后者 */
export function decodeFontStars(
  raw: unknown
): Result<{ stars: Record<string, number>; dropped: Dropped[] }> {
  const decoded = decodeList(raw, starItem, 'filter');
  if (decoded.status === 'error') return decoded;

  const stars: Record<string, number> = {};
  /* 按原顺序赋值 = 「重复取后者」，与原来的单循环语义一致 */
  for (const entry of decoded.value.items) stars[entry.name] = entry.star;

  return ok({ stars, dropped: decoded.value.dropped });
}

/* ---------------- 标签导入文件 ---------------- */

export type RawFontRecord = Record<string, unknown>;

export interface FontTagArchive {
  tags: RawFontRecord[];
  /** 缺省 = 不覆盖评分；存在（哪怕空数组）= 覆盖 */
  stars?: RawFontRecord[];
}

/** 导入文件里的项**原样返回**（不重建对象），未知键与 `star` 的类型都保留 */
function tagRecord(value: unknown, path: string): Result<RawFontRecord> {
  if (!isRecord(value)) return failWithDetail('CORRUPT', MSG.corrupt, path);

  const error = tagFieldFail(value);
  if (error) return failWithDetail('CORRUPT', MSG.corrupt, `${path}.${error}`);

  return ok(value);
}

/** 同上，评分项 */
function starRecord(value: unknown, path: string): Result<RawFontRecord> {
  if (!isRecord(value)) return failWithDetail('CORRUPT', MSG.corrupt, path);

  const error = starFieldFail(value);
  if (error) return failWithDetail('CORRUPT', MSG.corrupt, `${path}.${error}`);

  return ok(value);
}

/**
 * 解析标签导入文件。**先校验、后写盘**：校验不过一个字都不写。
 *
 * 两种合法形状：
 *   `[ {text, arr?, xz?}, ... ]`                只覆盖标签
 *   `{ tags: [...], stars?: [...] }`            可同时覆盖评分
 */
export function parseTagArchive(text: string): Result<FontTagArchive> {
  const parsed = parseJson(text, '标签导入文件');
  if (parsed.status === 'error') return parsed;

  const root = parsed.value;

  if (Array.isArray(root)) {
    const tags = decodeList(root, tagRecord, 'reject', 'tags');
    if (tags.status === 'error') return tags;
    return ok({ tags: tags.value.items });
  }

  if (!isRecord(root)) {
    return failWithDetail('CORRUPT', MSG.corrupt, 'root');
  }
  if (!Array.isArray(root.tags)) {
    return failWithDetail('CORRUPT', MSG.corrupt, 'root.tags');
  }

  const tags = decodeList(root.tags, tagRecord, 'reject', 'tags');
  if (tags.status === 'error') return tags;

  if (root.stars === undefined) return ok({ tags: tags.value.items });
  if (!Array.isArray(root.stars)) {
    return failWithDetail('CORRUPT', MSG.corrupt, 'root.stars');
  }

  const stars = decodeList(root.stars, starRecord, 'reject', 'stars');
  if (stars.status === 'error') return stars;

  return ok({ tags: tags.value.items, stars: stars.value.items });
}
