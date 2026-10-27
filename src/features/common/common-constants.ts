/**
 * 常用页的纯数据：缩放档位、翻转表、格子与命令的接线。
 *
 * 页面与将来两个子面板都从这里取，模板里不出现字面量数组。数值逐条来自原版
 * `CommonUse` 的 data（`app.v4.js:1267714`）：`enlargePart` / `enlargeAll` /
 * `narrowPart` / `narrowAll` / `transformData`，一个字都没改。
 */

import {
  correctBlur,
  exchangeLayerColor,
  layerReplace,
  locationTrade,
  swapWireframeFill,
  type FlipDirection
} from '../../commands/common-use';
import type { IconName } from '../../components/icons';
import type { Result } from '../../types/result';

/** 缩放四组档位（按钮上只显示数字，原版就是 `105` 不带百分号） */
export const ZOOM_LEVELS = {
  enlargePart: [105, 110, 150, 200],
  enlargeAll: [101, 102, 103, 120, 140, 250, 300, 350, 400, 500],
  narrowPart: [95, 90, 80, 50],
  narrowAll: [99, 98, 97, 70, 60, 50, 33, 25, 20, 10]
} as const;

/** 翻转 6 向：图标 / 方向文本（传给 jsx）/ 悬停文案，原版 `transformData` 逐项照抄 */
export const FLIP_ITEMS: ReadonlyArray<{
  icon: IconName;
  direction: FlipDirection;
  title: string;
}> = [
  { icon: 'iconzuoyoufanzhuan', direction: '左右', title: '左右翻转' },
  { icon: 'iconshangxiafanzhuan', direction: '上下', title: '上下翻转' },
  { icon: 'iconxiangzuofanzhuan', direction: '左', title: '向左翻转' },
  { icon: 'iconxiangyoufanzhuan', direction: '右', title: '向右翻转' },
  { icon: 'iconxiangxiafanzhuan', direction: '下', title: '向下翻转' },
  { icon: 'iconxiangshangfanzhuan', direction: '上', title: '向上翻转' }
];

/**
 * v1 已接线的格子：`id` → 命令。
 *
 * 不在表里的 7 项（嵌入图片 / 嵌入多图片 / 导入多图片 / 自动填充颜色 / 优化文档 /
 * 自定义变换 / 导出图片）v1 没有命令，页面把它们渲染成灰态——**不接一个「点了没反应」的按钮**。
 * 两个子面板项（参考线工具 / 按间距分布）不进这张表，它们走展开面板（M3）。
 */
export const TILE_COMMANDS: Record<string, () => Promise<Result<void>>> = {
  div_img_cya5: correctBlur,
  div_img_cya6: swapWireframeFill,
  div_img_cya12: exchangeLayerColor,
  div_img_cya14: layerReplace,
  div_img_cya15: locationTrade
};
