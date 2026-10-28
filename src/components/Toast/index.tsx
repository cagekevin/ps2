/**
 * 【范本】UI 横切 · 提示（**只渲染，不持有状态**）
 *
 * 状态在 `core/feedback/toast.ts`。这里只做两件事：订阅条目、渲染容器。
 *
 * 为什么状态搬走了：原来 `useState` 在这个文件里，于是 `hooks/useRunCommand` 想弹一句
 * 就必须 import `components/Toast` → `hooks ⇄ components` 越界（`CONVENTIONS` §3）。
 * 状态下沉 core 之后，`hooks` 依赖 core，方向恢复；本文件只保留渲染。
 *
 * `useToast` 仍从这里**再导出**：页面与 feature 的 import 一行不用改。
 */
import { useEffect, type ReactNode } from 'react';
import { mountToast } from '../../core/feedback/toast';
import { useToastItems } from '../../hooks/useToast';
import './Toast.css';

export { useToast } from '../../hooks/useToast';
export type { ToastApi, ToastItem, ToastKind } from '../../core/feedback/toast';

export function ToastProvider({ children }: { children: ReactNode }) {
  const items = useToastItems();

  /* 挂载登记：为 0 时 `showToast` 会留痕「消息未显示」，不静默吞掉 */
  useEffect(() => mountToast(), []);

  return (
    <>
      {children}
      <div className="mm-toast">
        {items.map((item) => (
          <div key={item.id} className={`mm-toast__item mm-toast__item--${item.kind}`}>
            {item.message}
          </div>
        ))}
      </div>
    </>
  );
}
