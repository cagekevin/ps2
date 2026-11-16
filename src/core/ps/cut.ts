/**
 * 一键抠图的 PS 能力：导出当前图层为透明 PNG / 把结果 PNG 放回原位。
 *
 * 两条都是薄函数：参数原样过 `callCapability`，本层不算坐标、不判图层类型
 * （图层类型前置由能力表的 `require` 统一跑，`CONVENTIONS` §9「判据一处」）。
 * 通道：直调（`gate: 'core'` 只允许 `direct`）。
 */

import type { CutExport } from '../../types/cut';
import type { Result } from '../../types/result';
import { callCapability } from './capability';
import { CAP } from './capabilities';

/**
 * 导出当前图层为透明 PNG（原尺寸，不铺白底）到调用方给的绝对路径。
 *
 * 路径由 Node 侧 `core/temp.prepareTemp` 给出、jsx 只负责写 —— 两边各自拼临时目录
 * 就会有两套落点（`CONVENTIONS` §5.1 临时目录唯一出口）。
 *
 * 与矢量化的导出**不合并**：那个是白底（vtracer 把透明当黑），这个必须带 alpha；
 * 与 OCR 的也不合并：那个按选区裁切且是 JPG。三处目的不同，jsx 文件头有对照表。
 */
export function exportLayer(pngPath: string): Promise<Result<CutExport>> {
  return callCapability(CAP.cutExport, [pngPath]);
}

/**
 * 把结果 PNG 作为新图层放进当前文档，按 `left` / `top` 对齐（原层不动，新层在最上）。
 *
 * 放置与对齐的实现在 `mm_placePngIntoDoc`（DLSS 导回也调它，全仓只此一份）。
 * 对齐的是「PNG 画布左上角」：抠图结果四周有透明留边，jsx 先量画布内内容偏移再抵消
 * （`plan 21` §6「结果位置」）。
 */
export function placePng(
  path: string,
  left: number,
  top: number,
  name: string
): Promise<Result<void>> {
  return callCapability(CAP.placePngIntoDoc, [path, left, top, name]).then((placed) =>
    placed.status === 'error' ? placed : { status: 'ok' as const, value: undefined }
  );
}
