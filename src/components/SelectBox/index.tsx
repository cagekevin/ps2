/**
 * 【范本】下拉选择器。
 *
 * 为什么不留原生 `<select>`：
 * 1. 箭头是浏览器画的，全仓无法统一（我们要用原版的 `iconxiala`）
 * 2. 原生下拉面板在 CEP 里样式不可控，弹层高度/高亮都和原版对不上
 * 3. 原版的选中项在左侧打勾（`icongouxuan`），原生 select 没有这个位置
 *
 * 对照原版 `SelectBox.vue`（app/src/components/SelectBox.vue）：
 * 触发器 28px 高、箭头固定朝下；面板宽度跟随触发器；当前项高亮 + 左侧打勾。
 *
 * 箭头与 `Chevron` 的区别：`Chevron` 是展开/折叠（会旋转），本组件的下拉箭头固定朝下。
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from '../../hooks/useDismiss';
import { useFloatingPosition } from '../../hooks/useFloatingPosition';
import { Icon, type IconName } from '../icons';
import './select-box.css';

export interface SelectBoxOption {
  value: string;
  label: string;
}

interface SelectBoxProps {
  options: SelectBoxOption[];
  value: string;
  onChange: (value: string) => void;
  /** 触发器左侧的图标（仓库图标等） */
  icon?: ReactNode;
  /**
   * 右侧箭头图标。
   * 默认 `iconxiala`（原版 SelectBox 的下拉箭头）。
   * 仓库条用 `iconzhankaizhedie` 10×10 —— 原版那里是「展开/折叠」箭头，不是下拉箭头。
   */
  arrowIcon?: IconName;
  arrowSize?: number;
  className?: string;
  disabled?: boolean;
}

export function SelectBox({
  options,
  value,
  onChange,
  icon,
  arrowIcon = 'iconxiala',
  arrowSize = 12,
  className = '',
  disabled = false
}: SelectBoxProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const { floatingRef, update } = useFloatingPosition({
    placement: 'bottom-start',
    offset: 4,
    padding: 8
  });

  const close = useCallback(() => setOpen(false), []);

  /* 面板被 portal 到 body，不在触发器子树里，两端都要声明为「内部」 */
  useDismiss(open, floatingRef, close, { inside: () => [triggerRef.current] });

  /* 打开后定位，并把面板宽度对齐到触发器 */
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const panel = floatingRef.current;
    if (!trigger || !panel) return;

    panel.style.setProperty('--floating-width', `${Math.round(trigger.getBoundingClientRect().width)}px`);
    update(trigger);
  }, [open, update, floatingRef]);

  const current = options.find((option) => option.value === value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`mm-select-box__trigger${className ? ` ${className}` : ''}`}
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {icon ? <span className="mm-select-box__icon">{icon}</span> : null}
        <span className="mm-select-box__label">{current?.label ?? ''}</span>
        <Icon name={arrowIcon} size={arrowSize} className="mm-select-box__arrow" />
      </button>

      {open
        ? createPortal(
            <div ref={floatingRef} className="mm-select-box__panel" role="listbox">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={`mm-select-box__item${
                    option.value === value ? ' mm-select-box__item--active' : ''
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    close();
                  }}
                >
                  {option.value === value ? (
                    <Icon name="icongouxuan" size={12} className="mm-select-box__check" />
                  ) : null}
                  <span className="mm-select-box__item-label">{option.label}</span>
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
