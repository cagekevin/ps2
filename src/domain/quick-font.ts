/**
 * 字体快选：系统字体项 → 快捷项的形状转换与上限判断。
 *
 * 快捷项的键名是原版的 `zz / hjm / mz`（字重 / PostScript 名 / 字体名），
 * 与 `FontItem` 的 `weights / postScriptNames / names` **不同名**，转换只在这里做。
 * 三个数组必须等长同序：`zz[i]`/`hjm[i]`/`mz[i]` 描述同一个字重，错位就会应用错字体。
 */

import { fail, failWithDetail, ok, type Result } from '../types/result';
import { isRecord } from '../types/guards';
import type { FontItem } from './font-item';
import { clampListIndex } from './font-set';

/** 原版上限 15（`app.v4.js:40107`）：超过就不再加，不是静默丢弃 */
export const QUICK_FONT_LIMIT = 15;

/** 一个字重一个图标，原版最多显示 7 个（`app.v4.js:32316` 的 weightLen） */
export const QUICK_FONT_WEIGHT_LIMIT = 7;

/** 字重排序权重：原版 `sortWeight` 的固定顺序（`app.v4.js:40220`），未知字重排末尾 */
const WEIGHT_ORDER = [
  'ExtraLight',
  'Light',
  'Book',
  'Normal',
  'Regular',
  'Medium',
  'Demi',
  'Bold',
  'Heavy'
];

export interface QuickFont {
  family: string;
  name: string;
  scriptName: string;
  zz: string[];
  hjm: string[];
  mz: string[];
}

export interface QuickFontFile {
  index: number;
  list: QuickFont[];
}

function weightRank(weight: string): number {
  const index = WEIGHT_ORDER.indexOf(weight);
  return index < 0 ? WEIGHT_ORDER.length : index;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** 条目级校验：三个平行数组任一不成立就整份拒绝（错位比缺字体更危险） */
function isQuickFont(value: unknown): value is QuickFont {
  if (!isRecord(value)) return false;
  return (
    typeof value.family === 'string' &&
    typeof value.name === 'string' &&
    typeof value.scriptName === 'string' &&
    isStringArray(value.zz) &&
    isStringArray(value.hjm) &&
    isStringArray(value.mz)
  );
}



/**
 * 快捷字体文件 `{ index, list }`。
 *
 * 读坏不回落空数组：回落等于把用户攒的快捷字体当没存过，下次写就把文件洗掉。
 */
export function normalizeQuickFontFile(raw: unknown): Result<QuickFontFile> {
  if (!isRecord(raw)) return failWithDetail('CORRUPT', '快捷字体文件顶层不是对象', 'root');

  const list = raw.list;
  if (!Array.isArray(list)) {
    return failWithDetail('CORRUPT', '快捷字体文件缺少 list 数组', 'root.list');
  }

  const items: QuickFont[] = [];
  for (let index = 0; index < list.length; index += 1) {
    const item: unknown = list[index];
    if (!isQuickFont(item)) {
      return failWithDetail('CORRUPT', '快捷字体条目结构不符', `root.list[${index}]`);
    }
    items.push({
      family: item.family,
      name: item.name,
      scriptName: item.scriptName,
      zz: [...item.zz],
      hjm: [...item.hjm],
      mz: [...item.mz]
    });
  }

  const rawIndex = typeof raw.index === 'number' ? raw.index : 0;
  return ok({ index: clampListIndex(rawIndex, items.length), list: items });
}

/**
 * 系统字体项 → 快捷项。
 *
 * `name` / `scriptName` 取**排序后**的第一个字重，否则下拉显示的默认字体
 * 与实际会应用的字重对不上（原版取自当前图层字体信息，这里取排序首位）。
 */
export function toQuickFont(font: FontItem): QuickFont {
  const order = font.weights
    .map((_, index) => index)
    .sort((left, right) => {
      const diff = weightRank(font.weights[left] ?? '') - weightRank(font.weights[right] ?? '');
      return diff !== 0 ? diff : left - right;
    });

  const zz = order.map((index) => font.weights[index] ?? '');
  const hjm = order.map((index) => font.postScriptNames[index] ?? '');
  const mz = order.map((index) => font.names[index] ?? '');

  return {
    family: font.family,
    name: mz[0] ?? font.family,
    scriptName: hjm[0] ?? '',
    zz,
    hjm,
    mz
  };
}

/** 能否再加一个：上限 15、同家族去重（原版 `addFont` 的两条前置） */
export function canAddQuickFont(list: QuickFont[], family: string): Result<void> {
  if (list.length >= QUICK_FONT_LIMIT) {
    return fail('VALIDATION', `快捷字体最多 ${QUICK_FONT_LIMIT} 个，请先删掉一个`);
  }
  if (list.some((item) => item.family === family)) {
    return fail('VALIDATION', `「${family}」已在快捷字体里`);
  }
  return ok(undefined);
}
