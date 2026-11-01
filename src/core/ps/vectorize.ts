/**
 * 矢量化的 PS 能力：导出选中层 / 用路径点建形状层。
 *
 * 两条都在 jsx 里一次 `suspendHistory` 完成；本层只转参数，不算任何坐标。
 * 通道：直调（`gate: 'core'` 只允许 `direct`）。
 */

import type { Result } from '../../types/result';
import type { VectorSubPath } from '../../types/vectorize';
import { callCapability } from './capability';
import { CAP } from './capabilities';

/** 导出选中图层为白底 PNG（选中必须恰好 1 个），返回绝对路径 */
export function exportLayer(): Promise<Result<string>> {
  return callCapability(CAP.vecExport, []);
}

/**
 * 建形状层的入参：坐标与颜色都由调用方算好。
 *
 * **不带 `name`**：形状层沿用原图层名，而原层名只有 jsx 侧拿得准（`doc.activeLayer`）；
 * 命令层为了拿它得多调一次 `getLayerState`，反而可能取到导出后变化的当前层。
 */
export interface VectorReplacePayload {
  /** 单色填充（PS 形状层只有一种填充色） */
  color: { r: number; g: number; b: number };
  subpaths: VectorSubPath[];
}

/** 用路径点建形状层并删掉原图层（整次一条历史） */
export function replaceWithPath(payload: VectorReplacePayload): Promise<Result<{ ok: number }>> {
  return callCapability(CAP.vecReplace, [payload]);
}
