/**
 * 云同步切片：只读台账 + 进行中状态
 *
 * 台账来自 `core/prefs`（`cloud.ledger`），解码在 `domain/cloud.decodeLedger`（坏值 → null）。
 * 页面只读这里，不 import `core/prefs`；命令层写台账后调 `load()` 刷新。
 *
 * `busy` 是**页面的交互状态**（按钮禁用），由页面 `setBusy` 写；命令层不碰它。
 */
import { create } from 'zustand';
import { getPref } from '../core/prefs';
import { decodeLedger, type CloudLedger } from '../domain/cloud';

export type CloudBusy = 'upload' | 'download' | null;

interface CloudState {
  /** null = 从未同步过（或台账坏值） */
  ledger: CloudLedger | null;
  busy: CloudBusy;
  /** 只读 prefs */
  load: () => void;
  setBusy: (busy: CloudBusy) => void;
}

/**
 * 台账**唯一读取处**（坏值 → null）。
 *
 * `load()` 与本切片之外只读一次：命令层要用 `rev` 也调这里，
 * 不许在 `commands/cloud` 再写一遍 `getPref('cloud.ledger') + decodeLedger` —— 那是同一判据两份实现。
 */
export function readLedger(): CloudLedger | null {
  return decodeLedger(getPref<unknown>('cloud.ledger', null));
}

export const useCloudStore = create<CloudState>()((set) => ({
  ledger: readLedger(),
  busy: null,

  load() {
    set({ ledger: readLedger() });
  },

  setBusy(busy) {
    set({ busy });
  }
}));
