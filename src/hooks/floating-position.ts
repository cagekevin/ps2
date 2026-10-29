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

/** 每个 placement 的两个轴：查表而不是拆字符串断言，新增 placement 时这里会编译报错 */
const PLACEMENT_PARTS: Record<FloatingPlacement, ['top' | 'bottom', 'start' | 'end']> = {
  'top-start': ['top', 'start'],
  'top-end': ['top', 'end'],
  'bottom-start': ['bottom', 'start'],
  'bottom-end': ['bottom', 'end']
};

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
  /**
   * 空间不够时是否翻到另一侧。
   *
   * - `true`（默认）：右键菜单这类「跟着指针走」的浮层，翻过去才不会出界。
   * - `false`：下拉面板。它必须贴着触发器左边、向下展开——翻了就会出现
   *   「面板左边比触发器多一截、右边却对齐」的错位。放不下只做夹取，不翻转。
   */
  flip?: boolean;
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
  const { offset, padding, flip = true } = options;
  const [preferredVertical, preferredHorizontal] = PLACEMENT_PARTS[options.placement];

  let vertical = preferredVertical;
  let horizontal = preferredHorizontal;

  if (flip) {
    if (preferredVertical === 'bottom') {
      const below = viewport.height - padding - (reference.bottom + offset);
      const above = reference.top - offset - padding;
      if (floating.height > below && above > below) vertical = 'top';
    } else {
      const above = reference.top - offset - padding;
      const below = viewport.height - padding - (reference.bottom + offset);
      if (floating.height > above && below > above) vertical = 'bottom';
    }

    if (preferredHorizontal === 'start') {
      if (reference.left + floating.width > viewport.width - padding) horizontal = 'end';
    } else if (reference.right - floating.width < padding) {
      horizontal = 'start';
    }
  }

  let left = horizontal === 'start' ? reference.left : reference.right - floating.width;
  let top =
    vertical === 'bottom' ? reference.bottom + offset : reference.top - floating.height - offset;

  /**
   * 夹取时留多少边。
   *
   * `flip: true`（跟着指针走的菜单）要留 `padding`，否则贴边太丑。
   * `flip: false`（下拉面板）**必须留 0**：它的宽度等于触发器宽，而触发器常常就是通栏的
   * （左边缘贴容器、右边缘贴视口）。再要求「离视口边 8」就等于把面板整体往左推——
   * 这就是「面板左边多出一截、右边却对齐」的真正来源，与翻转无关。
   */
  const edge = flip ? padding : 0;

  left = clamp(left, edge, viewport.width - edge - floating.width);
  top = clamp(top, edge, viewport.height - edge - floating.height);

  return {
    left: Math.round(left),
    top: Math.round(top),
    placement: `${vertical}-${horizontal}`
  };
}
