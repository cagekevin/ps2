/**
 * 【范本】列表分片渲染（每页 30 + 触底追加）。
 *
 * 长列表禁止一次性渲染（`CONVENTIONS` §13）。
 *
 * `resetKey` 是筛选条件的字符串（关键词 / 标签 / 面板条件拼起来）：
 * 变了就回第一屏。**不用 `items` 的引用做判据**——页面若忘了 `useMemo`，
 * 每次渲染都是新数组，会把「加载更多」静默重置（React 最佳实践
 * `rerender-derived-state-no-effect`：派生状态在渲染期算，不放 effect）。
 */
import { useMemo, useState } from 'react';

const PAGE_SIZE = 30;

interface PagedState {
  key: string;
  limit: number;
}

export function usePagedList<T>(
  items: readonly T[],
  resetKey: string,
  pageSize: number = PAGE_SIZE
): {
  visible: T[];
  hasMore: boolean;
  loadMore: () => void;
} {
  const [paged, setPaged] = useState<PagedState>({ key: resetKey, limit: pageSize });

  /* 渲染期重置（React 官方「props 变化时调整 state」的写法），不用 effect 少一帧闪 */
  if (paged.key !== resetKey) {
    setPaged({ key: resetKey, limit: pageSize });
  }
  const limit = paged.key === resetKey ? paged.limit : pageSize;

  const visible = useMemo(() => items.slice(0, limit), [items, limit]);
  const hasMore = items.length > limit;

  function loadMore(): void {
    setPaged((current) =>
      current.key === resetKey
        ? { key: current.key, limit: Math.min(current.limit + pageSize, items.length) }
        : { key: resetKey, limit: pageSize }
    );
  }

  return { visible, hasMore, loadMore };
}
