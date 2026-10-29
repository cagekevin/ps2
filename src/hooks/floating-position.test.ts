import { describe, expect, it } from 'vitest';
import { computeFloatingPosition, type FloatingRect } from './floating-position';

const VIEWPORT = { width: 1000, height: 800 };

function rect(left: number, top: number, width = 40, height = 20): FloatingRect {
  return { left, top, right: left + width, bottom: top + height, width, height };
}

describe('computeFloatingPosition', () => {
  it('空间足够时按 bottom-start 展开', () => {
    const result = computeFloatingPosition(rect(100, 100), { width: 200, height: 100 }, VIEWPORT, {
      placement: 'bottom-start',
      offset: 4,
      padding: 4
    });
    expect(result).toEqual({ left: 100, top: 124, placement: 'bottom-start' });
  });

  it('下方空间不足时翻到上方', () => {
    const result = computeFloatingPosition(rect(100, 740), { width: 200, height: 100 }, VIEWPORT, {
      placement: 'bottom-start',
      offset: 4,
      padding: 4
    });
    expect(result.placement).toBe('top-start');
    expect(result.top).toBe(636);
  });

  it('右侧空间不足时翻到 end', () => {
    const result = computeFloatingPosition(rect(900, 100), { width: 200, height: 100 }, VIEWPORT, {
      placement: 'bottom-start',
      offset: 4,
      padding: 4
    });
    expect(result.placement).toBe('bottom-end');
    expect(result.left).toBe(740);
  });

  it('flip=false 时不翻到另一侧，且不留视口边距（下拉面板必须与触发器左对齐）', () => {
    /* 与上一条同参数，只关掉 flip：仍按 start 起算，然后夹到视口内——但不再留 padding，
       否则通栏触发器（右边缘贴视口）的面板会被整体往左推 */
    const result = computeFloatingPosition(rect(900, 100), { width: 200, height: 100 }, VIEWPORT, {
      placement: 'bottom-start',
      offset: 4,
      padding: 4,
      flip: false
    });
    expect(result.placement).toBe('bottom-start');
    expect(result.left).toBe(VIEWPORT.width - 200);
  });

  it('flip=false 时通栏触发器（右边缘贴视口）面板不平移', () => {
    /* 触发器 0 宽 800、视口 800：面板与触发器同宽 800，左边必须是 0 */
    const result = computeFloatingPosition(rect(0, 10, 800, 30), { width: 800, height: 100 }, VIEWPORT, {
      placement: 'bottom-start',
      offset: 4,
      padding: 8,
      flip: false
    });
    expect(result.left).toBe(0);
  });

  it('flip=false 时下方放不下也不翻到上方，只夹进视口', () => {
    const result = computeFloatingPosition(rect(100, 740), { width: 200, height: 100 }, VIEWPORT, {
      placement: 'bottom-start',
      offset: 4,
      padding: 4,
      flip: false
    });
    expect(result.placement).toBe('bottom-start');
    expect(result.top).toBe(VIEWPORT.height - 100);
  });

  it('水平翻转后仍超出时夹取到边距内，垂直未超出则不动', () => {
    /* 右边缘 1030 超出视口 1000，翻到 end 后 left=730 仍超 696，被夹到 696 */
    const result = computeFloatingPosition(rect(990, 790), { width: 300, height: 200 }, VIEWPORT, {
      placement: 'bottom-start',
      offset: 4,
      padding: 4
    });
    expect(result.left).toBe(696);
    /* 垂直翻到上方后 top=586，落在 [4,596] 内，不夹取 */
    expect(result.top).toBe(586);
    expect(result.placement).toBe('top-end');
  });

  it('上方空间不足时翻到下方', () => {
    /* 锚点贴顶：上方只剩 -6px，翻到下方 top = bottom(22) + offset(4) = 26 */
    const result = computeFloatingPosition(rect(100, 2), { width: 200, height: 100 }, VIEWPORT, {
      placement: 'top-start',
      offset: 4,
      padding: 4
    });
    expect(result.placement).toBe('bottom-start');
    expect(result.top).toBe(26);
  });

  it('浮层比视口还大时保证左上角在边距内', () => {
    const result = computeFloatingPosition(rect(500, 400), { width: 2000, height: 2000 }, VIEWPORT, {
      placement: 'bottom-start',
      offset: 4,
      padding: 4
    });
    expect(result.left).toBe(4);
    expect(result.top).toBe(4);
  });

  it('结果取整，不出现小数', () => {
    const result = computeFloatingPosition(rect(10.6, 10.4), { width: 100.3, height: 50.7 }, VIEWPORT, {
      placement: 'bottom-start',
      offset: 4,
      padding: 4
    });
    expect(Number.isInteger(result.left)).toBe(true);
    expect(Number.isInteger(result.top)).toBe(true);
  });
});
