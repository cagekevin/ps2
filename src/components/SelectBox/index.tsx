/**
 * 【唯一入口】下拉选择器 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
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
import { Portal } from '../Portal';
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
  /**
   * 面板底部固定内容（原版下拉的「添加当前图层字体」）。
   *
   * 传函数而不是节点：底部按钮点完通常要关面板，而关闭状态在本组件内部，
   * 调用方拿不到 `close`。用节点就得让调用方自己去猜关闭时机。
   */
  footer?: (close: () => void) => ReactNode;
  /**
   * 每项右侧的删除按钮（原版 `dropDowncom` 的 `therrSvg`）。
   * 删除不关闭面板、不选中该项——删除后由调用方刷新数据。
   */
  onRemove?: (value: string) => void;
  /**
   * 面板左右各缩进 10px、上间距 5px（原版 `.selectFont-dropDown`：
   * `width:calc(100% - 20px);left:10px;margin-top:5px`）。
   */
  inset?: boolean;
}

export function SelectBox({
  options,
  value,
  onChange,
  icon,
  arrowIcon = 'iconxiala',
  arrowSize = 12,
  className = '',
  disabled = false,
  footer,
  onRemove,
  inset = false
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

  /* 打开后定位，并把面板宽度对齐到触发器（宽度取自 hook 返回的锚点矩形，不自己量） */
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const panel = floatingRef.current;
    if (!trigger || !panel) return;

    const anchor = update(trigger);
    if (anchor) {
      panel.style.setProperty('--floating-width', `${Math.round(anchor.width)}px`);
    }
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
        ? <Portal>
            <div
              ref={floatingRef}
              className={`mm-select-box__panel${inset ? ' mm-select-box__panel--inset' : ''}`}
              role="listbox"
            >
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
                      className="mm-select-box__remove"
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
        : null}
    </>
  );
}
