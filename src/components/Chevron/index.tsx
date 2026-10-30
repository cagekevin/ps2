/**
 * 【唯一入口】展开 / 折叠箭头 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】展开 / 折叠箭头。
 *
 * 原版用 `iconzhankaizhedie`（一个向下的 chevron），靠 CSS `rotate(-90deg)` 表示收起态：
 * - 展开 = 0°
 * - 收起 = -90°（转成朝右）
 *
 * **不要用文本字符 `▾` / `▸`**：字形随系统字体变化，不同机器上粗细和高度不一样。
 *
 * 全仓箭头**只有这一套**，**默认恒朝下**：箭头只是「这里能展开 / 能下拉」的指示，不表达开合方向，
 * 所以调用点**不传 `open`** —— 传了收起时就转成朝右，同页出现一右一下两种箭头。
 *
 * **唯一例外是字体面板**（`features/font-panel`）：`NumberField` 的预设箭头与
 * `DistributionHelp` 的「高级用法」箭头随开合翻转（收起朝右 `-90deg` / 展开朝下），这两处必须传 `open`。
 * 除它们之外再传 `open` 就是第二种箭头。
 *
 * 禁止：裸写 `<Icon name="iconxiala">` 当箭头；禁止另起 `__caret` / `__arrow` 类名；
 * 禁止为了「下拉箭头」再引第二个图标（`iconxiala` 是实心三角，与 chevron 不同形状，混用会一眼看出两套）。
 *
 * 尺寸固定小标记档（`--mm-icon-xs` = 12，在 `chevron.css` 给），**没有 `size` 参数**：
 * 箭头永远附着在一行文字或一个控件旁边，不该比字大（`CONVENTIONS` §7 规则 7/14）。
 * 曾经默认 14、调用点又传 12 / 8 三种值，同一个箭头在五处五种大小 —— 别再开这个口子。
 */
import { Icon } from '../icons';
import './chevron.css';

export interface ChevronProps {
  /** 展开 true（朝下）/ 收起 false（转成朝右）。只有字体面板传；其余不传 = 恒朝下 */
  open?: boolean;
  className?: string;
}

/* 尺寸不在这里传：与所有图标一样由 `chevron.css` 的 `.mm-chevron` 按层级给（小标记档 12）。
   曾经默认 14、调用点又传 12 / 8 三种值，同一个箭头在五个地方五种大小。 */
export function Chevron({ open = true, className = '' }: ChevronProps) {
  return (
    <Icon
      name="iconzhankaizhedie"
      className={`mm-chevron${open ? '' : ' mm-chevron--closed'}${className ? ` ${className}` : ''}`}
    />
  );
}
