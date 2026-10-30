/**
 * 【唯一入口】二次确认弹窗 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】确认弹窗
 *
 * 删除这类不可撤销操作必须二次确认，不要用 window.confirm（CEP 里样式不可控、阻塞主线程）。
 * 关闭走 useDismiss：点遮罩关闭 + Esc 关闭。
 * 焦点走 useFocusTrap：Tab 只在弹窗内循环，关掉后回到触发它的按钮。
 */

import { useDismiss } from '../../hooks/useDismiss';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { Button } from '../ui';

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
  /* 常挂载只切显隐，所以要把 `open` 交给焦点陷阱，否则关掉时焦点不还原 */
  const { containerRef, onKeyDown } = useFocusTrap(open);

  useDismiss(open, containerRef, onCancel);

  if (!open) return null;

  return (
    <div className="mm-modal-mask">
      <div
        className="mm-u-col mm-modal"
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={onKeyDown}
      >
        <div className="mm-modal__title">{title}</div>
        {message ? <div className="mm-modal__body">{message}</div> : null}
        <div className="mm-u-row mm-modal__actions">
          <Button onClick={onCancel}>取消</Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
