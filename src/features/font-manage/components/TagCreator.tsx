/** 新建 / 重命名标签：居中弹窗 + 输入 + 取消/确定 */
import { useState } from 'react';
import { Portal } from '../../../components/Portal';
import { stopClickPropagation } from '../../../components/ui';
import { useDismiss } from '../../../hooks/useDismiss';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
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
  /* 模态弹窗：焦点陷阱与关闭后还原（规则在 hooks/useFocusTrap，不在组件里各写一遍） */
  const { containerRef, onKeyDown } = useFocusTrap();

  useDismiss(true, containerRef, onClose);

  async function submit(): Promise<void> {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(text.trim());
    } finally {
      setSubmitting(false);
    }
  }

  return <Portal>
    <div className="mm-font__modal-mask" onClick={onClose}>
      <div
        ref={containerRef}
        className="mm-font__modal"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? '新建标签' : '重命名标签'}
        onKeyDown={onKeyDown}
        onClick={stopClickPropagation}
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
    </div>
  </Portal>;
}
