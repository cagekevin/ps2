/**
 * 【范本】文字属性快照（只读投影 + 乐观 patch）
 *
 * 唯一真相是 PS 文档：这里存的是最近一次读到的快照，不是权威值。
 * 写操作成功之后由页面调 `patch()` 做本地乐观更新；**失败时不许 patch**——
 * 图层没变却把面板改成新值，用户会以为已经生效。
 *
 * 失败存**整个 `Result`**（不是一句字符串）：码决定界面语气（前提不满足 vs 真失败），
 * 拼文案的事交给 `components/StateHint`，页面不再自己判断该标红还是该灰。
 *
 * 不订阅 PS 选区事件：`features/font-panel` 在 `layer-watcher` 报告活动图层变了时调 `refresh()`
 * （进页面也算一次变化），切到非文字图层由 `core/ps/text` 返回 `PS_NOT_TEXT`。
 *
 * 不 import `commands`（依赖表禁止）：读走 `core/ps`，归一化走 `domain`。
 */

import { create } from 'zustand';
import { getTextInfoRaw } from '../core/ps/text';
import { log } from '../core/logger';
import { applyTextPatch, normalizeTextInfo, type TextInfo } from '../domain/text-info';
import { failWithDetail, type Result } from '../types/result';

interface TextState {
  info: TextInfo | null;
  /** 非 null = 上一次读取失败；面板用遮罩盖住属性区并显示这一条 */
  failure: Result<void> | null;
  /** 快照可能已过期（读失败 / 切过图层） */
  stale: boolean;
  refresh: () => Promise<void>;
  patch: (next: Partial<TextInfo>) => void;
  clearFailure: () => void;
}

/** 刷新序号：连点两次时只让后一次的结果落地（前一次可能返回更晚） */
let refreshSeq = 0;

export const useTextStore = create<TextState>()((set, get) => ({
  info: null,
  failure: null,
  stale: false,

  async refresh() {
    refreshSeq += 1;
    const seq = refreshSeq;
    const raw = await getTextInfoRaw();
    if (seq !== refreshSeq) return;

    if (raw.status === 'error') {
      /* 旧值保留在 `info` 里（清空会让面板闪成默认值），由页面用遮罩挡住 */
      log.warn('读取文字属性失败', { code: raw.code, reason: raw.reason });
      set({ failure: failWithDetail(raw.code, raw.reason, raw.detail), stale: true });
      return;
    }

    const info = normalizeTextInfo(raw.value);
    if (info.status === 'error') {
      log.warn('文字属性结构不认识', { reason: info.reason, detail: info.detail });
      set({ failure: failWithDetail(info.code, info.reason, info.detail), stale: true });
      return;
    }

    set({ info: info.value, failure: null, stale: false });
  },

  patch(next) {
    set({ info: applyTextPatch(get().info, next) });
  },

  clearFailure() {
    set({ failure: null, stale: false });
  }
}));
