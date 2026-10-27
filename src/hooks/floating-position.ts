/**
 * 【范本】浮层定位的纯函数（零 DOM 依赖，可单测）
 *
 * 规则：
 * 1. 优先按 placement 展开；
 * 2. 水平方向空间不够时翻到另一侧；
 * 3. 垂直方向空间不够时翻到另一侧；
 * 4. 翻转后仍超出视口，则夹取到视口内；
 * 5. 浮层比视口大时，只保证左上角在边距内，尺寸由调用方 max-width/max-height 限制。
 */

export type FloatingPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

export interface FloatingRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface FloatingSize {
  width: number;
  height: number;
}

export interface FloatingViewport {
  width: number;
  height: number;
}

export interface FloatingPositionOptions {
  placement: FloatingPlacement;
  offset: number;
  padding: number;
}

export interface FloatingPosition {
  left: number;
  top: number;
  placement: FloatingPlacement;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function computeFloatingPosition(
  reference: FloatingRect,
  floating: FloatingSize,
  viewport: FloatingViewport,
  options: FloatingPositionOptions
): FloatingPosition {
  const { offset, padding } = options;
  const [preferredVertical, preferredHorizontal] = options.placement.split('-') as [
    'top' | 'bottom',
    'start' | 'end'
  ];

  let vertical = preferredVertical;
  if (preferredVertical === 'bottom') {
    const below = viewport.height - padding - (reference.bottom + offset);
    const above = reference.top - offset - padding;
    if (floating.height > below && above > below) vertical = 'top';
  } else {
    const above = reference.top - offset - padding;
    const below = viewport.height - padding - (reference.bottom + offset);
    if (floating.height > above && below > above) vertical = 'bottom';
  }

  let horizontal = preferredHorizontal;
  if (preferredHorizontal === 'start') {
    if (reference.left + floating.width > viewport.width - padding) horizontal = 'end';
  } else if (reference.right - floating.width < padding) {
    horizontal = 'start';
  }

  let left = horizontal === 'start' ? reference.left : reference.right - floating.width;
  let top =
    vertical === 'bottom' ? reference.bottom + offset : reference.top - floating.height - offset;

  left = clamp(left, padding, viewport.width - padding - floating.width);
  top = clamp(top, padding, viewport.height - padding - floating.height);

  return {
    left: Math.round(left),
    top: Math.round(top),
    placement: `${vertical}-${horizontal}` as FloatingPlacement
  };
}
