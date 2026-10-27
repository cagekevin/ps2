/**
 * 【范本】勾选框（原版 `baseCheck`）
 *
 * 全仓唯一实现：`components/**` 与 `features/**` 一律 import 这里，
 * 不写裸 `<input type="checkbox">`（`CONVENTIONS` §6）。
 *
 * 尺寸取 `05-常用-尺寸与状态表` 的本页实测值：12×12、右侧空 6、1px `#707070`、圆角 3。
 * 字体面板原先是 14×14 + 间距 8，上移时按定案统一成 12（`03` 计划 §4.5 记了这处 2px 变化）。
 *
 * 用原生 input：键盘可达、专注态免费。**不要改成自绘 div**——那要自己补
 * `role` / `tabIndex` / 空格键，漏一个就是无障碍缺陷。
 */

import type { ChangeEvent } from 'react';
import './check-box.css';

interface Props {
  label: string;
  checked: boolean;
  /** 悬停提示；缺省不输出该属性 */
  title?: string;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

/** 一行「方框 + 文字」，点击整行切换 */
export function CheckBox({ label, checked, title, disabled = false, onChange }: Props) {
  return (
    <label className={disabled ? 'mm-check mm-check--disabled' : 'mm-check'} title={title}>
      <input
        type="checkbox"
        className="mm-check__input"
        checked={checked}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)}
      />
      <span className="mm-check__box" aria-hidden="true" />
      <span className="mm-check__label">{label}</span>
    </label>
  );
}
