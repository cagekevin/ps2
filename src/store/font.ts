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
import type { Failure } from '../types/result';

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


interface FontState {
  tags: FontTag[];
  stars: Record<string, number>;
  /** 分类投影：读失败时给空分类，**不要**拿它判「读没读到」——那看 `failures.classification` */
  classification: Classification;
  /**
   * 三个来源各自的失败臂（键 = 来源；`null` = 那个来源最近一次读没失败）。
   *
   * 以前是**平铺字段** `tagsRead` / `starsRead` / `classificationRead`，前两个还存**整条 `Result`**
   * （页面为了拿 `value.dropped` 只好再判一次 `status`）。现在与 `store/action` / `store/common-use` /
   * `store/style-library` 统一成一对名字：单源 `failure`、多源 `failures`（键 = 来源）；
   * **坏项记账属于值，不属于失败**，搬到下面的 `dropped`。
   *
   * 分类那一臂的历史（`TD-09-4`）：更早是 `classificationDegraded: string`，空串正常 / 非空坏，
   * 且 `.value` 永远可取——那次收口（只存失败臂）保留，这里只是把它挪进同一张表（`TD-05-2`）。
   */
  failures: { tags: Failure | null; stars: Failure | null; classification: Failure | null };
  /** 读的时候被跳过的坏项（值侧记账；与失败臂分开，`Result` 不进 store） */
  dropped: { tags: Dropped[]; stars: Dropped[] };
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
  stars: {},
  classification: emptyClassification(),
  failures: { tags: null, stars: null, classification: null },
  dropped: { tags: [], stars: [] },
  previewMode: initialPreviewMode(),
  previewText: getPref<string>('font.previewText', ''),

  loadTags() {
    const read = readFontTags();
    const { failures } = get();
    if (read.status === 'error') {
      /* 保留旧值 + 留痕：同一份标签文件不会随上下文变，失败时清空只会让用户以为标签没了 */
      log.warn('读取字体标签失败', { code: read.code, reason: read.reason, detail: read.detail });
      set({ failures: { ...failures, tags: read } });
      return;
    }
    set({
      tags: read.value.tags,
      dropped: { ...get().dropped, tags: read.value.dropped },
      failures: { ...failures, tags: null }
    });
  },

  loadStars() {
    const read = readFontStars();
    const { failures } = get();
    if (read.status === 'error') {
      log.warn('读取字体星级失败', { code: read.code, reason: read.reason, detail: read.detail });
      set({ failures: { ...failures, stars: read } });
      return;
    }
    set({
      stars: read.value.stars,
      dropped: { ...get().dropped, stars: read.value.dropped },
      failures: { ...failures, stars: null }
    });
  },

  loadClassification() {
    const read = readClassification();
    const { failures } = get();
    if (read.status === 'error') {
      log.warn('读取字体分类失败', { code: read.code, reason: read.reason, detail: read.detail });
      set({ failures: { ...failures, classification: read } });
      return;
    }
    set({ classification: read.value, failures: { ...failures, classification: null } });
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
