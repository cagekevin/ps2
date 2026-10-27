/** 新建 / 重命名标签：居中弹窗 + 输入 + 取消/确定 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from '../../../hooks/useDismiss';
import { TagInput } from './TagInput';

interface Props {
  mode: 'create' | 'rename';
  initial?: string;
  onSubmit: (value: string) => void | Promise<void>;
  onClose: () => void;
}

export function TagCreator({ mode, initial = '', onSubmit, onClose }: Props) {
  const [text, setText] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  /** 打开前的焦点，关闭后还原（不回触发器 = 键盘用户丢失位置） */
  const opener = useRef<HTMLElement | null>(
    typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null)
  );

  useDismiss(true, cardRef, onClose);

  useEffect(() => {
    const target = opener.current;
    return () => {
      target?.focus();
    };
  }, []);

  async function submit(): Promise<void> {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(text.trim());
    } finally {
      setSubmitting(false);
    }
  }

  /** 焦点陷阱：Tab / Shift+Tab 只在弹窗内循环，不跑到遮罩后的页面 */
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'Tab') return;

    const focusables = cardRef.current?.querySelectorAll<HTMLElement>(
      'input, button:not(:disabled)'
    );
    if (!focusables?.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div className="mm-font__modal-mask" onClick={onClose}>
      <div
        ref={cardRef}
        className="mm-font__modal"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? '新建标签' : '重命名标签'}
        onKeyDown={onKeyDown}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="mm-font__modal-title">{mode === 'create' ? '新建标签' : '重命名标签'}</p>
        <TagInput
          value={text}
          onChange={setText}
          onEnter={() => void submit()}
          variant="modal"
          placeholder="请输入标签名"
          maxLength={8}
          clearable={false}
          autoFocus
        />
        <div className="mm-font__modal-actions">
          <button
            type="button"
            className="mm-font__modal-btn"
            disabled={submitting}
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="mm-font__modal-btn mm-font__modal-btn--primary"
            disabled={!text.trim() || submitting}
            onClick={() => void submit()}
          >
            {submitting ? '处理中…' : '确定'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
