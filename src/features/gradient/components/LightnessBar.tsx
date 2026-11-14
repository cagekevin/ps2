/**
 * 明度条（色轮右侧那根竖条）：只改**亮度** L，色相与浓度不动。
 *
 * 为什么需要它：色轮是 L 切片的二维圆盘（角度 = 色相、半径 = 浓度），亮度被抽出去当常量，
 * 所以单靠色环**永远拖不出深色** —— 往圆心拉只会得到同亮度的灰。这根条补的就是缺的那一维。
 *
 * 为什么条上的渐变要按当前端点的 h/C 现算：这样拖到哪个高度，拿到的就是你看见的那个颜色，
 * 不是一条无关的参考色带。
 *
 * 键盘可用（`role="slider"`）：↑/↓ 一档、PageUp/PageDown 十档、Home/End 到两端。
 * 只吃 `offsetY` 换算，不读锚点矩形（`CONVENTIONS` §4.8）。
 */

import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { lchOf, lchToHex } from '../../../domain/gradient';
import './lightness-bar.css';

interface Props {
  /** 当前受控端点的颜色；条的色阶与手柄位置都由它算 */
  hex: string;
  /** 拖出/按键得到的新颜色（只改了 L） */
  onChange: (hex: string) => void;
}

/** 色阶取 21 档：够平滑，又不至于每次重渲拼上千段 */
const RAMP_STEPS = 20;

export function LightnessBar({ hex, onChange }: Props) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const { l, c, h } = lchOf(hex);

  /* 条上的色阶 = 这个色相/浓度下的明度阶梯（下暗上亮）。`--mm-swatch` 是 STYLE §14.1 的运行时值通道 */
  const ramp = `linear-gradient(to top, ${Array.from({ length: RAMP_STEPS + 1 })
    .map((_, index) => {
      const at = index / RAMP_STEPS;
      return `${lchToHex(at * 100, c, h)} ${(at * 100).toFixed(0)}%`;
    })
    .join(', ')})`;

  /** 只换亮度：L 交出去，h/C 沿用当前值（新建色域的收敛交给 `lchToHex` 的 §13.2 收色） */
  function commit(nextL: number): void {
    onChange(lchToHex(Math.min(100, Math.max(0, nextL)), c, h));
  }

  function lightnessFromEvent(event: ReactPointerEvent<HTMLDivElement>): number {
    const bar = event.currentTarget;
    const height = bar.clientHeight;
    if (height === 0) return l;
    /* 上 = 亮（L=100）、下 = 暗（L=0） */
    return (1 - Math.min(1, Math.max(0, event.nativeEvent.offsetY / height))) * 100;
  }

  return (
    <div
      ref={barRef}
      className="mm-gradient__lightness"
      style={
        {
          '--mm-swatch': ramp,
          '--mm-lightness-pct': `${Math.min(100, Math.max(0, l))}%`
        } as React.CSSProperties
      }
      role="slider"
      tabIndex={0}
      aria-label="明度"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(l)}
      title={`明度 ${Math.round(l)}`}
      onPointerDown={(event) => {
        draggingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        commit(lightnessFromEvent(event));
      }}
      onPointerMove={(event) => {
        if (!draggingRef.current) return;
        commit(lightnessFromEvent(event));
      }}
      onPointerUp={(event) => {
        draggingRef.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
      onKeyDown={(event) => {
        const step = event.key === 'PageUp' || event.key === 'PageDown' ? 10 : 1;
        if (event.key === 'ArrowUp' || event.key === 'PageUp') {
          event.preventDefault();
          commit(l + step);
        } else if (event.key === 'ArrowDown' || event.key === 'PageDown') {
          event.preventDefault();
          commit(l - step);
        } else if (event.key === 'Home') {
          event.preventDefault();
          commit(0);
        } else if (event.key === 'End') {
          event.preventDefault();
          commit(100);
        }
      }}
    >
      <span className="mm-gradient__lightness-thumb" />
    </div>
  );
}
