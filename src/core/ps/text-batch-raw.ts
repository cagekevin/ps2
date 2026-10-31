/**
 * 批量文字三个能力的**私有解析器**与它们的返回形状。
 *
 * 为什么单独一个文件（而不是塞进 `text-batch.ts`）：`capabilities.ts` 要用这三个函数做 `parse`，
 * 而 `text-batch.ts` 又要 import 能力表拿 `CAP.*` —— 放在一起就是 `capabilities → text-batch →
 * capabilities` 的运行时环（`npm run check:cycles` 会红）。本文件只依赖 `raw.ts` 与 `types`，
 * 两头都能安全引用。
 *
 * 为什么不进 `raw.ts`：这三个形状各只服务**一个**能力。放进公共清单，等于让每个加能力的人
 * 多认三个一辈子用不上的名字（`docs/JSX-通道与自写指南.md` §8 的判据）。
 */

import { isRecord } from '../../types/guards';
import { parseJson } from '../../types/json';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import { unwrapRaw } from './raw';

/** 写回结果：只留计数，逐层的 id / 原因留给日志 */
export interface TextWriteReport {
  ok: number;
  failed: number;
}

/** 新建结果：`fontMissing` 只表示「字体没设上」，层照样建了 */
export interface TextCreateReport {
  ok: number;
  fontMissing: boolean;
}

/** `mm_text_readAll` 的 `{ layers: [...] }`：只保证是数组，逐项由 domain 解码 */
export function layersRaw(raw: string): Result<unknown[]> {
  const guard = unwrapRaw(raw);
  if (guard.status === 'error') return guard;

  const parsed = parseJson(raw, 'mm_text_readAll');
  if (parsed.status === 'error') return parsed;

  const value = parsed.value;
  if (!isRecord(value) || !Array.isArray(value.layers)) {
    return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, `raw:${raw.slice(0, 120)}`);
  }
  return ok(value.layers);
}

/** `mm_text_writeAll` 的 `{ ok, failed: [...] }` */
export function writeReportRaw(raw: string): Result<TextWriteReport> {
  const guard = unwrapRaw(raw);
  if (guard.status === 'error') return guard;

  const parsed = parseJson(raw, 'mm_text_writeAll');
  if (parsed.status === 'error') return parsed;

  const value = parsed.value;
  if (!isRecord(value)) {
    return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, `raw:${raw.slice(0, 120)}`);
  }
  return ok({
    ok: typeof value.ok === 'number' ? value.ok : 0,
    failed: Array.isArray(value.failed) ? value.failed.length : 0
  });
}

/** `mm_text_createAll` 的 `{ ok, fontMissing }` */
export function createReportRaw(raw: string): Result<TextCreateReport> {
  const guard = unwrapRaw(raw);
  if (guard.status === 'error') return guard;

  const parsed = parseJson(raw, 'mm_text_createAll');
  if (parsed.status === 'error') return parsed;

  const value = parsed.value;
  if (!isRecord(value)) {
    return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, `raw:${raw.slice(0, 120)}`);
  }
  return ok({
    ok: typeof value.ok === 'number' ? value.ok : 0,
    fontMissing: value.fontMissing === true
  });
}
