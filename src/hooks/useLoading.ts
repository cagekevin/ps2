/**
 * 全屏加载的 hook 口。
 *
 * `useLoading()` 返回**模块级单例**，不读 context、不需要 Provider——`hooks/*` 依赖它不越界。
 * 容器（`components/Loading`）用 `useLoadingTips()` 订阅文案栈。
 */
import { useSyncExternalStore } from 'react';
import {
  DEFAULT_LOADING_TIP,
  getLoadingTips,
  loading,
  subscribeLoading
} from '../core/feedback/loading';
import type { LoadingActions } from '../core/feedback/loading';

export type { LoadingActions } from '../core/feedback/loading';
export { DEFAULT_LOADING_TIP };

/** 调用口：`loading.run(task)` / `loading.show(tip)` */
export function useLoading(): LoadingActions {
  return loading;
}

/** 容器口：文案栈（栈顶 = 当前提示，空 = 不显示遮罩） */
export function useLoadingTips(): readonly string[] {
  return useSyncExternalStore(subscribeLoading, getLoadingTips, getLoadingTips);
}
