/**
 * OCR 的私有解析器（导出图）。
 *
 * **单独一个文件**：能力表要 import 它，写进 `./ocr.ts` 就会形成
 * `capabilities ↔ ocr` 运行时环（与 `text-batch-raw.ts` / `vectorize-raw.ts` 同一个理由）。
 *
 * 只放这一个 —— OCR 的识别结果不走能力表（`core/ocr/baidu` 自己解百度 JSON）。
 */

import type { OcrExport } from '../../types/ocr';
import { isRecord } from '../../types/guards';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import { parseJsxRaw, unwrapRaw } from './raw';

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 导出图：`{ path, offset: { left, top } }`。
 *
 * `no-doc` 走 `unwrapRaw` 的约定值表；形状不对（旧 jsx 回裸路径）一律 `PS_BAD_PAYLOAD` ——
 * **不许按「偏移 0」继续**，那会把建层坐标整体挪到画布左上角。
 */
export function ocrExportRaw(raw: string): Result<OcrExport> {
  const guard = unwrapRaw(raw);
  if (guard.status === 'error') return guard;

  const parsed = parseJsxRaw(raw);
  if (parsed.status === 'error') return parsed;

  const value = parsed.value;
  if (!isRecord(value)) {
    return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, `raw:${raw.slice(0, 120)}`);
  }

  const { path, offset } = value;
  if (typeof path !== 'string' || !path.trim()) {
    return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, `field:path raw:${raw.slice(0, 120)}`);
  }
  if (!isRecord(offset)) {
    return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, `field:offset raw:${raw.slice(0, 120)}`);
  }

  const { left, top } = offset;
  if (!finiteNumber(left) || !finiteNumber(top)) {
    return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, `field:offset.value raw:${raw.slice(0, 120)}`);
  }

  return ok({ path, offset: { left, top } });
}
