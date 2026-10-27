/**
 * 【范本】展开 / 折叠箭头。
 *
 * 原版用 `iconzhankaizhedie`（一个向下的 chevron），靠 CSS `rotate(-90deg)` 表示收起态：
 * - 展开 = 0°
 * - 收起 = -90°（转成朝右）
 *
 * **不要用文本字符 `▾` / `▸`**：字形随系统字体变化，不同机器上粗细和高度不一样。
 *
 * 用途区分（原版就是两个图标，不能混）：
 * - 展开/折叠 → 本组件（`iconzhankaizhedie`）
 * - 下拉选择 → `SelectBox` 里的 `iconxiala`
 */
import { Icon } from '../icons';
import './chevron.css';

export interface ChevronProps {
  /** 展开中 = true（箭头朝下）；收起 = false（转成朝右） */
  open: boolean;
  size?: number;
  className?: string;
}

export function Chevron({ open, size = 14, className = '' }: ChevronProps) {
  return (
    <Icon
      name="iconzhankaizhedie"
      size={size}
      className={`mm-chevron${open ? '' : ' mm-chevron--closed'}${className ? ` ${className}` : ''}`}
    />
  );
}
