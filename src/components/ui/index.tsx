/**
 * 【唯一入口】基础控件（Button / Input / Field） —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】基础 UI 组件
 * 唯一 UI 出口。页面不要自己写按钮/输入框样式，直接用这里。
 * 样式全部走 Token，禁止在页面里重复定义。
 *
 * **下拉选择不在这里**：用 `components/SelectBox`。原生 `<select>` 的箭头是浏览器画的，
 * 全仓无法统一，且原版选中项左侧要打勾——原生 select 没有那个位置。
 *
 * **输入框只有这一个渲染入口**：`TextField` 是「定宽 + 左图标 + Enter 提交」的外壳，
 * 内部仍然渲染这里的 `Input`；字体面板、弹窗、标签输入、就地编辑也都是 `<Input>` + 各自的
 * 布局类（只覆盖宽度/间距这类局部值）。新写页面时不要直接 `<input>`。
 */
import { forwardRef } from 'react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode
} from 'react';
import './ui.css';

/* ---------------- Button ---------------- */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
}

export function Button({ variant = 'ghost', className = '', type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={`mm-btn mm-btn--${variant} ${className}`.trim()} {...rest} />;
}

/* ---------------- Input ---------------- */

/**
 * 输入框形状，只两档：
 *   `default` 基础（24 高、页面底、边框 `--mm-color-border`）
 *   `page`    页内深色（26 高、`--mm-color-input-page` 底）——字体面板、输入弹窗、层级编辑共用
 *
 * 两档都只改「表面」，宽度与间距由调用方的布局类给，避免每个页面各画一套边框。
 */
export type InputVariant = 'default' | 'page';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  variant?: InputVariant;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { variant = 'default', invalid = false, className = '', ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={`mm-input mm-input--${variant}${invalid ? ' mm-input--invalid' : ''} ${className}`.trim()}
      {...rest}
    />
  );
});

/* ---------------- 公共 handler ---------------- */

/**
 * 点面板本体时别冒泡到遮罩（遮罩的 `onClick` 是「关闭」）。
 *
 * 三个弹层原先各写一遍 `onClick={(event) => event.stopPropagation()}`；
 * 收成一个具名常量，读代码时能直接看出「这句是挡关闭」。
 */
export function stopClickPropagation(event: { stopPropagation: () => void }): void {
  event.stopPropagation();
}

/* ---------------- Field ---------------- */

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="mm-u-col mm-field">
      <span className="mm-field__label">{label}</span>
      {children}
      {hint ? <span className="mm-field__hint">{hint}</span> : null}
    </label>
  );
}
