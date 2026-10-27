/**
 * 【范本】UI 横切 · 加载
 * 异步任务统一用 useLoading().run() 包裹，页面不自己维护 loading 文案。
 * useLoading() 返回的引用是稳定的，可以放进 effect 依赖。
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import './Loading.css';

interface LoadingActions {
  show: () => void;
  hide: () => void;
  run: <T>(task: () => Promise<T>) => Promise<T>;
}

const ActionsContext = createContext<LoadingActions | null>(null);
const VisibleContext = createContext(false);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  const show = useCallback(() => setCount((prev) => prev + 1), []);
  const hide = useCallback(() => setCount((prev) => Math.max(0, prev - 1)), []);

  const run = useCallback(
    async <T,>(task: () => Promise<T>): Promise<T> => {
      setCount((prev) => prev + 1);
      try {
        return await task();
      } finally {
        setCount((prev) => Math.max(0, prev - 1));
      }
    },
    []
  );

  const actions = useMemo<LoadingActions>(() => ({ show, hide, run }), [show, hide, run]);
  const visible = count > 0;

  return (
    <ActionsContext.Provider value={actions}>
      <VisibleContext.Provider value={visible}>
        {children}
        {visible ? (
          <div className="mm-loading-mask">
            <span className="mm-loading-mask__text">处理中…</span>
          </div>
        ) : null}
      </VisibleContext.Provider>
    </ActionsContext.Provider>
  );
}

export function useLoading(): LoadingActions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error('useLoading 必须在 LoadingProvider 内使用');
  return actions;
}

export function useLoadingVisible(): boolean {
  return useContext(VisibleContext);
}
