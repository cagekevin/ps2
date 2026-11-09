/**
 * DLSS 的私有解析器（导出载荷 / 导回载荷）。
 *
 * **单独一个文件**：能力表要 import 它，写进 `./dlss.ts` 就会形成
 * `capabilities ↔ dlss` 运行时环（与 `ocr-raw.ts` / `vectorize-raw.ts` 同一个理由）。
 *
 * 两个约定值（`'layer-too-big'` / `'result-missing'`）已登记在
 * `raw.ts` 的 `RAW_FAILURES`，这里不自己比字符串。
 */

import type { DlssExport, DlssPlaced } from '../../types/dlss';
import { isRecord } from '../../types/guards';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import { parseJsxRaw, unwrapRaw } from './raw';

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** 信封对、载荷坏：`field` 指明哪个字段（现场进 detail，不编新文案） */
function malformed(field: string, raw: string): Result<never> {
  return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, `${field} raw:${raw.slice(0, 120)}`);
}

/**
 * 导出载荷：`{ left, top, width, height, layerName }`。
 *
 * 形状不对一律 `PS_BAD_PAYLOAD` —— **不许按「偏移 0」继续**，那会把结果层整体挪到画布左上角。
 */
export function dlssExportRaw(raw: string): Result<DlssExport> {
  const guard = unwrapRaw(raw);
  if (guard.status === 'error') return guard;

  const parsed = parseJsxRaw(raw);
  if (parsed.status === 'error') return parsed;

  const value = parsed.value;
  if (!isRecord(value)) return malformed('shape', raw);

  const { left, top, width, height, layerName } = value;
  if (!finiteNumber(left) || !finiteNumber(top)) return malformed('field:offset', raw);
  if (!finiteNumber(width) || width <= 0 || !finiteNumber(height) || height <= 0) {
    return malformed('field:size', raw);
  }
  if (typeof layerName !== 'string' || !layerName) return malformed('field:layerName', raw);

  return ok({ left, top, width, height, layerName });
}

/**
 * 导回载荷：`{ mode, name, left?, top?, width, height }`。
 *
 * `mode:'layer'` 必须带落点（对齐结果要能验）；`'document'` 不带（结果文档不在原画布上）。
 */
export function dlssPlacedRaw(raw: string): Result<DlssPlaced> {
  const guard = unwrapRaw(raw);
  if (guard.status === 'error') return guard;

  const parsed = parseJsxRaw(raw);
  if (parsed.status === 'error') return parsed;

  const value = parsed.value;
  if (!isRecord(value)) return malformed('shape', raw);

  const { mode, name, left, top, width, height } = value;
  if (mode !== 'layer' && mode !== 'document') return malformed('field:mode', raw);
  if (typeof name !== 'string' || !name) return malformed('field:name', raw);
  if (!finiteNumber(width) || width <= 0 || !finiteNumber(height) || height <= 0) {
    return malformed('field:size', raw);
  }

  if (mode === 'document') return ok({ mode, name, width, height });

  if (!finiteNumber(left) || !finiteNumber(top)) return malformed('field:offset', raw);
  return ok({ mode, name, left, top, width, height });
}
