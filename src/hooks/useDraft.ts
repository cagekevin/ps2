/**
 * 【范本】受控草稿（输入框里的本地值）
 *
 * 这套写法原本在三个组件里各写一遍（数字框 / 层级编辑 / 生成按钮）：
 *   - 外部值变了（切图层、重新读回）→ 草稿整份换成新值
 *   - 用户正在输入 → 草稿不动，不被外部刷新打断
 *
 * 用**渲染期比较 + 调整 state**，不用 `useEffect`：effect 版会先渲染旧值、再同步一次、
 * 再渲染新值，等于多一帧还可能闪（React 最佳实践 `rerender-derived-state-no-effect`）。
 *
 * `build` 只在「源变了」或「主动 reset」时调用，传内联箭头函数不会造成多余重置。
 */

import { useState } from 'react';

export interface Draft<D> {
  /** 输入框当前显示的值 */
  draft: D;
  /** 改草稿（支持函数式更新，用于数组这类结构） */
  setDraft: (next: D | ((current: D) => D)) => void;
  /** 丢掉草稿，回到源值 */
  resetDraft: () => void;
}

/**
 * `source` 用**内容**而不是引用做比较（调用方可以传 `list.join(',')` 这类投影），
 * 否则父级每次渲染新建的数组都会把用户输入冲掉。
 */
export function useDraft<S, D>(source: S, build: (source: S) => D): Draft<D> {
  /* 惰性初始化：`build` 可能是一次 map / split，挂载那次不该白算一遍再丢弃 */
  const [state, setState] = useState(() => ({ source, draft: build(source) }));
  if (state.source !== source) setState({ source, draft: build(source) });

  const setDraft = (next: D | ((current: D) => D)) => {
    setState((current) => ({
      ...current,
      draft: typeof next === 'function' ? (next as (value: D) => D)(current.draft) : next
    }));
  };

  const resetDraft = () => setState({ source, draft: build(source) });

  return { draft: state.draft, setDraft, resetDraft };
}
