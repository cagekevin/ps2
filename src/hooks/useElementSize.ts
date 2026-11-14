/**
 * 【范本】元素内容盒尺寸 —— 需要在 JS 里知道「我被排成多大」就调它。
 *
 * 【唯一入口】尺寸观测 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止再挂一个 observer。
 *
 * 什么时候需要：**画布类组件**（canvas 的像素缓冲必须按 CSS 尺寸 × dpr 分配，不然会糊）
 * 与自适应布局。判据是「CSS 算得出尺寸，但 JS 得拿到那个数字」。
 *
 * 为什么必须观测而不是渲一次读一次：PS 面板可以拖宽（200–360），拖的时候 React 不会重渲，
 * 只在 `useEffect` 里读一次的话，画布会一直按旧尺寸被 CSS 拉伸——看起来就是糊的。
 *
 * 为什么不用 `window.addEventListener('resize')`：`CONVENTIONS` §4.8 把全局监听锁在
 * `useDismiss` / `useShortcut` / `useNoContextMenu` 三个入口；而且面板内的元素尺寸变化
 * 不该依赖窗口事件（元素可能因为别的原因改尺寸）。`ResizeObserver` 只观测被它盯的元素。
 *
 * 为什么不用 `getBoundingClientRect`：那一个（含 `hooks/useFloatingPosition`）
 * 是「读锚点矩形做定位」的入口，带布局刷新开销；这里只要内容盒尺寸，`contentRect` 就够。
 *
 * 新增同类代码照此结构：观测 → 过滤亚像素抖动 → 卸载时 disconnect。
 */
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

interface ElementSize {
  width: number;
  height: number;
}

/** 观测元素的**内容盒**尺寸；返回 ref 与当前尺寸（首帧为 0×0，挂载后一帧内补齐） */
export function useElementSize<T extends HTMLElement>(): [RefObject<T>, ElementSize] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    /* 亚像素抖动不触发重渲：拖面板时尺寸常在小数位跳，重渲会把画布反复清空 */
    const report = (next: ElementSize): void => {
      setSize((current) =>
        Math.abs(current.width - next.width) < 0.5 && Math.abs(current.height - next.height) < 0.5 ? current : next
      );
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      report({ width: entry.contentRect.width, height: entry.contentRect.height });
    });

    observer.observe(element);
    /* 首帧：观察者要等下一次布局才回调，这里先给一次值，避免第一帧画在 0×0 上 */
    report({ width: element.clientWidth, height: element.clientHeight });

    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
