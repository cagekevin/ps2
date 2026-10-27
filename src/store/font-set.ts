/**
 * 【范本】字面板切片：**只读投影**
 *
 * 读 repo，不 import `commands`（依赖表禁止）。写操作由页面经 `commands/font-set` 执行，
 * 成功后页面调 `load()` 重读受影响的投影；设置走「本地先生效 + 防抖落盘」，不用重读。
 *
 * 失败处理：读失败**保留上一份值**并记日志。这里没有失败通道是刻意的——
 * 面板必须能打开（缺失本来就等于默认值），真正需要用户知道的失败发生在写的时候，
 * 由命令返回 `CORRUPT` / `IO_ERROR`，页面 toast 带路径。
 */

import { create } from 'zustand';
import { log } from '../core/logger';
import {
  FONT_SET_DEFAULTS,
  type FontSetSettings,
  type HierarchyFile
} from '../domain/font-set';
import type { QuickFontFile } from '../domain/quick-font';
import {
  readFontHistory,
  readFontSetSettings,
  readHierarchy,
  readQuickFonts
} from '../repo/font-set-repo';

interface FontSetState {
  settings: FontSetSettings;
  quickFonts: QuickFontFile;
  hierarchy: HierarchyFile;
  history: string[];
  load: () => void;
  /** 本地立即生效（界面不等落盘）；落盘由页面调 `saveSettings` */
  setLocalSettings: (patch: Partial<FontSetSettings>) => void;
}

export const useFontSetStore = create<FontSetState>()((set, get) => ({
  settings: FONT_SET_DEFAULTS,
  quickFonts: { index: 0, list: [] },
  hierarchy: { index: 0, list: [{ name: '默认', data: [...FONT_SET_DEFAULTS.ztHierarych] }] },
  history: [],

  load() {
    const settings = readFontSetSettings();
    if (settings.status === 'ok') set({ settings: settings.value });
    else log.warn('读取字面板设置失败', { code: settings.code, reason: settings.reason });

    const quickFonts = readQuickFonts();
    if (quickFonts.status === 'ok') set({ quickFonts: quickFonts.value });
    else log.warn('读取快捷字体失败', { code: quickFonts.code, reason: quickFonts.reason });

    const hierarchy = readHierarchy();
    if (hierarchy.status === 'ok') set({ hierarchy: hierarchy.value });
    else log.warn('读取层级预设失败', { code: hierarchy.code, reason: hierarchy.reason });

    const history = readFontHistory();
    if (history.status === 'ok') set({ history: history.value });
    else log.warn('读取最近字体失败', { code: history.code, reason: history.reason });
  },

  setLocalSettings(patch) {
    set({ settings: { ...get().settings, ...patch } });
  }
}));
