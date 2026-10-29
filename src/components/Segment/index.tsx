/**
 * 本域（互斥档位 UI）以此为准：`src/components/Segment/index.tsx`，≤4 档并排看全一律用它，不许用 `Button` 拼一组。
 *
 * 【唯一入口】段选（并排互斥按钮组） —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】段选（原版 `.switch-wrap` + `.siwitch-context`）
 *
 * 什么时候用它（判据，别凭手感）：
 *   - **≤4 档、要并排看全**（JPG/PNG、PNG-24/8、导出方式）→ 段选；
 *   - 选项多 / 有列表语义 → `SelectBox`；逐项长文本、要能一次选全 → `RadioButton`。
 *
 * 与 `RadioButton` 的区别只是**形态**：这里是按钮组（一眼看全所有档），
 * 单选是两个独立圆点。两者都是互斥，不要因为它像按钮就拿 `Button` 拼一组——
 * 那样每个调用方都会自己判「哪个选中」，选中态颜色会分叉。
 *
 * 高度取 `--mm-control-h`（与同页输入框 / 按钮同一档）。原版本页是 50×30，
 * 30 会成为同页第三种控件高度，按 `CONVENTIONS` §7 规则 9 取唯一档（`13-常用-V2` §9 A-4）。
 */

import './segment.css';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  /** 悬停提示（原版 `title`） */
  title?: string;
}

interface Props<T extends string | number> {
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
  /** 必填：整组没有可见标签，缺了读屏只剩一串「JPG」「PNG」 */
  ariaLabel: string;
  disabled?: boolean;
}

/** 并排互斥的档位组；选中态用 `--mm-color-accent` */
export function Segment<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false
}: Props<T>) {
  return (
    <div
      className={disabled ? 'mm-segment mm-segment--disabled' : 'mm-segment'}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={checked}
            title={option.title}
            disabled={disabled}
            className={checked ? 'mm-segment__item mm-segment__item--on' : 'mm-segment__item'}
            onClick={() => {
              /* 点已选中的档不重复抛：调用方常在 onChange 里写盘，重复写会多一次 IO */
              if (!checked) onChange(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
