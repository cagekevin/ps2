/**
 * 【唯一入口】输入框外壳（左图标 / 右插槽 / Enter 提交，内部渲染 ui.Input） —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】文本输入框（原版 `baseInput`）
 *
 * 与 `components/ui` 的 `Input` 分工：`Input` 是输入位本身（表面 + 26 高），
 * 这里是「可选左图标 + 可选右插槽 + Enter 提交」那一层。**内部渲染的就是 `Input`**，
 * 边框与圆角只有 `ui.css` 一份来源——不要在这里再画一套。
 *
 * **宽度不在这里定**：外壳吃满所在容器（`flex: 1 1 auto`），一行放两个就各占一半。
 * 原版是每个位置一个宽度类（`.inputcom1` / `.inputcom-2`），那种「位置定宽」若真需要，
 * 由**那个页面的局部 css 给容器宽度**（`STYLE.md` §6.1 允许页面覆盖宽度），
 * 不许在本组件加档位 prop —— 档位会与容器宽度同时生效，一个概念两种写法。
 *
 * 提交时机：只在 Enter（原版 `@keyup.enter` → `inputSize`），**失焦不提交**；
 * 输入法选词时的 Enter 不算提交（判据在 `hooks/input-method-enter`）。
 */

import type { ReactNode } from 'react';
import { enterSubmit } from '../../hooks/input-method-enter';
import { Icon, type IconName } from '../icons';
import { Input } from '../ui';
import './text-field.css';

interface Props {
  value: string;
  /** 每次输入都抛，草稿由调用方持有（受控组件） */
  onChange: (value: string) => void;
  /** Enter 提交；不传则 Enter 不做任何事 */
  onSubmit?: (value: string) => void;
  /**
   * 必填：这批输入框都没有可见的文字标签（靠左侧图标表意），
   * 不传就等于把「这个框是干什么的」只留给眼睛；它同时当悬停提示与 `aria-label`
   */
  title: string;
  placeholder?: string;
  /** 左侧插槽图标（放大 / 缩小这类） */
  icon?: IconName;
  /**
   * 右侧插槽（原版 `baseInput` 的右图标位：选目录 / 选水印文件）。
   *
   * 必须留在这里：让页面自己拼「Input + 绝对定位图标」就是第二个输入框入口，
   * 描边 / 圆角 / 高度会在两处各写一遍。
   */
  rightSlot?: ReactNode;
  inputMode?: 'text' | 'decimal';
  disabled?: boolean;
}

/** 输入框外壳；Enter 提交 */
export function TextField({
  value,
  onChange,
  onSubmit,
  title,
  placeholder,
  icon,
  rightSlot,
  inputMode = 'text',
  disabled = false
}: Props) {
  return (
    <div className="mm-text-field" title={title}>
      {icon ? (
        <span className="mm-text-field__icon">
          <Icon name={icon} />
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
      {rightSlot ? <span className="mm-text-field__right">{rightSlot}</span> : null}
    </div>
  );
}
