/**
 * 字体切片：**只读投影**。
 *
 * 读 repo、存界面偏好；**不 import commands**（依赖表禁止）。
 * 写操作由页面经 `commands/font` 执行，成功后调 `loadTags()` / `loadStars()` 重读。
 * 列表与分页归页面 hook，不放进 store（与参考实现一致）。
 */

import { create } from 'zustand';
import { log } from '../core/logger';
import { getPref, setPref } from '../core/prefs';
import type { Classification } from '../domain/classification';
import { emptyClassification } from '../domain/classification';
import { familyLang } from '../domain/font-lang';
import type { FontTag } from '../domain/font-meta';
import { readClassification, readFontStars, readFontTags } from '../repo/font-repo';
import type { Dropped } from '../types/decode-list';
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

type TagsRead = Result<{ tags: FontTag[]; dropped: Dropped[] }>;
type StarsRead = Result<{ stars: Record<string, number>; dropped: Dropped[] }>;

interface FontState {
  tags: FontTag[];
  tagsRead: TagsRead | null;
  stars: Record<string, number>;
  starsRead: StarsRead | null;
  /** 分类投影：读失败时给空分类，**不要**拿它判「读没读到」——那看 `classificationRead` */
  classification: Classification;
  /**
   * 分类的读取结果（与 `tagsRead` / `starsRead` 同形）。
   *
   * 以前是 `classificationDegraded: string`：空串正常、非空坏，但 `.value` 永远可取，
   * 而且把「读失败的原因」和「分类为空」两种不同的事塞进同一个字符串——
   * 失败码位写人话，页面只能原样拼进 UI。
   */
  classificationRead: Result<Classification> | null;
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
  classificationRead: null,
  previewMode: initialPreviewMode(),
  previewText: getPref<string>('font.previewText', ''),

  loadTags() {
    const read = readFontTags();
    if (read.status === 'error') {
      /* 保留旧值 + 留痕：同一份标签文件不会随上下文变，失败时清空只会让用户以为标签没了 */
      log.warn('读取字体标签失败', { code: read.code, reason: read.reason, detail: read.detail });
      set({ tagsRead: read });
      return;
    }
    set({ tagsRead: read, tags: read.value.tags });
  },

  loadStars() {
    const read = readFontStars();
    if (read.status === 'error') {
      log.warn('读取字体星级失败', { code: read.code, reason: read.reason, detail: read.detail });
      set({ starsRead: read });
      return;
    }
    set({ starsRead: read, stars: read.value.stars });
  },

  loadClassification() {
    const read = readClassification();
    if (read.status === 'error') {
      log.warn('读取字体分类失败', { code: read.code, reason: read.reason, detail: read.detail });
      set({ classificationRead: read });
      return;
    }
    set({ classification: read.value, classificationRead: read });
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
