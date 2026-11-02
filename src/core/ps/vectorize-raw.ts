/**
 * 矢量化的私有解析器（导出图 / 建形状层的返回值）。
 *
 * **单独一个文件**：能力表要 import 它，写进 `./vectorize.ts` 就会形成
 * `capabilities ↔ vectorize` 运行时环（与 `text-batch-raw.ts` 同一个理由）。
 *
 * 两个解析器都只服务本域，不进 `raw.ts`：那里只放「≥2 个能力会用」或纯结构工具。
 */

import { isRecord } from '../../types/guards';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import type { VectorExport } from '../../types/vectorize';
import { parseJsxRaw, unwrapRaw } from './raw';

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 导出图：`{ path, exportWidth, exportHeight, bounds }`。
 *
 * `no-doc` / `need-one` / `skipped` 走 `unwrapRaw` 的约定值表；
 * 形状不对（旧 jsx 回裸路径）一律 `PS_BAD_PAYLOAD` —— **不许按「没有偏移」继续**，
 * 那会把整层建到画布左上角。
 */
export function vecExportRaw(raw: string): Result<VectorExport> {
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
  if (!finiteNumber(exportWidth) || exportWidth <= 0 || !finiteNumber(exportHeight) || exportHeight <= 0) {
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

  return ok({ path, exportWidth, exportHeight, bounds: { left, top, width, height } });
}

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
