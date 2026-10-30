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
 * 两种形态，`open` **必传**（不传编译不过 —— 这是刻意的：漏传会悄悄退化成「恒朝下」，
 * 同页出现一右一下两种箭头，且没人会注意到）：
 * - `open={开合状态}`：正常两态 —— 收起朝右、展开朝下。分组行 / 抽屉标题 / 缩放行都用这个。
 * - `open="static"`：不表达开合、恒朝下 —— 用在「这个图标本身就是个按钮」的地方：
 *   字体面板的预设箭头与「高级用法」（用户定的：字体页的箭头是个按钮，不随开合转），
 *   以及下拉触发器（官方 `select` 实拍：展开与否都是 ∨）。
 *
 * 判据：**箭头转不转，用户会不会因此少知道一件事？** 会 ⇒ 传开合状态；不会 ⇒ `"static"`。
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
  /** 开合状态：`true` 展开（朝下）/ `false` 收起（转成朝右）；`'static'` 恒朝下、不表达开合 */
  open: boolean | 'static';
  className?: string;
}

/* 尺寸不在这里传：与所有图标一样由 `chevron.css` 的 `.mm-chevron` 按层级给（小标记档 12）。
   曾经默认 14、调用点又传 12 / 8 三种值，同一个箭头在五个地方五种大小。 */
export function Chevron({ open, className = '' }: ChevronProps) {
  return (
    <Icon
      name="iconzhankaizhedie"
      className={`mm-chevron${open === false ? ' mm-chevron--closed' : ''}${className ? ` ${className}` : ''}`}
    />
  );
}
