/**
 * 【范本】文本输入框（原版 `baseInput`）
 *
 * 与 `components/ui` 的 `Input` 分工：`Input` 是不带宽度约定的基础形状，
 * 这里是「定宽 + 可选左图标 + Enter 提交」那一层。**内部渲染的就是 `Input`**，
 * 边框与圆角只有 `ui.css` 一份来源——不要在这里再画一套。
 *
 * 三档宽度用 `variant` 选（宽 80 / 一半减 5 / 70×30），**不接受裸 width**：
 * 原版这三套是按位置定的（`.inputcom1` / `.inputcom-2` / `.switch-input`），
 * 放开任意宽度只会让同一页的输入框对不齐。
 *
 * 提交时机：只在 Enter（原版 `@keyup.enter` → `inputSize`），**失焦不提交**；
 * 输入法选词时的 Enter 不算提交（判据在 `hooks/input-method-enter`）。
 */

import { enterSubmit } from '../../hooks/input-method-enter';
import { Icon, type IconName } from '../icons';
import { Input } from '../ui';
import './text-field.css';

type Variant = 'wide' | 'half' | 'compact' | 'fill';

interface Props {
  value: string;
  /** 每次输入都抛，草稿由调用方持有（受控组件） */
  onChange: (value: string) => void;
  /** Enter 提交；不传则 Enter 不做任何事 */
  onSubmit?: (value: string) => void;
  /**
   * 三档定宽（`wide` 80 / `half` 一半减 5 / `compact` 70×30），默认 `wide`；
   * `fill` 是「占满剩余宽度」，只给面板里的间距 / 宽度输入用（旁边还有按钮时不能定宽）。
   */
  variant?: Variant;
  /**
   * 必填：这批输入框都没有可见的文字标签（靠左侧图标表意），
   * 不传就等于把「这个框是干什么的」只留给眼睛；它同时当悬停提示与 `aria-label`
   */
  title: string;
  placeholder?: string;
  /** 左侧插槽图标（放大 / 缩小这类） */
  icon?: IconName;
  inputMode?: 'text' | 'decimal';
  disabled?: boolean;
}

/** 定宽输入框；Enter 提交 */
export function TextField({
  value,
  onChange,
  onSubmit,
  variant = 'wide',
  title,
  placeholder,
  icon,
  inputMode = 'text',
  disabled = false
}: Props) {
  return (
    <div className={`mm-text-field mm-text-field--${variant}`} title={title}>
      {icon ? (
        <span className="mm-text-field__icon">
          <Icon name={icon} size={14} />
        </span>
      ) : null}
      <Input
        className="mm-text-field__input"
        type="text"
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
        aria-label={title}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={enterSubmit(() => onSubmit?.(value))}
      />
    </div>
  );
}
