/**
 * 矢量化的私有解析器（建形状层的返回值）。
 *
 * **单独一个文件**：能力表要 import 它，写进 `./vectorize.ts` 就会形成
 * `capabilities ↔ vectorize` 运行时环（与 `text-batch-raw.ts` 同一个理由）。
 *
 * 导出图的解析器不在这里 —— 那是「jsx 只回一个绝对路径」的通用形状，
 * 已上移到 `./raw.ts` 的 `exportPathRaw`（OCR 与矢量化共用一份）。
 */

import { isRecord } from '../../types/guards';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import { parseJsxRaw, unwrapRaw } from './raw';

/** 建路径结果：`{ ok: N }`；`no-doc` 折 `PS_NO_DOC`，`need-one` 由导出那步先拦 */
export function replaceReportRaw(raw: string): Result<{ ok: number }> {
  const guard = unwrapRaw(raw);
  if (guard.status === 'error') return guard;

  const parsed = parseJsxRaw(raw);
  if (parsed.status === 'error') return parsed;

  const value = parsed.value;
  if (!isRecord(value)) {
    return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, `raw:${raw.slice(0, 120)}`);
  }

  const count = value.ok;
  if (typeof count !== 'number') {
    return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, `field:ok raw:${raw.slice(0, 120)}`);
  }
  return ok({ ok: count });
}
