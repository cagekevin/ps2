/**
 * 【范本】命令式确认弹窗。
 *
 * 受控 `Confirm` 组件的问题是「容易忘记渲染」——少写一行 JSX 就是静默删数据。
 * 这里改成 `await` 形式，调用方拿不到「忘记渲染」这个错误选项：
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: '删除这一项？' }))) return;
 *
 * 全局只有一个弹窗实例（`ConfirmHost`，挂在 Layout 上），后到的请求覆盖先到的——
 * 同时弹两个确认框没有意义，用户也点不过来。
 */
import { useCallback, useEffect, useReducer } from 'react';
import { Confirm } from './index';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** 确认按钮文案，默认「删除」 */
  confirmText?: string;
}

interface PendingRequest extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

let pending: PendingRequest | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

/** 返回一个 `await` 形式的确认函数：true = 用户点了确认 */
export function useConfirm() {
  return useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      /* 上一个还没答完就被覆盖：按取消处理，避免 Promise 永远挂着 */
      pending?.resolve(false);
      pending = { ...options, resolve };
      notify();
    });
  }, []);
}

/** 全局宿主：挂在 Layout 上，全项目只渲染一次 */
export function ConfirmHost() {
  const [, force] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);

  if (!pending) return null;

  const current = pending;

  function settle(ok: boolean) {
    const request = current;
    pending = null;
    request.resolve(ok);
    notify();
  }

  return (
    <Confirm
      open
      title={current.title}
      message={current.message}
      confirmText={current.confirmText}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );
}
