/**
 * 提示条的 hook 口。
 *
 * `useToast()` 返回**模块级单例**，不读 context、不需要 Provider——所以 `hooks/*` 可以安全
 * 依赖它（`hooks` 只许依赖 core / domain / types）。
 *
 * 容器（`components/Toast`）用 `useToastItems()` 订阅要渲染的条目。
 */
import { useSyncExternalStore } from 'react';
import { getToastItems, subscribeToast, toast } from '../core/feedback/toast';
import type { ToastApi, ToastItem } from '../core/feedback/toast';

export type { ToastApi, ToastItem, ToastKind } from '../core/feedback/toast';

/** 调用口：`toast.info(...)` / `toast.error(...)` */
export function useToast(): ToastApi {
  return toast;
}

/** 容器口：当前要显示的条目 */
export function useToastItems(): readonly ToastItem[] {
  return useSyncExternalStore(subscribeToast, getToastItems, getToastItems);
}
