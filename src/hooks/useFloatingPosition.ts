/**
 * 【范本】浮层定位
 *
 * 只负责算位置，不管开关、点外关闭、Esc（那些交给 useDismiss）。
 *
 * **全仓唯一取锚点矩形的地方**：调用方直接把元素交进来，
 * 不要自己 getBoundingClientRect() 再传 {x,y}——那样取矩形就有 N 个入口。
 *
 * 位置写进 CSS 变量 `--floating-x` / `--floating-y`，
 * 浮层自己的样式里用 `left: var(--floating-x)`，组件内不出现内联 style。
 */

import { useCallback, useRef, useState } from 'react';
import {
  computeFloatingPosition,
  type FloatingPlacement,
  type FloatingRect
} from './floating-position';

export type FloatingReference = HTMLElement | { x: number; y: number };

/** 元素 → 锚点矩形；鼠标坐标折成零尺寸矩形 */
export function anchorRect(reference: FloatingReference): FloatingRect {
  if ('getBoundingClientRect' in reference) {
    const rect = reference.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    };
  }
  return {
    left: reference.x,
    top: reference.y,
    right: reference.x,
    bottom: reference.y,
    width: 0,
    height: 0
  };
}

export interface FloatingOptions {
  placement?: FloatingPlacement;
  /** 浮层与锚点的间距 */
  offset?: number;
  /** 距视口边缘的最小留白 */
  padding?: number;
  /** 空间不够时是否翻到另一侧；下拉面板传 `false`（见 `FloatingPositionOptions.flip`） */
  flip?: boolean;
}

export function useFloatingPosition(options: FloatingOptions = {}) {
  /* 浮层都是 div，用具体类型才能直接挂到 <div ref> 上 */
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<FloatingPlacement>(
    options.placement ?? 'bottom-start'
  );

  const { placement: preferred, offset = 4, padding = 4, flip = true } = options;

  /**
   * 定位，并**返回锚点矩形**（`null` = 没定位，元素还没挂上）。
   *
   * 返回矩形是为了「面板宽度对齐触发器」这类需求：调用方拿 `rect.width` 设 CSS 变量即可，
   * 不要为了一个宽度再自己 `getBoundingClientRect()`——那会变成第二个测量入口。
   */
  const update = useCallback(
    (reference: FloatingReference | null): FloatingRect | null => {
      const floating = floatingRef.current;
      if (!reference || !floating) return null;

      const anchor = anchorRect(reference);
      const box = floating.getBoundingClientRect();
      const position = computeFloatingPosition(
        anchor,
        { width: box.width, height: box.height },
        { width: window.innerWidth, height: window.innerHeight },
        { placement: preferred ?? 'bottom-start', offset, padding, flip }
      );

      setPlacement(position.placement);
      floating.style.setProperty('--floating-x', `${position.left}px`);
      floating.style.setProperty('--floating-y', `${position.top}px`);
      return anchor;
    },
    [preferred, offset, padding, flip]
  );

  return { floatingRef, placement, update };
}
