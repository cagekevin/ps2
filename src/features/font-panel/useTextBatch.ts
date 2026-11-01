/**
 * 批量文字弹窗的状态与动作（`features` 层，只调 commands 与 domain）。
 *
 * 四个状态：`layers`（读到的层）/ `draft`（改字的 textarea）/ `createDraft`（新建的 textarea）/
 * `notice`（动作留下的那句话）。**不建 store**：进弹窗读、关掉即弃。
 *
 * 两个 tab 的数据不共享：改字那份 `draft` 与新建那份 `createDraft` 各存各的，
 * 切 tab 不互相灌值（上一版 mockup 在这里把两条链接成一根管子，切一次就丢字）。
 *
 * **默认落在「改字」**：OCR 的产出是画布上的层，用户下一步几乎一定是改错字；
 * 新建是纯手输，进来再切一次的成本比反过来高。
 *
 * 「识别」是改字页的第三个动作：建层后**不自动读取**——层已经在画布上，
 * 想改字就点「全部」/「选中」，不替用户决定读哪一批。
 */

import { useCallback, useState } from 'react';
import { useToast } from '../../components/Toast';
import { ocrToLayers } from '../../commands/ocr';
import { createTexts, readTexts, writeDraft } from '../../commands/text-batch';
import type { TextScope } from '../../commands/text-batch';
import { log } from '../../core/logger';
import {
  buildPatches,
  parseCreateLines,
  type TextLayerSnapshot
} from '../../domain/text-batch';
import { MSG } from '../../types/messages';
import type { Result } from '../../types/result';

export type TextBatchMode = 'create' | 'edit';

/**
 * 正在跑哪个动作：**一个字段，不是两个布尔**。
 *
 * 分开记（`busy` + `recognizing`）会让「哪些按钮禁用」与「哪个按钮转圈」变成两个真相，
 * 总有一个先忘。判别位只有这一个，界面照它取值：
 *   `'recognize'` ⇒ OCR 按钮里显示转圈；其余 ⇒ 只禁用。
 */
export type TextBatchBusy = 'read' | 'recognize' | 'confirm' | null;

export interface TextBatchState {
  mode: TextBatchMode;
  layers: TextLayerSnapshot[];
  draft: string;
  createDraft: string;
  /** 动作留下的那句话（读失败 / 有层没写成）；校验失败的话由 `validation` 现算 */
  message: string;
  /** 确定按钮能不能点 */
  canConfirm: boolean;
  busy: TextBatchBusy;
  pickMode: (next: TextBatchMode) => void;
  read: (scope: TextScope) => void;
  /** 识别当前画布 → 按坐标建层（建完不自动读取，见文件头） */
  recognize: () => void;
  changeDraft: (value: string) => void;
  changeCreateDraft: (value: string) => void;
  confirm: () => void;
}

export function useTextBatch(baseSize: number, onClose: () => void): TextBatchState {
  const [mode, setMode] = useState<TextBatchMode>('edit');
  const [layers, setLayers] = useState<TextLayerSnapshot[]>([]);
  const [draft, setDraft] = useState('');
  const [createDraft, setCreateDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<TextBatchBusy>(null);
  const toast = useToast();

  const pickMode = useCallback((next: TextBatchMode) => {
    setMode(next);
    setNotice('');
  }, []);

  /**
   * 跑一个动作：**无论成败都清 `busy`**。
   *
   * 漏了收尾就是「按钮永远转圈」：命令层不抛是契约，但网络层（`new URL` / `require`）、
   * 以及任何未来加进来的 `await` 都可能 reject，`.then` 不接就永远等不到 `setBusy(null)`。
   * 所以收尾只写这一处（`finally`），四个动作都走它。
   */
  const settle = useCallback(
    <T,>(task: Promise<Result<T>>, onResult: (result: Result<T>) => void): void => {
      void task
        .then(onResult)
        .catch((error: unknown) => {
          /* 走到这里说明命令层违约抛了：留痕 + 说一句，绝不让转圈卡死 */
          log.error('批量文字动作抛出异常', { error });
          setNotice(MSG.codeReason.UNKNOWN);
        })
        .finally(() => setBusy(null));
    },
    []
  );

  const read = useCallback(
    (scope: TextScope) => {
      setBusy('read');
      settle(readTexts(scope), (result) => {
        if (result.status === 'error') {
          setNotice(result.reason);
          return;
        }
        setLayers(result.value.layers);
        setDraft(result.value.draft);
        setNotice('');
      });
    },
    [settle]
  );

  const recognize = useCallback(() => {
    if (busy !== null) return;
    setBusy('recognize');
    /* 导出 + 上传 + 识别 + 建层，3–10s：按钮里转圈，状态行同时说一句（两处都是同一件事的不同载体） */
    setNotice(MSG.ocr.recognizing);
    settle(ocrToLayers(), (result) => {
      if (result.status === 'error') {
        setNotice(result.reason);
        return;
      }
      /* 只报「建好了」：层在画布上，读哪一批由用户点「全部」/「选中」决定 */
      setNotice(MSG.ocr.created);
      /* 两种「部分成功」各自补一句，不合并成一句（用户要修的东西不同） */
      if (result.value.fontMissing) toast.info(MSG.fontMissing);
      if (result.value.dropped > 0) toast.info(MSG.ocr.dropped);
    });
  }, [busy, settle, toast]);

  const changeDraft = useCallback((value: string) => {
    setDraft(value);
    setNotice('');
  }, []);

  const changeCreateDraft = useCallback((value: string) => {
    setCreateDraft(value);
    setNotice('');
  }, []);

  const confirm = useCallback(() => {
    if (busy !== null) return;
    setBusy('confirm');

    if (mode === 'edit') {
      settle(writeDraft(layers, draft), (result) => {
        if (result.status === 'error') {
          setNotice(result.reason);
          return;
        }
        if (result.value.failed > 0) {
          setNotice(MSG.textBatch.writePartial);
          return;
        }
        onClose();
      });
      return;
    }

    settle(createTexts(createDraft, baseSize), (result) => {
      if (result.status === 'error') {
        setNotice(result.reason);
        return;
      }
      /* 字体缺失时层已经建好：不拦流程，关窗前说一句就够 —— 字体本身归字体面板改 */
      if (result.value.fontMissing) toast.info(MSG.fontMissing);
      onClose();
    });
  }, [busy, mode, layers, draft, createDraft, baseSize, onClose, toast, settle]);

  /* 派生值渲染期算（不拿 state 存）：行数校验与「改了几行」都只依赖 layers + draft */
  const patches = mode === 'edit' ? buildPatches(layers, draft) : null;
  const validation = patches && patches.status === 'error' ? patches.reason : '';
  const changed = patches && patches.status === 'ok' ? patches.value.length : 0;
  const canConfirm =
    mode === 'edit' ? changed > 0 : parseCreateLines(createDraft).length > 0;

  return {
    mode,
    layers,
    draft,
    createDraft,
    message: validation || notice,
    canConfirm,
    busy,
    pickMode,
    read,
    recognize,
    changeDraft,
    changeCreateDraft,
    confirm
  };
}
