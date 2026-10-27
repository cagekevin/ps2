/**
 * 【范本】文字属性快照（只读投影 + 乐观 patch）
 *
 * 唯一真相是 PS 文档：这里存的是最近一次读到的快照，不是权威值。
 * 写操作成功之后由页面调 `patch()` 做本地乐观更新；**失败时不许 patch**——
 * 图层没变却把面板改成新值，用户会以为已经生效。
 *
 * v1 不订阅 PS 选区事件：进页面 `refresh()` 一次，切图层后由用户重新进页面。
 *
 * 不 import `commands`（依赖表禁止）：读走 `core/ps`，归一化走 `domain`。
 */

import { create } from 'zustand';
import { getTextInfoRaw } from '../core/ps/text';
import { log } from '../core/logger';
import { applyTextPatch, normalizeTextInfo, type TextInfo } from '../domain/text-info';

interface TextState {
  info: TextInfo | null;
  /** 非空 = 上一次读取失败的原因；面板保留旧值并显示这一行 */
  error: string;
  /** 快照可能已过期（读失败 / 切过图层） */
  stale: boolean;
  refresh: () => Promise<void>;
  patch: (next: Partial<TextInfo>) => void;
  clearError: () => void;
}

/** 刷新序号：连点两次时只让后一次的结果落地（前一次可能返回更晚） */
let refreshSeq = 0;

export const useTextStore = create<TextState>()((set, get) => ({
  info: null,
  error: '',
  stale: false,

  async refresh() {
    refreshSeq += 1;
    const seq = refreshSeq;
    const raw = await getTextInfoRaw();
    if (seq !== refreshSeq) return;

    if (raw.status === 'error') {
      /* 保留旧值：清空会让整个属性面板闪成默认值，用户以为属性被重置了 */
      log.warn('读取文字属性失败', { code: raw.code, reason: raw.reason });
      set({ error: raw.reason, stale: true });
      return;
    }

    const info = normalizeTextInfo(raw.value);
    if (info.status === 'error') {
      log.warn('文字属性结构不认识', { reason: info.reason, detail: info.detail });
      set({ error: info.reason, stale: true });
      return;
    }

    set({ info: info.value, error: '', stale: false });
  },

  patch(next) {
    set({ info: applyTextPatch(get().info, next) });
  },

  clearError() {
    set({ error: '', stale: false });
  }
}));
