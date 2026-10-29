/**
 * 【范本】动作库的只读投影
 *
 * 只做两件事：读 `repo/action-repo` + 把 `columns` 从 `core/prefs` 读出来。
 * **不写文件**、不判断好坏——失败臂原样留在 `reasons` 里，由页面用 `StateHint` 展示。
 * `reasons` 只存**失败臂**（`Failure`），`null` = 最近一次读没有失败；存整条 `Result` 会让
 * 「ok」与「没读过」同形（`TD-09-3`）。
 *
 * 写盘后的重读一律由命令层调 `load()`（`05` §3.10 D：数据类成功 → 重读；参数类只改本地）。
 */

import { create } from 'zustand';
import { log } from '../core/logger';
import { getPref } from '../core/prefs';
import { defaultLibrary, type ActionGroup, type WarehouseIndex } from '../domain/action-library';
import { readIndex, readLibrary } from '../repo/action-repo';
import type { Dropped } from '../types/decode-list';
import type { Failure } from '../types/result';

/** 列表列数：官方 `showListType` 存 0/1/2，我们只存 1/2/3（写盘时 -1 还原，`05` §3.6） */
export type ActionColumns = 1 | 2 | 3;

const COLUMNS_KEY = 'action.listColumns';

/** prefs 里是任意值：只认 1/2/3，其余归 2（官方默认双列） */
export function normalizeColumns(raw: unknown): ActionColumns {
  return raw === 1 || raw === 3 ? raw : 2;
}

interface ActionState {
  /** 索引；`null` = 还没读到 / 读失败（保住上一份，不呈现空库） */
  index: WarehouseIndex | null;
  groups: ActionGroup[];
  /** 文件里认不出而跳过的动作项；页面必须显示「N 项无法识别」 */
  dropped: Dropped[];
  columns: ActionColumns;
  reasons: { index: Failure | null; library: Failure | null };
  load: () => void;
  /** 只改本地 + prefs（`setListColumns` 命令调它，不重读文件） */
  setColumns: (columns: ActionColumns) => void;
}

export const useActionStore = create<ActionState>()((set, get) => ({
  index: null,
  groups: defaultLibrary(),
  dropped: [],
  columns: normalizeColumns(getPref<unknown>(COLUMNS_KEY, 2)),
  reasons: { index: null, library: null },

  load() {
    const previous = get();
    const index = readIndex();
    const library = readLibrary();

    set({
      index: index.status === 'ok' ? index.value : previous.index,
      groups: library.status === 'ok' ? library.value.groups : previous.groups,
      dropped: library.status === 'ok' ? library.value.dropped : [],
      reasons: {
        index: index.status === 'error' ? index : null,
        library: library.status === 'error' ? library : null
      }
    });

    /* 坏项必须留痕：页面只显示数量，谁坏了、坏在哪个字段只能从日志追 */
    if (library.status === 'ok' && library.value.dropped.length) {
      log.warn('动作库有项无法识别，已跳过', {
        count: library.value.dropped.length,
        items: library.value.dropped.map((item) => ({
          path: item.path,
          code: item.code,
          reason: item.reason,
          detail: item.detail
        }))
      });
    }
  },

  setColumns(columns) {
    set({ columns });
  }
}));
