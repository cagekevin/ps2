/**
 * 【范本】确认弹窗
 *
 * 删除这类不可撤销操作必须二次确认，不要用 window.confirm（CEP 里样式不可控、阻塞主线程）。
 * 关闭走 useDismiss：点遮罩关闭 + Esc 关闭。
 */

import { useRef } from 'react';
import { useDismiss } from '../../hooks/useDismiss';
import './confirm.css';

interface ConfirmProps {
  open: boolean;
  title: string;
  message?: string;
  /** 确认按钮文案 */
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function Confirm({ open, title, message, confirmText = '删除', onConfirm, onCancel }: ConfirmProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useDismiss(open, panelRef, onCancel);

  if (!open) return null;

  return (
    <div className="mm-confirm__mask">
      <div className="mm-confirm" ref={panelRef} role="dialog" aria-modal="true">
        <p className="mm-confirm__title">{title}</p>
        {message ? <p className="mm-confirm__message">{message}</p> : null}
        <div className="mm-confirm__actions">
          <button type="button" className="mm-confirm__btn" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="mm-confirm__btn mm-confirm__btn--danger"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
