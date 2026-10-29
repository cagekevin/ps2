/**
 * 【唯一入口】单选框 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】单选框（原版 `baseRadio`）
 *
 * 全仓唯一实现：不写裸 `<input type="radio">`（`CONVENTIONS` §6）。
 * 尺寸 12×12、右侧空 6、1px `--mm-color-border-control`、`50%` 正圆（`05-常用-尺寸与状态表` 实测）。
 *
 * `name` 必填：原生 radio 靠**同名**互斥。省掉它（或每项各起一个名字）两个选项
 * 就能同时选中，而界面看起来只是「两个小圆都亮了」。
 *
 * 选中态沿用本仓换色（官方是换成图标，属换皮肤，已登记 D-51，见 `03` 计划 §4.3 第 9 条）。
 */

import type { ChangeEvent } from 'react';
import './radio-button.css';

interface Props {
  label: string;
  /** 同组必须同名，否则不是互斥关系 */
  name: string;
  checked: boolean;
  /** 悬停提示；缺省不输出该属性 */
  title?: string;
  disabled?: boolean;
  onChange: () => void;
}

/** 一行「圆点 + 文字」，点击整行选中 */
export function RadioButton({ label, name, checked, title, disabled = false, onChange }: Props) {
  return (
    <label
      className={disabled ? 'mm-radio mm-radio--disabled' : 'mm-radio'}
      title={title}
    >
      <input
        type="radio"
        className="mm-radio__input"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          /* 只响应「选中」：取消选中由同组另一个选项接管，这里不抛 false */
          if (event.target.checked) onChange();
        }}
      />
      <span className="mm-radio__dot" aria-hidden="true" />
      <span className="mm-radio__label">{label}</span>
    </label>
  );
}
