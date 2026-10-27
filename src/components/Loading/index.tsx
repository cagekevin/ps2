/**
 * 【范本】UI 横切 · 加载
 *
 * **全屏加载的唯一入口**：异步任务统一 `useLoading().run(task, tip?)` 包裹，
 * 页面不自己维护 loading 状态、不自己渲染遮罩。
 *
 * 遮罩内容照原版 `GlobalLoading` + `NewSpin`：全屏半透明底 + 转圈 + 文案。
 * 支持嵌套（计数器）与文案栈：后进的 run 覆盖提示语，全部结束后遮罩才消失。
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Spin } from '../Spin';
import './Loading.css';

interface LoadingActions {
  /** 手动开一层；带文案时遮罩上会显示它 */
  show: (tip?: string) => void;
  hide: () => void;
  /** 包裹异步任务：开始时开一层，结束（无论成败）必关 */
  run: <T>(task: () => Promise<T>, tip?: string) => Promise<T>;
}

const ActionsContext = createContext<LoadingActions | null>(null);
const TipContext = createContext<string | null>(null);
const VisibleContext = createContext(false);

/** 无文案时的兜底提示 */
const DEFAULT_TIP = '处理中…';

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [tips, setTips] = useState<string[]>([]);

  const show = useCallback((tip?: string) => {
    setTips((prev) => [...prev, tip ?? DEFAULT_TIP]);
  }, []);

  const hide = useCallback(() => {
    setTips((prev) => prev.slice(0, -1));
  }, []);

  const run = useCallback(
    async <T,>(task: () => Promise<T>, tip?: string): Promise<T> => {
      show(tip);
      try {
        return await task();
      } finally {
        hide();
      }
    },
    [show, hide]
  );

  const actions = useMemo<LoadingActions>(() => ({ show, hide, run }), [show, hide, run]);
  const visible = tips.length > 0;
  /* 文案栈顶：嵌套时显示最内层的提示 */
  const tip = tips[tips.length - 1] ?? DEFAULT_TIP;

  return (
    <ActionsContext.Provider value={actions}>
      <TipContext.Provider value={tip}>
        <VisibleContext.Provider value={visible}>
          {children}
          {visible ? (
            <div className="mm-loading-mask">
              <Spin tip={tip} />
            </div>
          ) : null}
        </VisibleContext.Provider>
      </TipContext.Provider>
    </ActionsContext.Provider>
  );
}

export function useLoading(): LoadingActions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error('useLoading 必须在 LoadingProvider 内使用');
  return actions;
}
