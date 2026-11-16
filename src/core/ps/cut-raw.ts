/**
 * 抠图的私有解析器（导出载荷）。
 *
 * **单独一个文件**：能力表要 import 它，写进 `./cut.ts` 就会形成
 * `capabilities ↔ cut` 运行时环（与 `dlss-raw.ts` / `vectorize-raw.ts` 同一个理由）。
 *
 * 结果导回（`mm_placePngIntoDoc`）的解析器**不在这里**：与 DLSS 共用 `dlssPlacedRaw`
 * —— 同一形状不许写两个校验函数。
 */

import type { CutExport } from '../../types/cut';
import { isRecord } from '../../types/guards';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import { parseJsxRaw, unwrapRaw } from './raw';

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 导出载荷：`{ path, exportWidth, exportHeight, bounds }`。
 *
 * `no-doc` 走 `unwrapRaw` 的约定值表；形状不对一律 `PS_BAD_PAYLOAD` ——
 * **不许按「没有偏移」继续**，那会把结果层整体贴到画布左上角。
 */
export function cutExportRaw(raw: string): Result<CutExport> {
  const guard = unwrapRaw(raw);
  if (guard.status === 'error') return guard;

  const parsed = parseJsxRaw(raw);
  if (parsed.status === 'error') return parsed;

  const value = parsed.value;
  if (!isRecord(value)) {
    return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, `raw:${raw.slice(0, 120)}`);
  }

  const { path, exportWidth, exportHeight, bounds } = value;
  if (typeof path !== 'string' || !path.trim()) {
    return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, `field:path raw:${raw.slice(0, 120)}`);
  }
  if (
    !finiteNumber(exportWidth) ||
    exportWidth <= 0 ||
    !finiteNumber(exportHeight) ||
    exportHeight <= 0
  ) {
    return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, `field:exportSize raw:${raw.slice(0, 120)}`);
  }
  if (!isRecord(bounds)) {
    return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, `field:bounds raw:${raw.slice(0, 120)}`);
  }

  const { left, top, width, height } = bounds;
  if (
    !finiteNumber(left) ||
    !finiteNumber(top) ||
    !finiteNumber(width) ||
    !finiteNumber(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, `field:bounds.value raw:${raw.slice(0, 120)}`);
  }

  return ok({
    path,
    exportWidth,
    exportHeight,
    bounds: { left, top, width, height }
  });
}
