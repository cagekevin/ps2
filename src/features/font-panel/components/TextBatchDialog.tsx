/**
 * 批量文字弹窗：两个 tab（新建 / 改字），数据不共享。
 *
 * 为什么是本页私有组件而不是公共件：形状只服务这一处（tab + 原文表 + 一个大 textarea），
 * 两处以上再抽（`CONVENTIONS` §4.8）。遮罩直接用 `global.css` 的 `.mm-modal-mask`。
 *
 * 改字那半的交互只有两个按钮：「全部」读整个文档，「读取」读点按钮那一刻 PS 的选中集合。
 * 选择动作发生在 PS 里，面板不再给「全部 / 选中 / 当前」三档。
 *
 * 原文表只干一件事：告诉用户「现在改的是哪一层」。所以一行 18 高、11 号字，
 * 光标动到哪一行，哪一行整行高亮并滚进可视区（单向，不绑 scrollTop）。
 */

import { useCallback, useRef, useState } from 'react';
import { Button, Textarea, stopClickPropagation } from '../../../components/ui';
import { encodeLayers } from '../../../domain/text-batch';
import { useDismiss } from '../../../hooks/useDismiss';
import { useTextBatch } from '../useTextBatch';
import type { TextBatchMode } from '../useTextBatch';
import './TextBatchDialog.css';

const MODES: readonly { value: TextBatchMode; label: string }[] = [
  { value: 'create', label: '新建' },
  { value: 'edit', label: '改字' }
];

interface TextBatchDialogProps {
  /** 新建时的首行字号：字体面板的层级第 1 档 */
  baseSize: number;
  onClose: () => void;
}

export function TextBatchDialog({ baseSize, onClose }: TextBatchDialogProps) {
  const batch = useTextBatch(baseSize, onClose);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [activeLine, setActiveLine] = useState(0);

  useDismiss(true, boxRef, onClose);

  /* 光标在第几行 → 高亮第几层，并把它滚进可视区（只单向，不做双向 scrollTop 同步） */
  const syncActiveLine = useCallback((element: HTMLTextAreaElement) => {
    const before = element.value.slice(0, element.selectionStart ?? 0);
    const line = (before.match(/\n/g) ?? []).length;
    setActiveLine(line);
    const row = listRef.current?.children[line];
    if (row instanceof HTMLElement) row.scrollIntoView({ block: 'nearest' });
  }, []);

  return (
    <div className="mm-modal-mask" onClick={onClose}>
      <div
        ref={boxRef}
        className="mm-modal mm-u-col mm-text-batch"
        role="dialog"
        aria-modal="true"
        aria-label={'批量文字'}
        onClick={stopClickPropagation}
      >
        <div className="mm-u-row mm-modal__head">
          <div className="mm-tabs mm-text-batch__tabs" role="tablist" aria-label={'批量文字'}>
            {MODES.map((item) => (
              <div key={item.value} className="mm-tabs__cell">
                <button
                  type="button"
                  role="tab"
                  aria-selected={item.value === batch.mode}
                  className={
                    item.value === batch.mode
                      ? 'mm-tabs__tab mm-tabs__tab--active'
                      : 'mm-tabs__tab'
                  }
                  onClick={() => batch.pickMode(item.value)}
                >
                  {item.label}
                </button>
              </div>
            ))}
          </div>

          {batch.mode === 'edit' ? (
            <div className="mm-u-row mm-text-batch__tools">
              <Button variant="ghost" disabled={batch.busy} onClick={() => batch.read('all')}>
                全部
              </Button>
              <Button variant="ghost" disabled={batch.busy} onClick={() => batch.read('selection')}>
                读取
              </Button>
            </div>
          ) : null}
        </div>

        {batch.mode === 'edit' ? (
          <>
            <div className="mm-text-batch__table">
              <div className="mm-text-batch__row mm-text-batch__row--head">
                <span className="mm-text-batch__no">#</span>
                <span className="mm-text-batch__name">图层</span>
                <span className="mm-text-batch__text">原文</span>
              </div>
              <div className="mm-text-batch__list" ref={listRef}>
                {batch.layers.length === 0 ? (
                  <span className="mm-text-batch__empty">点「全部」或「读取」读取文字图层</span>
                ) : (
                  batch.layers.map((layer, index) => (
                    <div
                      key={layer.id}
                      className={
                        index === activeLine
                          ? 'mm-text-batch__row mm-text-batch__row--active'
                          : 'mm-text-batch__row'
                      }
                    >
                      <span className="mm-text-batch__no">{index + 1}</span>
                      <span className="mm-text-batch__name" title={layer.name}>
                        {layer.name}
                      </span>
                      <span className="mm-text-batch__text" title={layer.text}>
                        {encodeLayers([layer])}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Textarea
              className="mm-text-batch__draft"
              value={batch.draft}
              spellCheck={false}
              onChange={(event) => batch.changeDraft(event.target.value)}
              onClick={(event) => syncActiveLine(event.currentTarget)}
              onKeyUp={(event) => syncActiveLine(event.currentTarget)}
              onSelect={(event) => syncActiveLine(event.currentTarget)}
            />
          </>
        ) : (
          <div className="mm-u-col mm-text-batch__create">
            <span className="mm-text-batch__label">每行一个文字图层</span>
            <Textarea
              className="mm-text-batch__draft"
              value={batch.createDraft}
              spellCheck={false}
              onChange={(event) => batch.changeCreateDraft(event.target.value)}
            />
          </div>
        )}

        <div className="mm-text-batch__status">{batch.message}</div>

        <div className="mm-u-row mm-modal__actions">
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={!batch.canConfirm || batch.busy} onClick={batch.confirm}>
            确定
          </Button>
        </div>
      </div>
    </div>
  );
}
