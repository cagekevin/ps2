/**
 * 字体项归一化：**纯函数、零 IO**。
 *
 * 「一项长什么样」在这里；「文件里一堆项、坏的怎么办」在 `types/decode-list` 的 `decodeList`。
 * 坏项丢弃但**记账**（`dropped` 带 path 与原因）——调用方把它显示到界面上，
 * 不许只写日志（`CONVENTIONS` §4.2 诚实优先）。
 *
 * 兼容两套键名（见 `font-item.ts`）。
 */

import { decodeList, type Dropped } from '../types/decode-list';
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
export function decodeFontItem(raw: unknown): Result<FontItem> {
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
 * 列表归一化：坏项丢掉、其余照常，丢掉的进 `dropped`。
 *
 * 入参是 `unknown`：顶层形状由 `decodeList` 判，非数组直接 `CORRUPT`——
 * 不把「不是数组」伪装成「空列表」。
 */
export function decodeFontList(
  raw: unknown
): Result<{ list: FontItem[]; dropped: Dropped[] }> {
  const decoded = decodeList(raw, decodeFontItem, 'filter');
  if (decoded.status === 'error') return decoded;

  return ok({ list: decoded.value.items, dropped: decoded.value.dropped });
}
