/**
 * 缩放档位与翻转方向（常用页 / 字体面板共用）。
 *
 * 数值逐条来自原版 `CommonUse` 的 data（`app.v4.js:1267714`）：
 * `enlargePart` / `enlargeAll` / `narrowPart` / `narrowAll` / `transformData`，一个字都没改。
 * 放 `components/ZoomRow` 而不是 `domain`：`FlipDirection` 由 `commands/common-use` 转出，
 * 而 `domain` 只许依赖 `types`（`eslint.config.js` 的边界规则）。
 */

import type { FlipDirection } from '../../commands/common-use';
import type { IconName } from '../icons';

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
 * 不是界面文字：它必须与官方字符串逐字一致，**不要挪进 `MSG`**（挪了就成了「翻译参数」）。
 * 悬停文案（`title`）才是 UI 文字，已走 `MSG.common.flipTitle*`。
 */
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
