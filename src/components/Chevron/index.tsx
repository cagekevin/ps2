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
 * 全仓箭头**只有这一套**，两种用法都走这里：
 * - **有开合状态**（折叠行、组头、高级用法、预设面板、标签展开）→ 传 `open`，收起转 `-90deg`
 * - **弹层指示**（下拉、缩放区）→ 不传 `open`，恒朝下、不旋转
 *
 * 禁止：裸写 `<Icon name="iconxiala">` 当箭头；禁止另起 `__caret` / `__arrow` 类名；
 * 禁止为了「下拉箭头」再引第二个图标（`iconxiala` 是实心三角，与 chevron 不同形状，混用会一眼看出两套）。
 */
import { Icon } from '../icons';
import './chevron.css';

export interface ChevronProps {
  /** 折叠态：展开 true（朝下）/ 收起 false（转成朝右）。弹层指示不传，恒朝下 */
  open?: boolean;
  size?: number;
  className?: string;
}

export function Chevron({ open = true, size = 14, className = '' }: ChevronProps) {
  return (
    <Icon
      name="iconzhankaizhedie"
      size={size}
      className={`mm-chevron${open ? '' : ' mm-chevron--closed'}${className ? ` ${className}` : ''}`}
    />
  );
}
