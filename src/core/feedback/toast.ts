/**
 * 提示条状态（**渲染层不持有状态**）。
 *
 * 为什么在 `core` 而不是 `components`：`hooks/*` 要给用户一句话，但 `hooks` 不许依赖
 * `components`（`CONVENTIONS` §3 依赖方向）。状态放渲染层的结果是 `useRunCommand` 反向
 * import `components/Toast`，`hooks ⇄ components` 越界——这条越界又逼出了「13 处手写
 * `toast.error`」那个下游症状（不想转圈的调用方只能绕过 hook）。
 *
 * 这里零 React：状态 + 订阅 + API，容器挂载时 `mountToast()` 登记。
 * **未挂载不静默**：消息没人渲染 = 用户看不到，`showToast` 必须留痕。
 */
import { newId } from '../../types/id';
import { log } from '../logger';
import { createChannel, createMountGate } from './channel';

export type ToastKind = 'info' | 'error';

export interface ToastItem {
  /** 只当 React key 与移除时的相等比较用；由 `domain/id` 的 `newId()` 给（全仓唯一生成入口） */
  id: string;
  kind: ToastKind;
  message: string;
}

export interface ToastApi {
  show: (message: string, kind?: ToastKind) => void;
  info: (message: string) => void;
  error: (message: string) => void;
}

const DURATION = 2600;

let items: readonly ToastItem[] = [];

/** 订阅表与挂载计数由通道原语提供（与 `loading` 共用同一份实现） */
const channel = createChannel();
const gate = createMountGate();

export function subscribeToast(listener: () => void): () => void {
  return channel.subscribe(listener);
}

export function getToastItems(): readonly ToastItem[] {
  return items;
}

/** 容器挂载/卸载：只服务于「这句话有人接吗」的留痕判断 */
export function mountToast(): () => void {
  return gate.mount();
}

function show(message: string, kind: ToastKind = 'info'): void {
  if (!gate.isMounted()) {
    /* 不静默：没有容器 = 这句话用户看不到，必须在日志里留痕 */
    log.warn('提示条容器未挂载，消息未显示', { kind, message });
  }

  const id = newId();
  items = [...items, { id, kind, message }];
  channel.emit();

  window.setTimeout(() => {
    items = items.filter((item) => item.id !== id);
    channel.emit();
  }, DURATION);
}

export const toast: ToastApi = {
  show,
  info: (message: string) => show(message, 'info'),
  error: (message: string) => show(message, 'error')
};
