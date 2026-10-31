/**
 * 【范本】重命名页的只读投影 + 两个界面偏好
 *
 * 数据侧只做一件事：读 `repo/rename-repo`。**不写文件**、不判好坏——失败臂原样留在
 * `failure` 里，由页面用 `StateHint` 展示（读失败**保留上一份**：数据源没换，刷新失败不清空）。
 *
 * 界面偏好（模式 / 颜色标记区展开态）也在这里，因为**归一化必须有唯一判据**：
 * `prefs.json` 是用户可改的文件，写进去 `7`、`"Replace"`、`null` 都可能；页面各判一次
 * 就会长出第二套规则，而且「不认识的档位」会渲染成「一个都没选中」。
 * 读：`getPref` → `normalizeMode`（唯一判据）；写：命令层调 `setMode` + `savePref`
 * （与 `store/action` 的列数同形：store 只改本地，落盘在命令）。
 *
 * `failure` 存失败臂而不是整条 `Result`：存 `Result` 时「ok」与「没读过」同形（`TD-09-3`）。
 * 单源叫 `failure`、多源叫 `failures`（键 = 来源）——store 层只有这一对名字（`TD-05-2`）。
 */

import { create } from 'zustand';
import { log } from '../core/logger';
import { getPref } from '../core/prefs';
import { seedPreset, type RenamePreset } from '../domain/rename';
import { readPreset } from '../repo/rename-repo';
import type { Dropped } from '../types/decode-list';
import type { Failure } from '../types/result';

/** 重命名模式：默认（一条表达式）/ 替换（`原文=>新文字`） */
export type RenameMode = 'default' | 'replace';

/** 本页两个偏好的键：**唯一拼写处**（命令层落盘时 import 这里，不再手抄字符串） */
export const RENAME_PREF_KEYS = {
  mode: 'rename.mode',
  colorSign: 'rename.showColorSign'
} as const;

/**
 * 偏好 → 模式：**唯一判据**。
 *
 * 只认两个字面量，其余（旧版数字 0/1、大小写不符、空串、非字符串）一律归 `default`。
 * 不做数字兼容：本页尚未发布过，多一条兼容分支就多一处「同一概念两种取值」。
 */
export function normalizeMode(raw: unknown): RenameMode {
  return raw === 'replace' ? 'replace' : 'default';
}

/** 偏好 → 展开态：只认 `true` / `false`，其余按缺省（展开）处理 */
export function normalizeColorSign(raw: unknown): boolean {
  return raw === false ? false : true;
}

interface RenameState {
  /** 预设本体；初始给种子，读失败保留上一份 */
  preset: RenamePreset;
  /** 文件里认不出而跳过的组 / 项；页面必须显示「N 项无法识别」 */
  dropped: Dropped[];
  /** 最近一次读的失败臂（`null` = 没失败过）。单源 store 统一叫 `failure` */
  failure: Failure | null;
  mode: RenameMode;
  colorSignOpen: boolean;
  load: () => void;
  /** 只改本地（命令 `setMode` 负责落盘） */
  setMode: (mode: RenameMode) => void;
  /** 只改本地（命令 `setColorSignOpen` 负责落盘） */
  setColorSignOpen: (open: boolean) => void;
}

export const useRenameStore = create<RenameState>()((set, get) => ({
  preset: seedPreset(),
  dropped: [],
  failure: null,
  mode: normalizeMode(getPref<unknown>(RENAME_PREF_KEYS.mode, 'default')),
  /* 缺省**展开**（偏离参考实现的 `cmmShowColorSign` 默认 false）：收起时这一行跟分隔线几乎融在一起，
     用户找不到「图层颜色」，等于这个功能不存在（2026-10-31 按实机反馈改判） */
  colorSignOpen: normalizeColorSign(getPref<unknown>(RENAME_PREF_KEYS.colorSign, true)),

  load() {
    const previous = get();
    const read = readPreset();

    set({
      preset: read.status === 'ok' ? read.value.preset : previous.preset,
      dropped: read.status === 'ok' ? read.value.dropped : previous.dropped,
      failure: read.status === 'error' ? read : null
    });

    if (read.status === 'ok' && read.value.dropped.length) {
      log.warn('重命名预设里有项无法识别，已跳过', {
        count: read.value.dropped.length,
        items: read.value.dropped.map((item) => ({
          path: item.path,
          code: item.code,
          reason: item.reason,
          detail: item.detail
        }))
      });
    }
  },

  setMode(mode) {
    set({ mode });
  },

  setColorSignOpen(open) {
    set({ colorSignOpen: open });
  }
}));
