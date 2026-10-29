/**
 * 【唯一入口】转圈 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】转圈加载指示器（照原版 `NewSpin.vue`）。
 *
 * 三种用法：
 *   <Spin />                        裸圈（嵌进按钮等小空间）
 *   <Spin tip="加载中…" />          圈 + 文案（竖排，圈在上）
 *   <Spin mask tip="…" />           局部遮罩：盖住最近的定位父级
 *
 * **全屏加载不要直接用 mask 模式**——用 `useLoading()`（LoadingProvider 的全屏遮罩），
 * 那是全屏加载的唯一入口；本组件的 mask 只给局部场景（列表内刷新之类）。
 */
import type { CSSProperties } from 'react';
import './spin.css';

export interface SpinProps {
  /** 圆环直径，默认 18px（原版默认值） */
  size?: number;
  /** 圈下方的提示文字 */
  tip?: string;
  /** 局部遮罩模式：absolute 铺满最近定位父级 */
  mask?: boolean;
}

export function Spin({ size = 18, tip, mask = false }: SpinProps) {
  return (
    <span className={`mm-spin${mask ? ' mm-spin--mask' : ''}`}>
      <span
        className="mm-spin__ring"
        style={{ '--mm-spin-size': `${size}px` } as CSSProperties}
      />
      {tip ? <span className="mm-spin__tip">{tip}</span> : null}
    </span>
  );
}
