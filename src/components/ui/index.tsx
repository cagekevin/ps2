/**
 * 【范本】基础 UI 组件
 * 唯一 UI 出口。页面不要自己写按钮/输入框样式，直接用这里。
 * 样式全部走 Token，禁止在页面里重复定义。
 *
 * **下拉选择不在这里**：用 `components/SelectBox`。原生 `<select>` 的箭头是浏览器画的，
 * 全仓无法统一，且原版选中项左侧要打勾——原生 select 没有那个位置。
 */
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

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ invalid = false, className = '', ...rest }: InputProps) {
  return <input className={`mm-input ${invalid ? 'mm-input--invalid' : ''} ${className}`.trim()} {...rest} />;
}

/* ---------------- Field ---------------- */

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="mm-field">
      <span className="mm-field__label">{label}</span>
      {children}
      {hint ? <span className="mm-field__hint">{hint}</span> : null}
    </label>
  );
}
