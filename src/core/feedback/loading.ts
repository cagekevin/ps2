/**
 * 全屏加载状态（**渲染层不持有状态**）。
 *
 * 与 `toast.ts` 同因：遮罩的状态原本在 `components/Loading` 的 `useState` 里，
 * 于是 `hooks/useRunCommand` 只能反向依赖 components。搬到这里之后 `hooks` 依赖 core，
 * 方向恢复正常，`useRunCommand` 也能脱离 React 上下文单测。
 *
 * 语义照原实现：`tips` 是**栈**，嵌套时显示最内层的提示，全部结束才隐藏。
 */
import { log } from '../logger';
import { createChannel, createMountGate } from './channel';

export interface LoadingActions {
  /** 手动开一层；带文案时遮罩上会显示它 */
  show: (tip?: string) => void;
  hide: () => void;
  /** 包裹异步任务：开始时开一层，结束（无论成败）必关 */
  run: <T>(task: () => Promise<T>, tip?: string) => Promise<T>;
}

/** 无文案时的兜底提示 */
export const DEFAULT_LOADING_TIP = '处理中…';

let tips: readonly string[] = [];

/** 订阅表与挂载计数由通道原语提供（与 `toast` 共用同一份实现） */
const channel = createChannel();
const gate = createMountGate();

export function subscribeLoading(listener: () => void): () => void {
  return channel.subscribe(listener);
}

export function getLoadingTips(): readonly string[] {
  return tips;
}

/** 容器挂载/卸载：为 0 时转圈不会出现，必须留痕 */
export function mountLoading(): () => void {
  return gate.mount();
}

function show(tip?: string): void {
  if (!gate.isMounted()) {
    /* 不静默：没有容器 = 用户看不到转圈，且界面会像「点了没反应」 */
    log.warn('加载遮罩容器未挂载，转圈不会显示', { tip: tip ?? DEFAULT_LOADING_TIP });
  }
  tips = [...tips, tip ?? DEFAULT_LOADING_TIP];
  channel.emit();
}

function hide(): void {
  tips = tips.slice(0, -1);
  channel.emit();
}

async function run<T>(task: () => Promise<T>, tip?: string): Promise<T> {
  show(tip);
  try {
    return await task();
  } finally {
    hide();
  }
}

export const loading: LoadingActions = { show, hide, run };
