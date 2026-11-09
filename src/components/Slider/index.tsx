/**
 * 【唯一入口】滑杆 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】连续数值参数：标签 + 右端数值 + 轨道 + 圆点。
 *
 * 为什么不是数字输入框：滑杆表达的是「当前值在范围内**的相对位置**」——
 * `-1.00` 的圆点贴着左端、`1.00` 落在中间偏右，一眼能看出离边界多远；
 * 数字框只能给绝对值，看不出范围。同一组六个参数并排时这个差别尤其明显。
 *
 * 用原生 `input[type=range]`：键盘可达、方向键步进、读屏有值，全部免费。
 * 自绘 div 要自己补 role / tabIndex / 按键处理，漏一个就是无障碍缺陷（`CONVENTIONS` §6）。
 */

import type { CSSProperties } from 'react';
import './slider.css';

interface Props {
  /** 必填：滑杆没有独立可见标签，读屏要靠它 */
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function Slider({ label, value, min, max, step, onChange, disabled = false }: Props) {
  /* 运行时算出的比例交 CSS 变量决定怎么用（§14.1），JS 不碰视觉值 */
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className="mm-slider" style={{ '--mm-slider-pct': `${percent}%` } as CSSProperties}>
      <div className="mm-u-row mm-slider__head">
        <span className="mm-slider__label">{label}</span>
        {/* 两位小数：原版同款，且右端对齐不会因 1.5 / 1.50 左右跳动 */}
        <span className="mm-slider__value">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        className="mm-slider__input"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
