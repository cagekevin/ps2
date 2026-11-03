/**
 * OCR 的 PS 能力：导出画布 + 抹掉选区原文（内容识别填充）。
 *
 * 建层不在这里：OCR 走 `./text-batch.ts` 的 `createTextLayers`（入参 `mode: 'absolute'`），
 * 与「批量文字」新建是同一个入口、同一个 jsx 函数（`mm_text_createAll`），
 * 建层动作（add / kind / contents / font / fontMissing）在 jsx 的 `mm_text_newLayer` 一处。
 *
 * 通道：直调（`gate: 'core'` 只允许 `direct`）。
 */

import type { OcrExport } from '../../types/ocr';
import type { Result } from '../../types/result';
import { callCapability } from './capability';
import { CAP } from './capabilities';

/**
 * 导出当前画布（合并可见图层）为 JPG；有像素选区时只导出选区。
 *
 * 返回路径与偏移，体积超限时由调用方换低一档（`quality` 8 → 6 → 4）。
 * `offset` 是裁切矩形左上角（无选区时为 0），由 jsx 产出、命令层原样转给 `toOcrGroups`。
 */
export function exportImage(quality: 8 | 6 | 4): Promise<Result<OcrExport>> {
  return callCapability(CAP.ocrExport, [quality]);
}

/**
 * 抹掉选区内容（内容识别填充），识别之后原位换字用。
 * 只对位图有意义；无选区或活动层不是像素层时 jsx 什么都不做，同样返回成功。
 */
export function eraseOriginal(): Promise<Result<void>> {
  return callCapability(CAP.ocrErase);
}
