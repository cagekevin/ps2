/**
 * 【范本】滚动到底加载（全项目唯一滚动监听）。
 *
 * 用法：把返回的 callback ref 挂到列表末尾的哨兵元素上。
 * `root` 必须是**滚动容器**（列表本身），不是 window——面板里的滚动发生在容器内。
 *
 * 两个细节：
 * - 哨兵节点用 state 存：节点晚挂载 / 被筛选换掉时会重新 observe
 * - `onReach` 存 ref（React 最佳实践 `advanced-event-handler-refs`）：
 *   回调每次渲染都是新函数，放进依赖会反复重建 observer
 */
import { useEffect, useRef, useState, type RefObject } from 'react';

interface Options {
  /** 滚动容器 */
  root: RefObject<HTMLElement | null>;
  onReach: () => void;
  /** 没有更多数据时置 false，避免空转 */
  enabled?: boolean;
  rootMargin?: string;
}

export function useInfiniteScroll({
  root,
  onReach,
  enabled = true,
  rootMargin = '160px'
}: Options): (node: HTMLElement | null) => void {
  const reachRef = useRef(onReach);
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);

  useEffect(() => {
    reachRef.current = onReach;
  }, [onReach]);

  useEffect(() => {
    if (!enabled || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) reachRef.current();
      },
      { root: root.current, rootMargin }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, sentinel, root, rootMargin]);

  return setSentinel;
}
