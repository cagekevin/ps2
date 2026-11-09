/**
 * DLSS 神经渲染的 PS 能力：导出选中层 / 结果导回。
 *
 * 通道：直调（`gate: 'core'` 只允许 `direct`）。
 * 「恰好 1 个图层」是**能力表的前置**（`CAP.dlssExport.require`），这里不重复判 ——
 * 多选时 jsx 的 `activeLayer` 只是其中一个，静默处理一个比报错更糟。
 */

import type { DlssExport, DlssPlaced } from '../../types/dlss';
import type { Result } from '../../types/result';
import { callCapability } from './capability';
import { CAP } from './capabilities';

/**
 * 导出选中图层为裁切 PNG（引擎输入）。
 *
 * `maxPixels` 必须由调用方给：上限在 `config`，jsx 读不到它。
 */
export function exportLayer(pngPath: string, maxPixels: number): Promise<Result<DlssExport>> {
  return callCapability(CAP.dlssExport, [pngPath, maxPixels]);
}

/**
 * 把引擎结果导回：尺寸与区域一致 → 原文档新层；放大档 → 另开文档。
 *
 * 6 个参数都是裸字面量过 `toJsxArg`（`JSX 指南 §3`），没有对象参数坑。
 */
export function finishResult(args: {
  pngPath: string;
  left: number;
  top: number;
  regionW: number;
  regionH: number;
  outName: string;
}): Promise<Result<DlssPlaced>> {
  return callCapability(CAP.dlssFinish, [
    args.pngPath,
    args.left,
    args.top,
    args.regionW,
    args.regionH,
    args.outName
  ]);
}
