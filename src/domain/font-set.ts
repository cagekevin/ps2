/**
 * 字体面板的设置形状、默认值与校验。
 *
 * 值的来源是官方 `sj_set.json` 的 `zt*` 字段（`app.v4.js:65835-65866`），
 * 字段名连原版拼写一起照抄：`ztHierarych`（少一个 r）改了就读不到用户的层级。
 *
 * 两条边界：
 *   1. 读：缺失或形状不对的字段回落到默认值——面板要能打开，不能因为一个字段坏就整块空
 *   2. 写：`mergeFontSetSettings` 只替换**入参里出现且校验通过**的键，
 *      未知键与未改动的键原样保留（`sj_set.json` 里还有别的页面的设置，动它们等于改别人的数据）
 */

import { failWithDetail, ok, type Result } from '../types/result';
import { isRecord } from '../types/guards';
import { DAILY_LIMIT } from './translate';

/** 粘贴文字属性的 6 个开关：false = 该项不粘贴（粘贴时把该字段置 null） */
export interface PasteFontConfig {
  scriptFamily: boolean;
  color: boolean;
  opacity: boolean;
  size: boolean;
  leading: boolean;
  tracking: boolean;
}

/** 生成按钮：1 圆角 / 2 直角；`padding` 是「10,20」「15=3:1」这类文本 */
export interface CreateButtonConfig {
  type: 1 | 2;
  isLine: boolean;
  padding: string;
}

/** 翻译设置；原版字段名就是 `delete`（true = 译文替换原文） */
export interface TranslateConfig {
  from: string;
  to: string;
  delete: boolean;
}

export interface FontSetSettings {
  ztHierarych: number[];
  ztPasteFont: PasteFontConfig;
  ztCreateButton: CreateButtonConfig;
  ztTranslate: TranslateConfig;
  ztDistributedIsFixed: boolean;
  ztDistributionFilter: boolean;
  ztDefaultSize: number[];
  ztDefaultLeading: number[];
  ztDefaultTracking: number[];
  ztShowQuick: boolean;
  ztShowCustom: boolean;
  /** 字体选择器预览档位：0 / 24 / 38 / 50 */
  ztPreview: number;
  ztExpandMultiple: boolean;
  ztOldVersion: boolean;
  appUnit: string;
}

/** 默认值逐字对齐 `app.v4.js:65835-65866` 与 `:65933-65934` */
export const FONT_SET_DEFAULTS: FontSetSettings = {
  ztHierarych: [92, 48, 36, 24, 15, 12],
  ztPasteFont: {
    scriptFamily: true,
    color: true,
    opacity: true,
    size: true,
    leading: true,
    tracking: true
  },
  ztCreateButton: { type: 2, isLine: false, padding: '10,20' },
  ztTranslate: { from: 'auto', to: 'auto', delete: true },
  ztDistributedIsFixed: false,
  ztDistributionFilter: true,
  ztDefaultSize: [6, 8, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48, 60, 72, 84, 96, 108, 120],
  ztDefaultLeading: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.5],
  ztDefaultTracking: [-100, -50, -25, 0, 25, 50, 75, 100, 200, 300, 500, 1000],
  ztShowQuick: true,
  ztShowCustom: true,
  ztPreview: 0,
  ztExpandMultiple: true,
  ztOldVersion: false,
  appUnit: 'px'
};

/** 层级固定 6 级（原版就是 6 个输入框，多一个少一个都无法应用） */
const LEVEL_COUNT = 6;

export interface HierarchyPreset {
  name: string;
  data: number[];
}

export interface HierarchyFile {
  index: number;
  list: HierarchyPreset[];
}

export interface TranslateCounter {
  num: number;
  /** 上限；文件里缺或为 0 时按 `DAILY_LIMIT` 兜 */
  max: number;
  /** 原版 `getTime()`：日 + 年 + 月拼在一起，如 `21202610` */
  time: string;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isFiniteNumber);
}

/** 6 级字号：不多不少、全部为正数 */
export function validateLevels(levels: number[]): Result<number[]> {
  if (!Array.isArray(levels) || levels.length !== LEVEL_COUNT) {
    return failWithDetail(
      'VALIDATION',
      `层级字号必须是 ${LEVEL_COUNT} 级`,
      `levels.length:${levels.length}`
    );
  }
  if (!levels.every((level) => isFiniteNumber(level) && level > 0)) {
    return failWithDetail('VALIDATION', '层级字号必须是大于 0 的数字', `levels:${levels.join(',')}`);
  }
  return ok([...levels]);
}

/**
 * `{ index, list }` 类文件的下标夹取：坏值归 0，越界归末尾。
 *
 * 快捷字体（`sj_ztQuickFont.json`）与层级预设（`sj_ztHierarych.json`）是同一个形状，
 * 原先各写一份私有实现；读取方用同一个函数，坏文件才不会一边夹一边不夹。
 */
export function clampListIndex(index: number, length: number): number {
  if (!Number.isInteger(index) || index < 0) return 0;
  return index >= length ? Math.max(0, length - 1) : index;
}

function readPasteFont(raw: unknown): PasteFontConfig {
  const base = FONT_SET_DEFAULTS.ztPasteFont;
  if (!isRecord(raw)) return { ...base };

  const pick = (key: keyof PasteFontConfig): boolean => {
    const value = raw[key];
    return isBoolean(value) ? value : base[key];
  };

  return {
    scriptFamily: pick('scriptFamily'),
    color: pick('color'),
    opacity: pick('opacity'),
    size: pick('size'),
    leading: pick('leading'),
    tracking: pick('tracking')
  };
}

function readCreateButton(raw: unknown): CreateButtonConfig {
  const base = FONT_SET_DEFAULTS.ztCreateButton;
  if (!isRecord(raw)) return { ...base };

  const type = raw.type === 1 || raw.type === 2 ? raw.type : base.type;
  const isLine = isBoolean(raw.isLine) ? raw.isLine : base.isLine;
  const padding = typeof raw.padding === 'string' && raw.padding ? raw.padding : base.padding;

  return { type, isLine, padding };
}

function readTranslate(raw: unknown): TranslateConfig {
  const base = FONT_SET_DEFAULTS.ztTranslate;
  if (!isRecord(raw)) return { ...base };

  return {
    from: typeof raw.from === 'string' && raw.from ? raw.from : base.from,
    to: typeof raw.to === 'string' && raw.to ? raw.to : base.to,
    delete: isBoolean(raw.delete) ? raw.delete : base.delete
  };
}

function readLevels(raw: unknown, fallback: number[]): number[] {
  if (!isNumberArray(raw)) return [...fallback];
  const checked = validateLevels(raw);
  return checked.status === 'ok' ? checked.value : [...fallback];
}

/** 官方设置对象的 `zt*` 投影：坏字段回落默认值，未知键不在这里出现 */
export function normalizeFontSetSettings(raw: Record<string, unknown>): FontSetSettings {
  const base = FONT_SET_DEFAULTS;

  return {
    ztHierarych: readLevels(raw.ztHierarych, base.ztHierarych),
    ztPasteFont: readPasteFont(raw.ztPasteFont),
    ztCreateButton: readCreateButton(raw.ztCreateButton),
    ztTranslate: readTranslate(raw.ztTranslate),
    ztDistributedIsFixed: isBoolean(raw.ztDistributedIsFixed)
      ? raw.ztDistributedIsFixed
      : base.ztDistributedIsFixed,
    ztDistributionFilter: isBoolean(raw.ztDistributionFilter)
      ? raw.ztDistributionFilter
      : base.ztDistributionFilter,
    ztDefaultSize: isNumberArray(raw.ztDefaultSize) ? [...raw.ztDefaultSize] : [...base.ztDefaultSize],
    ztDefaultLeading: isNumberArray(raw.ztDefaultLeading)
      ? [...raw.ztDefaultLeading]
      : [...base.ztDefaultLeading],
    ztDefaultTracking: isNumberArray(raw.ztDefaultTracking)
      ? [...raw.ztDefaultTracking]
      : [...base.ztDefaultTracking],
    ztShowQuick: isBoolean(raw.ztShowQuick) ? raw.ztShowQuick : base.ztShowQuick,
    ztShowCustom: isBoolean(raw.ztShowCustom) ? raw.ztShowCustom : base.ztShowCustom,
    ztPreview: isFiniteNumber(raw.ztPreview) ? raw.ztPreview : base.ztPreview,
    ztExpandMultiple: isBoolean(raw.ztExpandMultiple)
      ? raw.ztExpandMultiple
      : base.ztExpandMultiple,
    ztOldVersion: isBoolean(raw.ztOldVersion) ? raw.ztOldVersion : base.ztOldVersion,
    appUnit: typeof raw.appUnit === 'string' && raw.appUnit ? raw.appUnit : base.appUnit
  };
}

/**
 * 子对象合并：patch 与**文件里已有的值**合并后再归一。
 *
 * 不直接用 `readXxx(patch)`：那样 patch 里没带的键会被填成默认值，
 * 等于把用户原来设的其它开关悄悄改掉（三个子对象都有多字段）。
 */
function mergeObject(value: unknown, patch: object): Record<string, unknown> {
  return { ...(isRecord(value) ? value : {}), ...patch };
}

/**
 * 写盘前的合并：只替换 `patch` 里出现、且**校验通过**的键。
 *
 * 校验不过就保持原值（不写坏值，也不偷偷写默认值把用户刚改的覆盖掉）。
 * 返回的是完整对象，未知键由 `raw` 原样带过来。
 */
export function mergeFontSetSettings(
  raw: Record<string, unknown>,
  patch: Partial<FontSetSettings>
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...raw };

  if (patch.ztHierarych !== undefined) {
    const checked = validateLevels(patch.ztHierarych);
    if (checked.status === 'ok') next.ztHierarych = checked.value;
  }
  if (patch.ztPasteFont !== undefined) {
    next.ztPasteFont = readPasteFont(mergeObject(next.ztPasteFont, patch.ztPasteFont));
  }
  if (patch.ztCreateButton !== undefined) {
    next.ztCreateButton = readCreateButton(mergeObject(next.ztCreateButton, patch.ztCreateButton));
  }
  if (patch.ztTranslate !== undefined) {
    next.ztTranslate = readTranslate(mergeObject(next.ztTranslate, patch.ztTranslate));
  }
  if (patch.ztDistributedIsFixed !== undefined && isBoolean(patch.ztDistributedIsFixed)) {
    next.ztDistributedIsFixed = patch.ztDistributedIsFixed;
  }
  if (patch.ztDistributionFilter !== undefined && isBoolean(patch.ztDistributionFilter)) {
    next.ztDistributionFilter = patch.ztDistributionFilter;
  }
  if (patch.ztDefaultSize !== undefined && isNumberArray(patch.ztDefaultSize)) {
    next.ztDefaultSize = [...patch.ztDefaultSize];
  }
  if (patch.ztDefaultLeading !== undefined && isNumberArray(patch.ztDefaultLeading)) {
    next.ztDefaultLeading = [...patch.ztDefaultLeading];
  }
  if (patch.ztDefaultTracking !== undefined && isNumberArray(patch.ztDefaultTracking)) {
    next.ztDefaultTracking = [...patch.ztDefaultTracking];
  }
  if (patch.ztShowQuick !== undefined && isBoolean(patch.ztShowQuick)) {
    next.ztShowQuick = patch.ztShowQuick;
  }
  if (patch.ztShowCustom !== undefined && isBoolean(patch.ztShowCustom)) {
    next.ztShowCustom = patch.ztShowCustom;
  }
  if (patch.ztPreview !== undefined && isFiniteNumber(patch.ztPreview)) {
    next.ztPreview = patch.ztPreview;
  }
  if (patch.ztExpandMultiple !== undefined && isBoolean(patch.ztExpandMultiple)) {
    next.ztExpandMultiple = patch.ztExpandMultiple;
  }
  if (patch.ztOldVersion !== undefined && isBoolean(patch.ztOldVersion)) {
    next.ztOldVersion = patch.ztOldVersion;
  }
  if (patch.appUnit !== undefined && typeof patch.appUnit === 'string' && patch.appUnit) {
    next.appUnit = patch.appUnit;
  }

  return next;
}

/** 计数器的「今天」：原版 `getTime()` 是 日 + 年 + 月（不补零，月份从 1 开始） */
export function dayKey(date: Date = new Date()): string {
  return `${date.getDate()}${date.getFullYear()}${date.getMonth() + 1}`;
}

/**
 * 成功翻译一次后的计数器。
 *
 * 跨天先重置成 1（这次就是今天的第 1 次），同一天才 +1。
 * `max` 缺失或非正数时按 `DAILY_LIMIT` 兜——否则 `num >= 0` 会一直成立，翻译永远被拦。
 */
export function bumpCounter(counter: TranslateCounter, today: string): TranslateCounter {
  const max = Number.isFinite(counter.max) && counter.max > 0 ? counter.max : DAILY_LIMIT;

  if (counter.time !== today) return { num: 1, max, time: today };
  return { num: counter.num + 1, max, time: today };
}
