/**
 * 字体切片：**只读投影**。
 *
 * 读 repo、存界面偏好；**不 import commands**（依赖表禁止）。
 * 写操作由页面经 `commands/font` 执行，成功后调 `loadTags()` / `loadStars()` 重读。
 * 列表与分页归页面 hook，不放进 store（与参考实现一致）。
 */

import { create } from 'zustand';
import { getPref, setPref } from '../core/prefs';
import type { Classification } from '../domain/classification';
import { emptyClassification } from '../domain/classification';
import { familyLang } from '../domain/font-lang';
import type { FontTag } from '../domain/font-meta';
import { readClassification, readFontStars, readFontTags } from '../repo/font-repo';
import type { Result } from '../types/result';

export type PreviewMode = 'none' | 'small' | 'medium' | 'large' | 'extra-large';

export const PREVIEW_MODES: PreviewMode[] = ['none', 'small', 'medium', 'large', 'extra-large'];

export const PREVIEW_LABEL: Record<PreviewMode, string> = {
  none: '普通列表',
  small: '小预览',
  medium: '中预览',
  large: '大预览',
  'extra-large': '超大预览'
};

/** 预览文案：英文家族名用英文样例，其余用中文（唯一判据在 font-lang） */
export function defaultPreviewText(family: string): string {
  return familyLang(family) === 'en' ? 'Crazy Design' : '设计助理';
}

type TagsRead = Result<{ tags: FontTag[]; dropped: number }>;
type StarsRead = Result<{ stars: Record<string, number>; dropped: number }>;

interface FontState {
  tags: FontTag[];
  tagsRead: TagsRead | null;
  stars: Record<string, number>;
  starsRead: StarsRead | null;
  classification: Classification;
  /** 非空表示分类数据不可用（只放原因，文案后缀由页面统一加） */
  classificationDegraded: string;
  previewMode: PreviewMode;
  previewText: string;
  loadTags: () => void;
  loadStars: () => void;
  loadClassification: () => void;
  setPreviewMode: (mode: PreviewMode) => void;
  setPreviewText: (text: string) => void;
  cyclePreview: () => void;
}

function isPreviewMode(value: string): value is PreviewMode {
  return PREVIEW_MODES.some((mode) => mode === value);
}

function initialPreviewMode(): PreviewMode {
  const stored = getPref<string>('font.previewMode', 'small');
  return isPreviewMode(stored) ? stored : 'small';
}

export const useFontStore = create<FontState>()((set, get) => ({
  tags: [],
  tagsRead: null,
  stars: {},
  starsRead: null,
  classification: emptyClassification(),
  classificationDegraded: '',
  previewMode: initialPreviewMode(),
  previewText: getPref<string>('font.previewText', ''),

  loadTags() {
    const read = readFontTags();
    set({
      tagsRead: read,
      tags: read.status === 'ok' ? read.value.tags : []
    });
  },

  loadStars() {
    const read = readFontStars();
    set({
      starsRead: read,
      stars: read.status === 'ok' ? read.value.stars : {}
    });
  },

  loadClassification() {
    const read = readClassification();
    const degraded =
      read.status === 'error'
        ? read.reason
        : read.value.categories.length === 0
          ? '分类数据为空'
          : '';

    set({
      classification: read.status === 'ok' ? read.value : emptyClassification(),
      classificationDegraded: degraded
    });
  },

  setPreviewMode(mode) {
    set({ previewMode: mode });
    setPref('font.previewMode', mode);
  },

  setPreviewText(text) {
    set({ previewText: text });
    setPref('font.previewText', text);
  },

  cyclePreview() {
    const current = get().previewMode;
    const index = PREVIEW_MODES.indexOf(current);
    const next = PREVIEW_MODES[(index + 1) % PREVIEW_MODES.length];
    if (!next) return;
    get().setPreviewMode(next);
  }
}));
