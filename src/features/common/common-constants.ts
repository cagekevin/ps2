/**
 * 常用页的纯数据：格子与命令的接线（缩放档位 / 翻转表在 `components/ZoomRow`，两页共用）。
 *
 * 页面与将来两个子面板都从这里取，模板里不出现字面量数组。
 */

import {
  correctBlur,
  embedImage,
  embedMultipleImage,
  exchangeLayerColor,
  exportImage,
  importMultipleImage,
  layerReplace,
  locationTrade,
  optimizeDoc,
  swapWireframeFill
} from '../../commands/common-use';
import type { Result } from '../../types/result';

/**
 * 已接线的格子：`id` → **左键执行**的命令。
 *
 * 表里 10 项：v1 的 5 项 + v2 的 5 项（嵌入图片 / 嵌入多图片 / 导入多图片 / 优化文档 / 导出图片）。
 * 其中 4 项（嵌入图片 / 导入多图片 / 优化文档 / 导出图片）**左键执行、右键展开面板**——
 * 官方 `clickFunction` 按名字分派，只有「自定义变换 / 参考线 / 按间距」左键才是展开
 * （`13-常用-V2` §1.6）。
 *
 * 不进这张表的 3 类：
 *   - `div_img_cya4`「自动填充颜色」是**开关**，走 `AUTO_FILL_TILE_ID` + `toggleAutoFill`；
 *   - `div_img_cya8`「自定义变换」左键只展开（面板在 M3 落）；
 *   - `div_img_cya11` / `div_img_cya13` 两个面板项，同样只展开。
 */
export const TILE_COMMANDS: Record<string, () => Promise<Result<void>>> = {
  div_img_cya1: embedImage,
  div_img_cya2: embedMultipleImage,
  div_img_cya3: importMultipleImage,
  div_img_cya5: correctBlur,
  div_img_cya6: swapWireframeFill,
  div_img_cya7: optimizeDoc,
  div_img_cya9: exportImage,
  div_img_cya12: exchangeLayerColor,
  div_img_cya14: layerReplace,
  div_img_cya15: locationTrade
};

/**
 * 秒级内单次 PS 变换的 tile：**不弹全屏遮罩**（官方同款操作不遮罩，弹了只是闪一下）。
 * 其余 tile（嵌入 / 导入 / 优化 / 导出 / 图层替换 / 位置交换）保留遮罩——
 * 其中嵌入/导入/优化/导出还会在命令层 `loading.show` 出带进度的遮罩。
 */
export const INSTANT_TILE_IDS = new Set(['div_img_cya5', 'div_img_cya6', 'div_img_cya12']);

/** 网格第 4 项：切「智能填色」开关，返回切换后的值（提示文案在页面） */
export const AUTO_FILL_TILE_ID = 'div_img_cya4';
