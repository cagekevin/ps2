/**
 * 【唯一入口】基础控件（Button / Input / Textarea / Field） —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】基础 UI 组件
 * 唯一 UI 出口。页面不要自己写按钮/输入框样式，直接用这里。
 * 样式全部走 Token，禁止在页面里重复定义。
 *
 * **下拉选择不在这里**：用 `components/SelectBox`。原生 `<select>` 的箭头是浏览器画的，
 * 全仓无法统一，且原版选中项左侧要打勾——原生 select 没有那个位置。
 *
 * **输入框只有这一个渲染入口**：`TextField` 是「左图标 + 右插槽 + Enter 提交」的外壳（宽度吃满容器），
 * 内部仍然渲染这里的 `Input`；字体面板、弹窗、标签输入、就地编辑也都是 `<Input>` + 各自的
 * 布局类（只覆盖宽度/间距这类局部值）。新写页面时不要直接 `<input>`。
 */
import { forwardRef } from 'react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes
} from 'react';
import './ui.css';

/* ---------------- Button ---------------- */

/**
 * 按钮变体**闭合在类型里**：写错变体编译失败，不用去翻 `ui.css`。
 *
 * - **不传 = 实心灰底**（绝大多数：抽屉动作、弹窗取消/确定、数值档位、九宫格预设）
 * - `ghost` = 透明无底，只给底栏图标按钮与行内小动作（旁边已经有底的场合）
 * - `primary` = 蓝底，一行里唯一的主操作
 * - `danger` = 红字，不可逆动作的确认
 *
 * 判据见 `STYLE.md` §6 的「按钮」行：原版截图里凡是成块的按钮都是灰底实心。
 */
export type ButtonVariant = 'ghost' | 'primary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * 全仓按钮的唯一渲染入口。
 * `forwardRef` 是必须的：下拉触发器、弹出层锚点都要拿真实 DOM 节点算位置，
 * 不支持 ref 时那些地方只能退回手写按钮标签 + 自己拼类名 —— 那就成了第二个入口。
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, className = '', type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`mm-btn${variant ? ` mm-btn--${variant}` : ''} ${className}`.trim()}
      {...rest}
    />
  );
});

/* ---------------- Input ---------------- */

/**
 * 输入框形状只有一套：`ui.css` 的 `.mm-input` / `.mm-input-surface`（26 高、
 * `--mm-color-bg-input` 底、`--mm-color-border` 描边）。
 *
 * **没有 `variant`**：底色 / 文字色按**所在表面**走，由表面声明 `--mm-input-bg` /
 * `--mm-input-color`（页面 / 抽屉 / 浅色浮层三档，`STYLE.md` §7 规则 15 + 规则 19）。
 * 原 `default` / `page` 两档共用同一套表面、`page` 档零规则，属没有视觉效果的开关，已删。
 * 要分第二种表面先改 `ui.css`，调用点不许写边框 / 底色 / 圆角（`STYLE.md` §6.1）。
 */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, className = '', ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={`mm-input${invalid ? ' mm-input--invalid' : ''} ${className}`.trim()}
      {...rest}
    />
  );
});

/* ---------------- Textarea ---------------- */

/**
 * 多行输入的唯一渲染入口。
 *
 * 表面与 `Input` 同一套（`--mm-input-bg` / `--mm-input-color`，按所在表面走），
 * **高度不在这里定**：多行框能多高由承载它的弹窗决定，页面用局部类给 `flex` 或固定高。
 * `resize` 也不在这里开：拉伸与否属于那个页面的交互，不属于控件形状。
 */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid = false, className = '', ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={`mm-textarea${invalid ? ' mm-textarea--invalid' : ''} ${className}`.trim()}
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
