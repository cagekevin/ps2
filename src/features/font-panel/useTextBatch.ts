/**
 * 批量文字弹窗的状态与动作（`features` 层，只调 commands 与 domain）。
 *
 * 四个状态：`layers`（读到的层）/ `draft`（改字的 textarea）/ `createDraft`（新建的 textarea）/
 * `notice`（动作留下的那句话）。**不建 store**：进弹窗读、关掉即弃。
 *
 * 两个 tab 的数据不共享：改字那份 `draft` 与新建那份 `createDraft` 各存各的，
 * 切 tab 不互相灌值（上一版 mockup 在这里把两条链接成一根管子，切一次就丢字）。
 */

import { useCallback, useState } from 'react';
import { useToast } from '../../components/Toast';
import { createTexts, readTexts, writeDraft } from '../../commands/text-batch';
import type { TextScope } from '../../commands/text-batch';
import {
  buildPatches,
  parseCreateLines,
  type TextLayerSnapshot
} from '../../domain/text-batch';
import { MSG } from '../../types/messages';

export type TextBatchMode = 'create' | 'edit';

export interface TextBatchState {
  mode: TextBatchMode;
  layers: TextLayerSnapshot[];
  draft: string;
  createDraft: string;
  /** 动作留下的那句话（读失败 / 有层没写成）；校验失败的话由 `validation` 现算 */
  message: string;
  /** 确定按钮能不能点 */
  canConfirm: boolean;
  busy: boolean;
  pickMode: (next: TextBatchMode) => void;
  read: (scope: TextScope) => void;
  changeDraft: (value: string) => void;
  changeCreateDraft: (value: string) => void;
  confirm: () => void;
}

export function useTextBatch(baseSize: number, onClose: () => void): TextBatchState {
  const [mode, setMode] = useState<TextBatchMode>('create');
  const [layers, setLayers] = useState<TextLayerSnapshot[]>([]);
  const [draft, setDraft] = useState('');
  const [createDraft, setCreateDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const pickMode = useCallback((next: TextBatchMode) => {
    setMode(next);
    setNotice('');
  }, []);

  const read = useCallback((scope: TextScope) => {
    setBusy(true);
    void readTexts(scope).then((result) => {
      setBusy(false);
      if (result.status === 'error') {
        setNotice(result.reason);
        return;
      }
      setLayers(result.value.layers);
      setDraft(result.value.draft);
      setNotice('');
    });
  }, []);

  const changeDraft = useCallback((value: string) => {
    setDraft(value);
    setNotice('');
  }, []);

  const changeCreateDraft = useCallback((value: string) => {
    setCreateDraft(value);
    setNotice('');
  }, []);

  const confirm = useCallback(() => {
    if (busy) return;
    setBusy(true);

    if (mode === 'edit') {
      void writeDraft(layers, draft).then((result) => {
        setBusy(false);
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

    void createTexts(createDraft, baseSize).then((result) => {
      setBusy(false);
      if (result.status === 'error') {
        setNotice(result.reason);
        return;
      }
      /* 字体缺失时层已经建好：不拦流程，关窗前说一句就够 —— 字体本身归字体面板改 */
      if (result.value.fontMissing) toast.info(MSG.textBatch.fontMissing);
      onClose();
    });
  }, [busy, mode, layers, draft, createDraft, baseSize, onClose, toast]);

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
    changeDraft,
    changeCreateDraft,
    confirm
  };
}
