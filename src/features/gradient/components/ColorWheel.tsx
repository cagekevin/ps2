/**
 * 渐变色环：两个端点拖点改色 + 当前过渡方式的路径预览。
 *
 * 分工：绘制与几何全在 `../wheel`（canvas 相关，不进 React）；本文件只做三件事——
 * 观测自己的盒子尺寸、把指针换算到画布坐标、把拖动结果交回调用方。
 *
 * **点 = 选中，拖 = 改色**：抓到端点按下时先不上色，指针真移动超过阈值才改。
 * 否则「点一下 02 想把它选成明度条的受控对象」会顺手把它的颜色挪到点击位置，
 * 差一格色就变了 —— 这是 mockup 阶段真踩到的坑。
 * 点在空白处是「取色」语义，按下即生效。
 *
 * **指针坐标不用 `getBoundingClientRect`**：`nativeEvent.offsetX/Y` 就是相对目标元素
 * 的内边距盒坐标，与 `clientWidth` 同一个参照系，少一次布局查询（`CONVENTIONS` §4.8
 * 也就没有第四个读锚点矩形的入口）。
 *
 * 无障碍：色环是纯视觉取色件，不放 `tabIndex`（画布上的拖拽焦点没有意义）；
 * 键盘用户走明度条与精度控件即可，canvas 只挂 `role="img"` + 说明。
 */

import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useElementSize } from '../../../hooks/useElementSize';
import { grabDot, paintWheel, pickColor, type WheelGeometry, type WheelModel } from '../wheel';
import './color-wheel.css';

interface Props {
  model: WheelModel;
  /** 拖动结果：`index` 0 = 起始色 01，1 = 结束色 02 */
  onChange: (index: 0 | 1, hex: string) => void;
  /** 受控端点换人（按下端点，或点空白处取色时那个更近的点） */
  onActiveChange: (index: 0 | 1) => void;
}

/** 拖动判定阈值（画布像素）：dpr=2 时约等于屏幕上的 1.5px，够容忍手抖又不妨碍轻拖 */
const DRAG_THRESHOLD = 3;
/** 认定「按在端点上」的半径（画布像素）：落在点附近就只切受控端点，不改色 */
const DOT_GRAB_RADIUS = 12;

export function ColorWheel({ model, onChange, onActiveChange }: Props) {
  const [hostRef, size] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const geometryRef = useRef<WheelGeometry | null>(null);
  const dragRef = useRef<{ index: 0 | 1; start: { x: number; y: number }; moved: boolean } | null>(null);

  const { first, second, route, active } = model;

  /* 任一项变了都要重画：盒子被拖宽、端点改色、过渡方式切换、受控端点换人 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;
    geometryRef.current = paintWheel(canvas, size.width, size.height, { first, second, route, active });
  }, [size.width, size.height, first, second, route, active]);

  /**
   * CSS 像素 → 画布像素。
   *
   * 画布像素是正方形，元素盒子是矩形，`object-fit: contain` 会把图按短边居中放——
   * 所以先减掉两侧（或上下）的留白，再按「正方形边长 / 画布像素」放大。
   * 漏掉留白这一步，宽面板里指针会整体偏移到环外。
   */
  function toCanvasPoint(event: ReactPointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = event.currentTarget;
    const boxWidth = canvas.clientWidth;
    const boxHeight = canvas.clientHeight;
    const side = Math.min(boxWidth, boxHeight);
    if (side === 0) return { x: 0, y: 0 };
    const left = (boxWidth - side) / 2;
    const top = (boxHeight - side) / 2;
    const scale = canvas.width / side;
    return {
      x: (event.nativeEvent.offsetX - left) * scale,
      y: (event.nativeEvent.offsetY - top) * scale
    };
  }

  function apply(index: 0 | 1, point: { x: number; y: number }): void {
    const geometry = geometryRef.current;
    if (!geometry) return;
    onChange(index, pickColor(geometry, index === 0 ? first : second, point));
  }

  return (
    <div className="mm-gradient__wheel" ref={hostRef}>
      <canvas
        className="mm-gradient__wheel-canvas"
        ref={canvasRef}
        role="img"
        aria-label="渐变色环：拖动 01 与 02 两个圆点改色，点在空白处取色"
        onPointerDown={(event) => {
          const geometry = geometryRef.current;
          if (!geometry) return;
          const point = toCanvasPoint(event);
          const index = grabDot(geometry, point);
          const dot = geometry.dots[index];
          const onDot = Math.hypot(dot.x - point.x, dot.y - point.y) <= DOT_GRAB_RADIUS * geometry.dpr;

          dragRef.current = { index, start: point, moved: false };
          onActiveChange(index);
          event.currentTarget.setPointerCapture(event.pointerId);
          /* 点空白 = 取色，按下即生效；按在端点上先只切受控端点，动了才改色 */
          if (!onDot) apply(index, point);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag) return;
          const point = toCanvasPoint(event);
          if (!drag.moved) {
            const geometry = geometryRef.current;
            const threshold = DRAG_THRESHOLD * (geometry ? geometry.dpr : 1);
            if (Math.hypot(point.x - drag.start.x, point.y - drag.start.y) < threshold) return;
            drag.moved = true;
          }
          apply(drag.index, point);
        }}
        onPointerUp={(event) => {
          dragRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      />
    </div>
  );
}
