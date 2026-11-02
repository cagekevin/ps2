/**
 * 批量文字弹窗：两个 tab（新建 / 改字），数据不共享。
 *
 * 为什么是本页私有组件而不是公共件：形状只服务这一处（tab + 原文表 + 一个大 textarea），
 * 两处以上再抽（`CONVENTIONS` §4.8）。遮罩直接用 `global.css` 的 `.mm-modal-mask`。
 *
 * 改字那半的交互只有三个按钮，从左到右：「OCR」识别当前画布并建层、「全部」读整个文档、
 * 「选中」读点按钮那一刻 PS 的选中集合。选择动作发生在 PS 里，面板不再给「当前」这一档。
 * OCR 排最左是因为它「产出一批新层」，与右边两个「读已有层」不是同一类动作。
 *
 * 原文表只干一件事：告诉用户「现在改的是哪一层」。所以一行 18 高、11 号字，
 * 编辑到哪一行就高亮哪一行 —— **高亮只在 `onChange` 里更新**，不挂在 click / keyup / select 上，
 * 也不调 `scrollIntoView`：输入框上只允许有一条数据链（`draft`），
 * 挂别的副作用会抢滚动与焦点，多图层时表现为「字打不进去」。
 */

import { useCallback, useRef, useState } from 'react';
import { Spin } from '../../../components/Spin';
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
  const [activeLine, setActiveLine] = useState(0);

  useDismiss(true, boxRef, onClose);

  /* 光标在第几行 → 高亮第几层（唯一写点，只由 onChange 调） */
  const syncActiveLine = useCallback((element: HTMLTextAreaElement) => {
    const before = element.value.slice(0, element.selectionStart ?? 0);
    setActiveLine((before.match(/\n/g) ?? []).length);
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
              {/* OCR 放最左：它是「产出一批新层」，与右边两个「读已有层」不是同一类动作 */}
              <Button
                variant="ghost"
                className="mm-text-batch__ocr"
                disabled={batch.busy !== null}
                title="识别当前画布上的文字，按坐标新建文字图层"
                onClick={batch.recognize}
              >
                {/* 识别要 3–10s：按钮里转圈（不铺全屏遮罩，弹窗还开着，铺了就是两层灰） */}
                {batch.busy === 'recognize' ? <Spin /> : 'OCR'}
              </Button>
              <Button
                variant="ghost"
                disabled={batch.busy !== null}
                onClick={() => batch.read('all')}
              >
                全部
              </Button>
              <Button
                variant="ghost"
                disabled={batch.busy !== null}
                onClick={() => batch.read('selection')}
              >
                选中
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
              <div className="mm-text-batch__list">
                {batch.layers.length === 0 ? (
                  <span className="mm-text-batch__empty">点「全部」或「选中」读取文字图层，或点「OCR」识别画布</span>
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
              onChange={(event) => {
                batch.changeDraft(event.target.value);
                syncActiveLine(event.currentTarget);
              }}
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
          <Button
            variant="primary"
            disabled={!batch.canConfirm || batch.busy !== null}
            onClick={batch.confirm}
          >
            确定
          </Button>
        </div>
      </div>
    </div>
  );
}
