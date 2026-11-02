/**
 * 批量文字弹窗：三个 tab（改全部 / 改选中 / OCR），一个输入框两种态。
 *
 * **没有「新建」tab**：`layers` 为空就是新建（每行建一层），非空就是替换（每行改对应层）。
 * 顶部一句话说明当前是哪一种，「清空」把图层清掉回到新建态。
 *
 * 为什么是本页私有组件而不是公共件：形状只服务这一处（tab + 原文表 + 一个大 textarea），
 * 两处以上再抽（`CONVENTIONS` §4.8）。遮罩直接用 `global.css` 的 `.mm-modal-mask`。
 *
 * 「改全部 / 改选中」点 tab 即读入对应范围；OCR 是独立动作（建层后不自动读取）。
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
import './TextBatchDialog.css';

type Tab = 'all' | 'selection' | 'ocr';

const TABS: readonly { value: Tab; label: string }[] = [
  { value: 'all', label: '改全部' },
  { value: 'selection', label: '改选中' },
  { value: 'ocr', label: 'OCR' }
];

interface TextBatchDialogProps {
  /** 新建时的首行字号：字体面板的层级第 1 档 */
  baseSize: number;
  onClose: () => void;
}

export function TextBatchDialog({ baseSize, onClose }: TextBatchDialogProps) {
  const batch = useTextBatch(baseSize, onClose);
  const boxRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [activeLine, setActiveLine] = useState(0);

  useDismiss(true, boxRef, onClose);

  /* 光标在第几行 → 高亮第几层（唯一写点，只由 onChange 调） */
  const syncActiveLine = useCallback((element: HTMLTextAreaElement) => {
    const before = element.value.slice(0, element.selectionStart ?? 0);
    setActiveLine((before.match(/\n/g) ?? []).length);
  }, []);

  /* 三个 tab 都是「点即执行」：改全部/改选中读入，OCR 直接识别并在成功后切回改全部 */
  function pickTab(next: Tab): void {
    setTab(next);
    if (next === 'ocr') {
      batch.recognize(() => {
        setTab('all');
        batch.read('all');
      });
      return;
    }
    batch.read(next);
  }

  /* 有图层 = 替换态，空 = 新建态 */
  const editing = batch.layers.length > 0;

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
        <div className="mm-tabs mm-text-batch__tabs" role="tablist" aria-label={'批量文字'}>
          {TABS.map((item) => (
            <div key={item.value} className="mm-tabs__cell">
              <button
                type="button"
                role="tab"
                aria-selected={item.value === tab}
                className={
                  item.value === tab ? 'mm-tabs__tab mm-tabs__tab--active' : 'mm-tabs__tab'
                }
                disabled={batch.busy !== null}
                onClick={() => pickTab(item.value)}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>

        {tab === 'ocr' ? (
          <div className="mm-text-batch__ocr-pane">
            <span className="mm-text-batch__ocr-title">
              {batch.busy === 'recognize' ? '正在识别…' : '识别当前画布上的文字'}
            </span>
            <span className="mm-text-batch__ocr-hint">
              导出画布 → 云端识别 → 按坐标新建文字层，完成后自动读入全部
            </span>
          </div>
        ) : (
          <>
            <div className="mm-text-batch__state">
              {editing ? (
                <>
                  <span>
                    已读入 <strong>{batch.layers.length}</strong> 层 · 每行替换对应层
                  </span>
                  <Button
                    variant="ghost"
                    className="mm-text-batch__state-clear"
                    disabled={batch.busy !== null}
                    onClick={batch.clear}
                  >
                    清空
                  </Button>
                </>
              ) : (
                <span>未读入图层 · 每行新建一层</span>
              )}
            </div>

            {editing ? (
              <>
                <div className="mm-text-batch__table">
                  <div className="mm-text-batch__row mm-text-batch__row--head">
                    <span className="mm-text-batch__no">#</span>
                    <span className="mm-text-batch__name">图层</span>
                    <span className="mm-text-batch__text">原文</span>
                  </div>
                  <div className="mm-text-batch__list">
                    {batch.layers.map((layer, index) => (
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
                    ))}
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
                  value={batch.draft}
                  spellCheck={false}
                  onChange={(event) => batch.changeDraft(event.target.value)}
                />
              </div>
            )}
          </>
        )}

        <div className="mm-text-batch__status">{batch.message}</div>

        <div className="mm-u-row mm-modal__actions">
          <Button onClick={onClose}>取消</Button>
          <Button
            variant="primary"
            disabled={tab === 'ocr' || !batch.canConfirm || batch.busy !== null}
            onClick={batch.confirm}
          >
            {tab === 'ocr' ? (
              batch.busy === 'recognize' ? <Spin /> : 'OCR'
            ) : editing ? (
              '写回'
            ) : (
              '新建'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
