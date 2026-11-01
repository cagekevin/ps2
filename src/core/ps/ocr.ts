/**
 * OCR 的 PS 能力：**只有导出画布**一个。
 *
 * 建层不在这里：OCR 走 `./text-batch.ts` 的 `createTextLayers`（入参 `mode: 'absolute'`），
 * 与「批量文字」新建是同一个入口、同一个 jsx 函数（`mm_text_createAll`），
 * 建层动作（add / kind / contents / font / fontMissing）在 jsx 的 `mm_text_newLayer` 一处。
 *
 * 通道：直调（`gate: 'core'` 只允许 `direct`）。
 */

import type { Result } from '../../types/result';
import { callCapability } from './capability';
import { CAP } from './capabilities';

/** 导出当前画布（合并可见图层）为 JPG，返回绝对路径；体积超限时由调用方换低一档 */
export function exportImage(quality: 8 | 6 | 4): Promise<Result<string>> {
  return callCapability(CAP.ocrExport, [quality]);
}
