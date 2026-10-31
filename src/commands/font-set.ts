/**
 * 字面板命令层（20 条）
 *
 * 一个命令 = 一个业务动作，页面/快捷键/自由面板共用同一批函数名（不建注册表）。
 * 三条硬规则（`CONVENTIONS` §9）：不碰 DOM、不弹 toast、只返回 `Result<T>`。
 *
 * 写入顺序固定（计划 §3.8）：先校验 → 先写 PS → 再写本地文件 → 才回 `ok`。
 * 任何一步失败原样透传，不换一种说法重包；失败时**不留半成品**（翻译失败不计数、不改文档）。
 *
 * payload 形状由计划 §3.6 的映射表冻结：`align` / `textAlign` 的参数就是自由面板将来要喂的键。
 */

import { jsonpGet } from '../core/http/jsonp';
import { MSG } from '../types/messages';
import { log } from '../core/logger';
import { applyFont, checkFontUsable, getFontInfo } from '../core/ps/font';
import {
  alignHorizontal as alignHorizontalJsx,
  createButton as createButtonJsx,
  distributeByPitch,
  getCurrentFontFamily,
  getCurrentTextRaw,
  pickTextColor,
  setAllCaps,
  setBackgroundAlign,
  setFauxBold,
  setFauxItalic,
  setFontName,
  setFontVision,
  setHierarchySize as setHierarchySizeJsx,
  setHorizontalCenters,
  setJustified,
  setLeading as setLeadingJsx,
  setNumberSize,
  setTextAlignment,
  setTextUpDownAlign,
  setTracking as setTrackingJsx,
  setTranslateText,
  textBranchMerge,
  setVerticalCenter
} from '../core/ps/text';
import {
  dayKey,
  validateLevels,
  type CreateButtonConfig,
  type FontSetSettings,
  type HierarchyPreset,
  type PasteFontConfig
} from '../domain/font-set';
import {
  getFontClipboard,
  hasFontClipboard,
  setFontClipboard
} from '../domain/font-set-clipboard';
import {
  canAddQuickFont,
  deleteQuickFont,
  selectQuickFont,
  toQuickFont,
  type QuickFont
} from '../domain/quick-font';
import { normalizeTextColor, type RgbColor } from '../domain/text-info';
import {
  buildTranslateParams,
  DAILY_LIMIT,
  decodeText,
  encodeText,
  MAX_TEXT_LENGTH,
  decodeTranslateItems,
  decodeTranslateResponse,
  TRANSLATE_URL
} from '../domain/translate';
import { readSystemFontCache } from '../repo/font-repo';
import {
  bumpTranslateCounter,
  pushFontHistory,
  readHierarchy,
  readTranslateCounter,
  updateFontSetSettings,
  updateHierarchy,
  updateQuickFonts
} from '../repo/font-set-repo';
import { isRecord } from '../types/guards';
import { fail, failWithDetail, ok, type Result } from '../types/result';

export type AlignAxis = 'h' | 'v' | 'bg-h' | 'bg-v';

/** 最近字体写失败不影响字体已应用（用户看不到「字体没换」这种假故障） */
function rememberFamily(family: string): void {
  void pushFontHistory(family).then((result) => {
    if (result.status === 'error') {
      log.warn('最近字体写入失败', { family, reason: result.reason });
    }
  });
}

/* ---------------- 对齐 ---------------- */

/**
 * 底部 12 个对齐图标 / 与背景对齐。
 *
 * `index` 只有 0~2 有意义；`3` 是「分布」位的走法（水平居中分布 / 垂直平均分布）。
 * 枚举外的轴向**直接拒绝**——不猜默认行为，猜错等于拿别的对齐去动用户文档。
 */
export function align(axis: AlignAxis, index?: number): Promise<Result<void>> {
  if (axis === 'h') {
    if (index === 3) return setHorizontalCenters();
    if (index === undefined) {
      return Promise.resolve(failWithDetail('VALIDATION', MSG.badArgument, 'axis:h index:none'));
    }
    return setTextAlignment(index);
  }

  if (axis === 'v') {
    if (index === 3) return setVerticalCenter();
    if (index === undefined) {
      return Promise.resolve(failWithDetail('VALIDATION', MSG.badArgument, 'axis:v index:none'));
    }
    return setTextUpDownAlign(index);
  }

  if (axis === 'bg-h') return setBackgroundAlign(3);
  if (axis === 'bg-v') return setBackgroundAlign(4);

  return Promise.resolve(
    failWithDetail('VALIDATION', MSG.badArgument, `axis:${String(axis)} legal:h/v/bg-h/bg-v`)
  );
}

/** 属性面板的 3 个对齐按钮：Ctrl = 段落对齐，Shift = 点文本（两处修饰键语义不同，别混） */
export function textAlign(
  index: number,
  options: { paragraph: boolean; shift?: boolean }
): Promise<Result<void>> {
  if (options.paragraph) return setJustified(index);
  return setTextAlignment(index, options.shift);
}

/** 水平垂直居中对齐（第二入口专用，本页没有按钮） */
export function alignHorizontal(): Promise<Result<void>> {
  return alignHorizontalJsx();
}

/* ---------------- 分布 / 拆分 / 生成 ---------------- */

/** 按间距分布：空值拦在前端，不要让它进 jsx */
export function distribute(axis: 1 | 2, value: string, filter: boolean): Promise<Result<void>> {
  const text = value.trim();
  if (!text) return Promise.resolve(fail('VALIDATION', MSG.common.needGap));
  return distributeByPitch(axis, text, filter);
}

/**
 * 拆分 / 合并。
 *
 * 原版「先探一次再执行」的那一步（`zt_changeTextBranchMerge`）在真机上直接抛
 * 「没有这种元素」（2026-10-28 日志）——它只是原版派发表的 key，不是可调函数，
 * 已从能力表和探测清单移除。现在只调真正执行的 `zt_textBranchMerge`：
 * 不能执行时 PS 自己会返回错误，解析会把它变成失败，不会假成功。
 */
export function split(mode: 1 | 2 | 3 | 4): Promise<Result<void>> {
  return textBranchMerge(mode);
}

/** 生成按钮：`padding` 是形状内边距表达式，空值会让 jsx 内部抛异常 */
export function createButton(config: CreateButtonConfig): Promise<Result<void>> {
  if (typeof config.padding !== 'string' || !config.padding.trim()) {
    return Promise.resolve(fail('VALIDATION', MSG.font.needButtonPadding));
  }
  if (config.type !== 1 && config.type !== 2) {
    return Promise.resolve(failWithDetail('VALIDATION', MSG.badArgument, `type:${String(config.type)}`));
  }
  return createButtonJsx({ type: config.type, isLine: config.isLine, padding: config.padding.trim() });
}

/* ---------------- 复制 / 粘贴文字属性 ---------------- */

/** 复制：读成功才写剪贴板；失败直接透传（剪贴板保留上一次的内容） */
export async function copyFont(): Promise<Result<void>> {
  const info = await getFontInfo();
  if (info.status === 'error') return info;

  setFontClipboard(info.value);
  return ok(undefined);
}

/**
 * 粘贴：勾掉的字段在 `fonts[]` 每项上置 `null`（原版语义），再先检查后应用。
 *
 * 深拷贝后再改：改到剪贴板里的原对象，下一次粘贴就会缺字段。
 */
export async function pasteFont(keeps: PasteFontConfig): Promise<Result<void>> {
  if (!hasFontClipboard()) return fail('VALIDATION', MSG.font.copyStyleFirst);

  const source = getFontClipboard();
  if (!source) return fail('VALIDATION', MSG.font.copyStyleFirst);

  const clone = structuredClone(source);
  const fonts = Array.isArray(clone.fonts) ? clone.fonts.filter(isRecord) : [];

  for (const [key, keep] of Object.entries(keeps)) {
    if (keep) continue;
    for (const font of fonts) font[key] = null;
  }

  const usable = await checkFontUsable(clone);
  if (usable.status === 'error') return usable;

  return applyFont(clone);
}



/* ---------------- 翻译 ---------------- */

/**
 * 翻译：计数 → 读文本 → 逐段请求 → 写回 → 计数 +1。
 *
 * 顺序不能反：写回失败不改文档也不计数；计数读坏按 0 次放行（读坏不阻断用户干活）。
 * 失败码 `NETWORK` / `TIMEOUT` 原样透传，原文一个字都不动。
 */
export async function translate(input: {
  from: string;
  to: string;
  replace: boolean;
}): Promise<Result<void>> {
  const counterRead = readTranslateCounter();
  if (counterRead.status === 'error') {
    log.warn('翻译计数读取失败，本次按 0 次处理', { reason: counterRead.reason });
  }

  const counter = counterRead.status === 'ok' ? counterRead.value : null;
  const max = counter && counter.max > 0 ? counter.max : DAILY_LIMIT;
  if (counter && counter.num >= max) {
    return failWithDetail('VALIDATION', MSG.font.translateLimit, `max:${max}`);
  }

  const raw = await getCurrentTextRaw();
  if (raw.status === 'error') return raw;

  const items = decodeTranslateItems(raw.value);
  if (items.status === 'error') return items;
  if (items.value.length === 0) return fail('VALIDATION', MSG.font.noTextToTranslate);

  const sources = items.value.map((item) => decodeText(item.text));
  const total = sources.reduce((sum, text) => sum + text.length, 0);
  if (total > MAX_TEXT_LENGTH) {
    return failWithDetail(
      'VALIDATION',
      `文本长度不能超过 ${MAX_TEXT_LENGTH} 个字符`,
      `length:${total}`
    );
  }

  for (let index = 0; index < items.value.length; index += 1) {
    const source = sources[index] ?? '';
    const response = await jsonpGet(
      TRANSLATE_URL,
      buildTranslateParams({ text: source, from: input.from, to: input.to })
    );
    if (response.status === 'error') return response;

    const parsed = decodeTranslateResponse(response.value);
    if (parsed.status === 'error') return parsed;

    const item = items.value[index];
    if (item) item.dst = encodeText(parsed.value);
  }

  const written = await setTranslateText(items.value, input.replace);
  if (written.status === 'error') return written;

  /* 计数写失败只记日志：文档已经改好了，不能因为计数提示失败让用户以为没翻译 */
  const counted = await bumpTranslateCounter(dayKey());
  if (counted.status === 'error') {
    log.warn('翻译计数写入失败', { reason: counted.reason });
  }

  return ok(undefined);
}

/* ---------------- 字号 / 行距 / 字距 / 颜色 ---------------- */

/** 字号：必须是正数，否则 jsx 会写入 0 号字 */
export function setFontSize(value: number): Promise<Result<void>> {
  if (!Number.isFinite(value) || value <= 0) {
    return Promise.resolve(fail('VALIDATION', MSG.font.fontSizePositive));
  }
  return setNumberSize(value);
}

/** 层级字号（6 个按钮） */
export function setHierarchySize(value: number): Promise<Result<void>> {
  if (!Number.isFinite(value) || value <= 0) {
    return Promise.resolve(fail('VALIDATION', MSG.font.hierarchySizePositive));
  }
  return setHierarchySizeJsx(value);
}

/** 行距：0 是合法值（PS 里表示自动之外的最小行距） */
export function setLeading(value: number): Promise<Result<void>> {
  if (!Number.isFinite(value) || value < 0) {
    return Promise.resolve(fail('VALIDATION', MSG.font.leadingNotNegative));
  }
  return setLeadingJsx(value);
}

/** 字距：负数合法（收紧），只拦非数字 */
export function setTracking(value: number): Promise<Result<void>> {
  if (!Number.isFinite(value)) {
    return Promise.resolve(fail('VALIDATION', MSG.font.trackingNumber));
  }
  return setTrackingJsx(value);
}

/** 取色：返回取色器给的 rgb；用户取消时 PS 侧返回原值或空，由页面决定是否 patch */
export async function pickColor(): Promise<Result<RgbColor>> {
  const raw = await pickTextColor();
  if (raw.status === 'error') return raw;
  return ok(normalizeTextColor(raw.value));
}

/** 4 个开关：大写 / 视觉调整 / 倾斜 / 加粗 */
export function setStyle(
  kind: 'caps' | 'kerning' | 'italic' | 'bold',
  value: boolean
): Promise<Result<void>> {
  if (kind === 'caps') return setAllCaps(value);
  if (kind === 'kerning') return setFontVision(value ? 'opticalKern' : 'manual');
  if (kind === 'italic') return setFauxItalic(value);
  return setFauxBold(value);
}

/* ---------------- 换字体 / 快选 / 层级预设 ---------------- */

/**
 * 应用一个字面并记入最近字体。
 *
 * `err === 1` 由 `core/ps/text` 折成 `VALIDATION`，原因取宿主的 `msg`
 * （「请选择文字图层」/ 字体缺失是两回事）；这里不再弹下载、不给外链（任何版本都不做）。
 */
export async function applyFontName(input: {
  postScriptName: string;
  name: string;
  weight: string;
  family?: string;
}): Promise<Result<void>> {
  if (!input.postScriptName) return fail('VALIDATION', MSG.font.missingPostScript);

  const applied = await setFontName(input.postScriptName, input.name, input.weight);
  if (applied.status === 'error') return applied;

  if (input.family) rememberFamily(input.family);
  return ok(undefined);
}

export type QuickFontAction =
  | { action: 'add' }
  | { action: 'apply'; font: QuickFont; weightIndex: number }
  | { action: 'select'; index: number }
  | { action: 'delete'; index: number };

/** 快捷字体：加当前图层 / 应用某字重 / 切索引 / 删 */
export async function quickFont(action: QuickFontAction): Promise<Result<void>> {
  if (action.action === 'apply') {
    const { font, weightIndex } = action;
    const postScriptName = font.hjm[weightIndex];
    const name = font.mz[weightIndex];
    const weight = font.zz[weightIndex];

    if (!postScriptName || !name || !weight) {
      return failWithDetail(
        'VALIDATION',
        `「${font.family}」第 ${weightIndex + 1} 个字重数据不完整，无法应用`,
        `index:${weightIndex}`
      );
    }

    const applied = await setFontName(postScriptName, name, weight);
    if (applied.status === 'error') return applied;

    rememberFamily(font.family);
    return ok(undefined);
  }

  if (action.action === 'select') {
    return updateQuickFonts((file) => selectQuickFont(file, action.index));
  }

  if (action.action === 'delete') {
    return updateQuickFonts((file) => deleteQuickFont(file, action.index));
  }

  /* add：当前图层字体 → 系统字体缓存里补全字重 → 去重 / 上限 */
  const info = await getCurrentFontFamily();
  if (info.status === 'error') return info;

  const family = info.value;

  const cache = readSystemFontCache();
  if (cache.status === 'error') {
    return failWithDetail(
      cache.code,
      '读不到系统字体缓存，请先到「字体管理」刷新字体列表',
      cache.detail
    );
  }

  const hit = cache.value.fonts.find((item) => item.family === family);
  if (!hit) return failWithDetail('VALIDATION', MSG.font.fontNotInSystem, `family:${family}`);

  const next = toQuickFont(hit);
  return updateQuickFonts((file) => {
    const gate = canAddQuickFont(file.list, family);
    if (gate.status === 'error') return gate;
    return ok({ index: file.list.length, list: [...file.list, next] });
  });
}

export type HierarchyPresetAction =
  | { action: 'save'; levels: number[] }
  | { action: 'create'; name: string; levels: number[] }
  | { action: 'rename'; index: number; name: string }
  | { action: 'delete'; index: number }
  | { action: 'select'; index: number };

/** 层级预设：6 级校验在这里，repo 只负责读改写 */
export async function hierarchyPreset(action: HierarchyPresetAction): Promise<Result<void>> {
  const current = readHierarchy();
  if (current.status === 'error') return current;

  const presets = current.value.list;
  const inRange = (index: number): boolean => index >= 0 && index < presets.length;

  if (action.action === 'select') {
    if (!inRange(action.index)) {
      return failWithDetail('VALIDATION', MSG.stale, `preset:switch index:${action.index}`);
    }
    return updateHierarchy((file) => ok({ ...file, index: action.index }));
  }

  if (action.action === 'rename') {
    const name = action.name.trim();
    if (!name) return fail('VALIDATION', MSG.font.needPresetName);
    if (!inRange(action.index)) {
      return failWithDetail('VALIDATION', MSG.stale, `preset:rename index:${action.index}`);
    }
    return updateHierarchy((file) =>
      ok({
        ...file,
        list: file.list.map((preset, position) =>
          position === action.index ? { ...preset, name } : preset
        )
      })
    );
  }

  if (action.action === 'delete') {
    if (!inRange(action.index)) {
      return failWithDetail('VALIDATION', MSG.stale, `preset:delete index:${action.index}`);
    }
    if (presets.length <= 1) return fail('VALIDATION', MSG.font.keepOnePreset);
    return updateHierarchy((file) =>
      ok({ index: 0, list: file.list.filter((_, position) => position !== action.index) })
    );
  }

  const levels = validateLevels(action.levels);
  if (levels.status === 'error') return levels;

  if (action.action === 'create') {
    const name = action.name.trim();
    if (!name) return fail('VALIDATION', MSG.font.needPresetName);

    const next: HierarchyPreset = { name, data: levels.value };
    return updateHierarchy((file) => ok({ index: file.index, list: [...file.list, next] }));
  }

  /* save：用当前 6 级覆盖当前选中的预设 */
  if (!inRange(current.value.index)) {
    return fail('VALIDATION', MSG.font.noPresetToOverwrite);
  }
  return updateHierarchy((file) =>
    ok({
      ...file,
      list: file.list.map((preset, position) =>
        position === file.index ? { ...preset, data: levels.value } : preset
      )
    })
  );
}

/* ---------------- 设置 ---------------- */

/** 落盘设置；本地已先生效，失败时页面 toast「设置未保存」，输入值不回滚 */
export function saveSettings(patch: Partial<FontSetSettings>): Promise<Result<void>> {
  return updateFontSetSettings(patch);
}
