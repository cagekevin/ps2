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
import { log } from '../logger';

export type ToastKind = 'info' | 'error';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

export interface ToastApi {
  show: (message: string, kind?: ToastKind) => void;
  info: (message: string) => void;
  error: (message: string) => void;
}

const DURATION = 2600;

/** 自增 key：同毫秒连发两条也不会撞（原先是 `Date.now() + Math.random()`，全仓第二套 id 生成方式） */
let nextId = 0;
let items: readonly ToastItem[] = [];

/** 已挂载的容器数：为 0 时消息没人渲染，必须留痕 */
let mounted = 0;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeToast(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToastItems(): readonly ToastItem[] {
  return items;
}

/** 容器挂载/卸载：只服务于「这句话有人接吗」的留痕判断 */
export function mountToast(): () => void {
  mounted += 1;
  return () => {
    mounted -= 1;
  };
}

function show(message: string, kind: ToastKind = 'info'): void {
  if (!mounted) {
    /* 不静默：没有容器 = 这句话用户看不到，必须在日志里留痕 */
    log.warn('提示条容器未挂载，消息未显示', { kind, message });
  }

  nextId += 1;
  const id = nextId;
  items = [...items, { id, kind, message }];
  emit();

  window.setTimeout(() => {
    items = items.filter((item) => item.id !== id);
    emit();
  }, DURATION);
}

export const toast: ToastApi = {
  show,
  info: (message: string) => show(message, 'info'),
  error: (message: string) => show(message, 'error')
};
