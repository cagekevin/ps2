/**
 * 常用页的纯数据：缩放档位、翻转表、格子与命令的接线。
 *
 * 页面与将来两个子面板都从这里取，模板里不出现字面量数组。数值逐条来自原版
 * `CommonUse` 的 data（`app.v4.js:1267714`）：`enlargePart` / `enlargeAll` /
 * `narrowPart` / `narrowAll` / `transformData`，一个字都没改。
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
  swapWireframeFill,
  type FlipDirection
} from '../../commands/common-use';
import type { IconName } from '../../components/icons';
import { MSG } from '../../domain/messages';
import type { Result } from '../../types/result';

/** 缩放四组档位（按钮上只显示数字，原版就是 `105` 不带百分号） */
export const ZOOM_LEVELS = {
  enlargePart: [105, 110, 150, 200],
  enlargeAll: [101, 102, 103, 120, 140, 250, 300, 350, 400, 500],
  narrowPart: [95, 90, 80, 50],
  narrowAll: [99, 98, 97, 70, 60, 50, 33, 25, 20, 10]
} as const;

/**
 * 翻转 6 向：图标 / 方向文本（传给 jsx）/ 悬停文案，原版 `transformData` 逐项照抄。
 *
 * `direction`（`'左右'` / `'上下'` / `'左'` …）是**传给 `cy_transformPosition` 的参数值**，
 * 不是界面文字：它必须与官方字符串逐字一致，**不要挪进 `MSG`**（挪了就成了"翻译参数"）。
 * 悬停文案（`title`）才是 UI 文字，已走 `MSG.common.flipTitle*`。
 */
export const FLIP_ITEMS: ReadonlyArray<{
  icon: IconName;
  direction: FlipDirection;
  title: string;
}> = [
  { icon: 'iconzuoyoufanzhuan', direction: '左右', title: MSG.common.flipTitleLr },
  { icon: 'iconshangxiafanzhuan', direction: '上下', title: MSG.common.flipTitleTb },
  { icon: 'iconxiangzuofanzhuan', direction: '左', title: MSG.common.flipTitleLeft },
  { icon: 'iconxiangyoufanzhuan', direction: '右', title: MSG.common.flipTitleRight },
  { icon: 'iconxiangxiafanzhuan', direction: '下', title: MSG.common.flipTitleBottom },
  { icon: 'iconxiangshangfanzhuan', direction: '上', title: MSG.common.flipTitleTop }
];

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

/** 网格第 4 项：切「智能填色」开关，返回切换后的值（提示文案在页面） */
export const AUTO_FILL_TILE_ID = 'div_img_cya4';
