/**
 * 【范本】UI 横切 · 提示
 * 页面里禁止 alert，统一用 useToast()。
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import './Toast.css';

type ToastKind = 'info' | 'error';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  show: (message: string, kind?: ToastKind) => void;
  info: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DURATION = 2600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, DURATION);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      info: (message: string) => show(message, 'info'),
      error: (message: string) => show(message, 'error')
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="mm-toast">
        {items.map((item) => (
          <div key={item.id} className={`mm-toast__item mm-toast__item--${item.kind}`}>
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast 必须在 ToastProvider 内使用');
  return api;
}
