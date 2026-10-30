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
 * 全仓箭头**只有这一套**，**一律随开合**（2026-10-30 统一）：
 * - 未展开 → 朝右（`-90deg`）；展开 → 朝下（`0`）
 * - 下拉触发器、抽屉触发器、折叠行、组头、预设面板、标签展开，**全部传 `open`**
 * - 默认值 `open = true` 只是「朝下」的兜底；不传就是恒朝下，只可用于确实没有开合语义的静态指示
 *   （当前全仓 0 处）——同页出现一个朝右一个朝下，就是漏传了 `open`
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
  /** 折叠态：展开 true（朝下）/ 收起 false（转成朝右）。弹层指示不传，恒朝下 */
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
