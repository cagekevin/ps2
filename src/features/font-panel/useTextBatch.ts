/**
 * 批量文字弹窗的状态与动作（`features` 层，只调 commands 与 domain）。
 *
 * **一个输入框、两种态**：`layers` 为空 = 新建（每行建一层），
 * `layers` 非空 = 替换（每行改对应层）。模式不存 state，由 `layers.length` 派生；
 * 「清空」把 `layers` 置空、回到新建态。
 *
 * 四个状态：`layers`（读到的层）/ `draft`（唯一输入框）/ `notice`（动作留下的那句话）/ `busy`。
 * **不建 store**：进弹窗读、关掉即弃。
 *
 * 「识别」是一步：点 OCR 就执行，建层成功后由组件切回「改全部」并读入全部。
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

/**
 * 正在跑哪个动作：**一个字段，不是两个布尔**。
 *
 * 分开记（`busy` + `recognizing`）会让「哪些按钮禁用」与「哪个按钮转圈」变成两个真相，
 * 总有一个先忘。判别位只有这一个，界面照它取值：
 *   `'recognize'` ⇒ OCR 按钮里显示转圈；其余 ⇒ 只禁用。
 */
export type TextBatchBusy = 'read' | 'recognize' | 'confirm' | null;

export interface TextBatchState {
  /** 读到的层；空数组 = 新建态 */
  layers: TextLayerSnapshot[];
  draft: string;
  /** 动作留下的那句话（读失败 / 有层没写成）；校验失败的话由 `validation` 现算 */
  message: string;
  /** 确定按钮能不能点 */
  canConfirm: boolean;
  busy: TextBatchBusy;
  /** 读入一批层（`all` = 全部，`selection` = 当前选中） */
  read: (scope: TextScope) => void;
  /** 识别当前画布 → 按坐标建层；成功后调 `onDone`（组件据此切回改字并读入） */
  recognize: (onDone?: () => void) => void;
  /** 清掉读入的层，回到新建态 */
  clear: () => void;
  changeDraft: (value: string) => void;
  confirm: () => void;
}

export function useTextBatch(baseSize: number, onClose: () => void): TextBatchState {
  const [layers, setLayers] = useState<TextLayerSnapshot[]>([]);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<TextBatchBusy>(null);
  const toast = useToast();

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

  const recognize = useCallback((onDone?: () => void) => {
    if (busy !== null) return;
    setBusy('recognize');
    /* 导出 + 上传 + 识别 + 建层，3–10s：按钮里转圈，状态行同时说一句（两处都是同一件事的不同载体） */
    setNotice(MSG.ocr.recognizing);
    settle(ocrToLayers(), (result) => {
      if (result.status === 'error') {
        setNotice(result.reason);
        return;
      }
      setNotice(MSG.ocr.created);
      /* 两种「部分成功」各自补一句，不合并成一句（用户要修的东西不同） */
      if (result.value.fontMissing) toast.info(MSG.fontMissing);
      if (result.value.dropped > 0) toast.info(MSG.ocr.dropped);
      /* 建完直接进入改字：组件传进来的回调负责切 tab 并读入全部 */
      onDone?.();
    });
  }, [busy, settle, toast]);

  /** 清空读入的层 = 回到新建态；输入框一起清，避免上一批的原文留在新建态里 */
  const clear = useCallback(() => {
    setLayers([]);
    setDraft('');
    setNotice('');
  }, []);

  const changeDraft = useCallback((value: string) => {
    setDraft(value);
    setNotice('');
  }, []);

  const confirm = useCallback(() => {
    if (busy !== null) return;
    setBusy('confirm');

    /* 空图层 = 新建：每行一个文字层 */
    if (layers.length === 0) {
      settle(createTexts(draft, baseSize), (result) => {
        if (result.status === 'error') {
          setNotice(result.reason);
          return;
        }
        /* 字体缺失时层已经建好：不拦流程，关窗前说一句就够 —— 字体本身归字体面板改 */
        if (result.value.fontMissing) toast.info(MSG.fontMissing);
        onClose();
      });
      return;
    }

    /* 有图层 = 替换：每行对应一层 */
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
  }, [busy, layers, draft, baseSize, onClose, toast, settle]);

  /* 派生值渲染期算（不拿 state 存）：行数校验与「改了几行」都只依赖 layers + draft */
  const patches = layers.length > 0 ? buildPatches(layers, draft) : null;
  const validation = patches && patches.status === 'error' ? patches.reason : '';
  const changed = patches && patches.status === 'ok' ? patches.value.length : 0;
  const canConfirm = layers.length === 0 ? parseCreateLines(draft).length > 0 : changed > 0;

  return {
    layers,
    draft,
    message: validation || notice,
    canConfirm,
    busy,
    read,
    recognize,
    clear,
    changeDraft,
    confirm
  };
}
