/**
 * 【范本】全局 Provider
 * 新增 UI 横切（如 Confirm）在这里挂载，页面不自己包 Provider。
 */
import type { ReactNode } from 'react';
import { LoadingProvider } from '../components/Loading';
import { ToastProvider } from '../components/Toast';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <LoadingProvider>{children}</LoadingProvider>
    </ToastProvider>
  );
}
