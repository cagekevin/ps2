/**
 * 「保存到样式」弹窗：名称 + 目标分组 + 当前渐变预览。
 *
 * 结构照 `features/font-manage/components/TagCreator.tsx`（同一个 `.mm-modal` 壳、
 * 同一套焦点陷阱与点外关闭）——弹窗壳是 `STYLE` §6.2 的 CSS 契约，行为由
 * `useFocusTrap` + `useDismiss` 两个 hook 给，页面不各写一份。
 *
 * 分包不是「表单组件」：它只收「用户填了什么」并把结果交回调用方，
 * 校验（能不能存、存哪）在页面与命令层。
 */

import { useState } from 'react';
import { Portal } from '../../../components/Portal';
import { Button, Input, stopClickPropagation } from '../../../components/ui';
import { SelectBox, type SelectBoxOption } from '../../../components/SelectBox';
import { useDismiss } from '../../../hooks/useDismiss';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { MSG } from '../../../types/messages';
import './save-dialog.css';

interface Props {
  /** 当前渐变的 CSS 值，直接贴一条预览条 */
  preview: string;
  groups: SelectBoxOption[];
  onSave: (name: string, groupIndex: number) => void | Promise<void>;
  onClose: () => void;
}

export function SaveDialog({ preview, groups, onSave, onClose }: Props) {
  const [name, setName] = useState<string>(MSG.gradient.defaultName);
  const [groupIndex, setGroupIndex] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const { containerRef, onKeyDown } = useFocusTrap();

  useDismiss(true, containerRef, onClose);

  async function submit(): Promise<void> {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSave(name.trim() || MSG.gradient.defaultName, Number(groupIndex));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Portal>
      <div className="mm-modal-mask" onClick={onClose}>
        <div
          ref={containerRef}
          className="mm-u-col mm-modal"
          role="dialog"
          aria-modal="true"
          aria-label={MSG.gradient.saveTitle}
          onKeyDown={onKeyDown}
          onClick={stopClickPropagation}
        >
          <div className="mm-modal__title">{MSG.gradient.saveTitle}</div>
          {/* 内容走 `.mm-modal__body`（壳的一部分），组内间距 8 由页面私有类给；
              字段行照 `features/common/components/panel.css` 的先例：定宽 label 左列 + 内容右列。
              **不用 `<label>` 包 `SelectBox`** —— 那是把按钮塞进 label，点击会被 label 抢走 */}
          <div className="mm-u-col mm-modal__body mm-gradient__form">
            <div className="mm-gradient__save-preview" style={{ '--mm-swatch': preview } as React.CSSProperties} />
            <div className="mm-gradient__field">
              <span className="mm-gradient__field-label">{MSG.gradient.nameLabel}</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
            </div>
            <div className="mm-gradient__field">
              <span className="mm-gradient__field-label">{MSG.gradient.groupLabel}</span>
              <SelectBox options={groups} value={groupIndex} onChange={setGroupIndex} />
            </div>
          </div>
          <div className="mm-u-row mm-modal__actions">
            <Button disabled={submitting} onClick={onClose}>
              取消
            </Button>
            <Button variant="primary" disabled={submitting || groups.length === 0} onClick={() => void submit()}>
              {submitting ? '保存中…' : '保存'}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
