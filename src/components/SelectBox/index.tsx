/**
 * 【唯一入口】下拉选择器 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】下拉选择器。
 *
 * 不用原生 `<select>`：箭头是浏览器画的、面板样式不可控、
 * 选中项要在左侧打勾，原生没有那个位置。
 *
 * 右侧箭头固定渲染 `<Chevron>`（全仓唯一箭头件，不传 `open` 即恒朝下）；
 * **没有 `arrowIcon` / `arrowSize` 参数**——需要别的箭头就是第二种形状，按约定不许有。
 *
 * 面板 = `Portal` 挂 body（不被任何滚动容器裁）+ `.mm-popover`（`global.css` 里的浮层壳）。
 * **没有变体**：宽度只有一个值（触发器宽），位置只有一个来源（`useFloatingPosition`）。
 */
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useDismiss } from '../../hooks/useDismiss';
import { anchorRect, useFloatingPosition } from '../../hooks/useFloatingPosition';
import { Chevron } from '../Chevron';
import { Portal } from '../Portal';
import { Icon } from '../icons';
import './select-box.css';

export interface SelectBoxOption {
  value: string;
  label: string;
}

interface SelectBoxProps {
  options: SelectBoxOption[];
  value: string;
  onChange: (value: string) => void;
  /** 触发器左侧图标（仓库图标、字体图标这类） */
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
  /** 面板底部固定内容；传函数是为了让调用方能拿到 `close` */
  footer?: (close: () => void) => ReactNode;
  /** 每项右侧的删除按钮；给了才渲染 */
  onRemove?: (value: string) => void;
}

export function SelectBox({
  options,
  value,
  onChange,
  icon,
  className = '',
  disabled = false,
  footer,
  onRemove
}: SelectBoxProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  /* `flip: false`：下拉面板永远贴触发器左边、向下展开；放不下只夹取，不翻到另一侧 */
  const { floatingRef, update } = useFloatingPosition({
    placement: 'bottom-start',
    flip: false
  });

  const close = useCallback(() => setOpen(false), []);

  /* 面板挂 body、不在触发器子树里：两端都要声明为「内部」，否则点面板会被判成点外面 */
  useDismiss(open, floatingRef, close, { inside: () => [triggerRef.current] });

  /* 先定宽再定位：`update()` 会拿面板宽度做视口夹取，顺序反了位置就按旧宽度算 */
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const panel = floatingRef.current;
    if (!trigger || !panel) return;

    panel.style.width = `${Math.round(anchorRect(trigger).width)}px`;
    update(trigger);
  }, [open, update, floatingRef]);

  const current = options.find((option) => option.value === value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`mm-select-box__trigger mm-input-surface${className ? ` ${className}` : ''}`}
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {icon ? <span className="mm-select-box__icon">{icon}</span> : null}
        <span className="mm-select-box__label">{current?.label ?? ''}</span>
        <Chevron size={12} />
      </button>

      {open ? (
        <Portal>
          <div ref={floatingRef} className="mm-popover mm-select-box__panel" role="listbox">
            {options.map((option) => (
              <div
                key={option.value}
                role="option"
                tabIndex={0}
                aria-selected={option.value === value}
                className={`mm-select-box__item${
                  option.value === value ? ' mm-select-box__item--active' : ''
                }`}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  onChange(option.value);
                  close();
                }}
              >
                {option.value === value ? (
                  <Icon name="icongouxuan" size={12} className="mm-select-box__check" />
                ) : null}
                <span className="mm-select-box__item-label">{option.label}</span>
                {onRemove ? (
                  <button
                    type="button"
                    className="mm-btn mm-select-box__remove"
                    title="删除"
                    aria-label={`删除 ${option.label}`}
                    onClick={(event) => {
                      /* 删除不是选中：不能让点击冒泡到行的 onChange */
                      event.stopPropagation();
                      onRemove(option.value);
                    }}
                    onKeyDown={(event) => {
                      /* 焦点在删除钮上按 Enter / 空格，不能顺着冒泡把这一项也选中 */
                      if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
                    }}
                  >
                    <Icon name="iconshanchu" size={12} />
                  </button>
                ) : null}
              </div>
            ))}
            {footer ? footer(close) : null}
          </div>
        </Portal>
      ) : null}
    </>
  );
}
