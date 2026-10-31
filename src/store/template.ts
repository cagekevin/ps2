/**
 * 模板库页的只读投影 + 当前位置。
 *
 * 数据侧只做一件事：读 `repo/template-repo`。**不写文件**、不判好坏 —— 失败臂原样留在
 * `failure` 里，页面用 `StateHint` 展示（读失败**保留上一份**：数据源没换，刷新失败不清空）。
 *
 * 「读过没有」的判据只有一条：`index === null`（与 `store/action` 同形）。
 * **不许加 `loaded: boolean`** —— 那会变成第二套判据。
 *
 * 派生值（面包屑 / 子文件夹 / 当前层条目）由页面用 `domain` 的纯函数现算，不在这里存副本：
 * 存副本就要在两处同步，迟早不一致。
 */

import { create } from 'zustand';
import type { TemplateIndex } from '../domain/template-library';
import { readIndex } from '../repo/template-repo';
import type { Failure } from '../types/result';

interface TemplateState {
  /** `null` = 还没读到（读失败也保持上一份） */
  index: TemplateIndex | null;
  /** 当前所在文件夹；`null` = 根 */
  currentFolderId: string | null;
  /** 最近一次读的失败臂（`null` = 没失败过） */
  failure: Failure | null;
  /** 刚存进来的那条（2s 高亮 + 滚到可见）；`null` = 没有需要提示的 */
  highlightId: string | null;
  load: () => void;
  /** 命令写完把新索引交给这里（不重读文件） */
  applyIndex: (index: TemplateIndex) => void;
  setCurrentFolder: (id: string | null) => void;
  markSaved: (id: string) => void;
  clearHighlight: () => void;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  index: null,
  currentFolderId: null,
  failure: null,
  highlightId: null,
  load: () => {
    const read = readIndex();
    if (read.status === 'error') {
      set({ failure: read });
      return;
    }
    set({ index: read.value, failure: null });
  },
  applyIndex: (index) => set({ index, failure: null }),
  setCurrentFolder: (id) => set({ currentFolderId: id }),
  markSaved: (id) => set({ highlightId: id }),
  clearHighlight: () => set({ highlightId: null })
}));
