/**
 * 字体项归一化：**纯函数、零 IO**。
 *
 * 兼容两套键名（见 `font-item.ts`）。坏项丢弃但**计数**——调用方把
 * `dropped` 显示到界面上，不许只写日志（`CONVENTIONS` §4.2 诚实优先）。
 */

import { isRecord } from '../types/guards';
import { fail, ok, type Result } from '../types/result';
import type { FontItem } from './font-item';

/**
 * 只收字符串元素；非字符串**丢掉**，不 `String(...)` 硬转。
 * 旧写法会把 `null` 转成 `"null"`，让坏数据冒充成合法 PostScript 名。
 */
function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'string') return [value];
  return [];
}

/** 单项归一化；缺家族名视为坏项 */
export function normalizeFontItem(raw: unknown): Result<FontItem> {
  if (!isRecord(raw)) return fail('CORRUPT', '字体项不是对象');

  const family =
    typeof raw.family === 'string' ? raw.family : typeof raw.name === 'string' ? raw.name : '';
  if (!family) return fail('CORRUPT', '字体项缺少家族名');

  return ok({
    family,
    weights: asStringArray(raw.weights ?? raw.zz),
    names: asStringArray(raw.names ?? raw.mz),
    postScriptNames: asStringArray(raw.postScriptNames ?? raw.hjm)
  });
}

/**
 * 列表归一化：坏项丢掉、其余照常。
 *
 * 入参必须是数组——顶层形状由调用方判定（`Array.isArray`），
 * 这里不把「不是数组」伪装成「空列表」。
 */
export function normalizeFontList(raw: readonly unknown[]): {
  list: FontItem[];
  dropped: number;
} {
  const list: FontItem[] = [];
  let dropped = 0;

  for (const item of raw) {
    const normalized = normalizeFontItem(item);
    if (normalized.status === 'ok') list.push(normalized.value);
    else dropped += 1;
  }

  return { list, dropped };
}
