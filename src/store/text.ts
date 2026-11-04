/**
 * 【范本】文字属性快照（只读投影 + 乐观 patch）
 *
 * 唯一真相是 PS 文档：这里存的是最近一次读到的快照，不是权威值。
 * 写操作成功之后由页面调 `patch()` 做本地乐观更新；**失败时不许 patch**——
 * 图层没变却把面板改成新值，用户会以为已经生效。
 *
 * 失败存**整个 `Result`**（不是一句字符串）：码决定界面语气（前提不满足 vs 真失败），
 * 拼文案的事交给 `components/MessageBar`，页面不再自己判断该标红还是该灰。
 *
 * 不订阅 PS 选区事件：`features/font-panel` 在 `layer-watcher` 报告活动图层变了时调 `refresh()`
 * （进页面也算一次变化），切到非文字图层由 `core/ps/layer.requireTextLayer` 返回
 * `PS_WRONG_LAYER`（reason 写明「当前是 X，需要 Y」）。
 *
 * 不 import `commands`（依赖表禁止）：读走 `core/ps`，归一化走 `domain`。
 */

import { create } from 'zustand';
import { getTextInfoRaw } from '../core/ps/text';
import { log } from '../core/logger';
import { applyTextPatch, decodeTextInfo, type TextInfo } from '../domain/text-info';
import type { Failure } from '../types/result';

interface TextState {
  info: TextInfo | null;
  /**
   * 非 null = 上一次读取失败；面板用遮罩盖住属性区并显示这一条。
   *
   * 只存**失败臂**（`Failure`）：存整条 `Result` 会让「读成功」与「没读过」在这个字段上同形，
   * 读之前还得再判一次 `status`（`TD-09-4`）。
   */
  failure: Failure | null;
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
      /*
       * 「是不是文字图层」这条判据已经由 `getTextInfoRaw` → `requireTextLayer` 判过了，
       * 它的结论就是 `PS_WRONG_LAYER`。所以这里**不再自己判一次类型**，只按码分流：
       *
       *   `VALIDATION` = 官方单层接口拒了这次请求（选中多个图层时它回「多个图层不处理」）。
       *   那不是失败，是这一屏不该拿数量当判据 —— 保留上一次快照，不弹红字。
       *   其它码（没加载 / 类型不对 / 宿主报错）照旧报出来。
       */
      if (raw.code === 'VALIDATION') {
        log.warn('文字属性本次没读到，保留上一次快照', { reason: raw.reason, detail: raw.detail });
        set({ stale: true });
        return;
      }

      /* 旧值保留在 `info` 里（清空会让面板闪成默认值），由页面用遮罩挡住 */
      log.warn('读取文字属性失败', { code: raw.code, reason: raw.reason });
      set({ failure: raw, stale: true });
      return;
    }

    const info = decodeTextInfo(raw.value);
    if (info.status === 'error') {
      log.warn('文字属性结构不认识', { reason: info.reason, detail: info.detail });
      set({ failure: info, stale: true });
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
