/**
 * 【范本】模态弹窗的焦点陷阱 + 关闭后还原
 *
 * 两件事总是成对出现，所以放在一个 hook 里：
 *   1. 打开时记住当前焦点，关闭时还原——不回触发器，键盘用户就丢了位置
 *   2. Tab / Shift+Tab 只在容器内循环，不跑到遮罩后面的页面
 *
 * **只给模态弹窗用**。下拉面板、右键菜单、悬停浮层这类非模态浮层不要用：
 * 它们本来就不该困住焦点，套上以后 Tab 会出不去。
 *
 * 可聚焦元素的选择器与原先 `TagCreator` 内联的版本一致（`input` / 未禁用的 `button`）；
 * 要放宽（加 `a[href]` / `select` / `textarea`）先确认没有弹窗里塞了不可见元素。
 */

import { useEffect, useRef, type KeyboardEvent, type MutableRefObject } from 'react';

const FOCUSABLE = 'input, button:not(:disabled)';

export interface FocusTrap {
  /** 挂到弹窗根节点：焦点循环按它找元素，点外关闭也用它判内外 */
  containerRef: MutableRefObject<HTMLDivElement | null>;
  /** 挂到弹窗根节点的 `onKeyDown` */
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * `active`：弹窗常挂载、只切显隐时传 `open`（否则焦点只会在组件卸载时还原，
 * 关掉弹窗那次不还原）。条件渲染的弹窗不用传。
 */
export function useFocusTrap(active = true): FocusTrap {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    opener.current =
      typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null);
    const target = opener.current;
    return () => {
      target?.focus();
    };
  }, [active]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key !== 'Tab') return;

    const focusables = containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!focusables?.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return { containerRef, onKeyDown };
}
