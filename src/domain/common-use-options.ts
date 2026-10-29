/**
 * 本域（设置白名单 / 默认值）以此为准：`src/domain/common-use-options.ts` 的「白名单 + 默认值表 + 读取函数」，页面与命令层不许再写 `?? false` 一类兜底。
 *
 * 【范本】常用页在 `sj_set.json` 里的 17 个键（纯函数，零 IO）
 *
 * 新增同类「共用设置文件里的白名单键」照这个结构：白名单 + 投影 + 深合并，三件都在这里。
 *
 * 这 17 个键是**本页唯一允许写的键**：`sj_set.json` 还装着别的页面的设置，
 * 写的时候只能动这里列出的键，其余键（含我们不认识的）必须原样保留。
 *
 * 合并规则：**递归到叶子；数组整体替换；对象逐键合并**。
 * `cyExport` 是嵌套的导出配置，形状由 v2 的子面板自己定，这里不解释其内部字段。
 *
 * **默认值只用于「读出生效值」，绝不写回文件**（`13-常用-V2` §1.3 的官方默认）：
 * 读出时缺键 → 官方默认；写回时只写用户真正动过的键（`updateCommonUseOptions` 的补丁语义），
 * 所以不会「替官方决定配置」。
 */

import { isRecord } from '../types/guards';
import { failWithDetail, ok, type Result } from '../types/result';
import { MSG } from './messages';

/** 17 个键，一个不多一个不少（顺序按官方 `sj_set.json` 里的出现顺序） */
export const COMMON_USE_SETTING_KEYS = [
  'cyAutoFillColor',
  'cyClipMaskAutoEmbed',
  'cyDeleteNext',
  'cyDragInAutoEmbed',
  'cyExport',
  'cyShowBatch',
  'cyShowCompress',
  'cyShowSetFolder',
  'cyShowTransformation',
  'cyShowZoom',
  'cyImportToLinkObject',
  'cyLinkObject',
  'cyOpenDranInToLinkObject',
  'cyOptimizeAll',
  'cyOptimizeDeleteAllEmpty',
  'cyOptimizeDeleteAllHide',
  'cyPasetImageAutoEmbed'
] as const;

export type CommonUseSettingKey = (typeof COMMON_USE_SETTING_KEYS)[number];

/* ---------------- 官方默认值（唯一出处） ----------------
   `app.v4.js:65780-65812` 的默认值表。**命令层与面板都不许再各写一份 `?? false` / `?? -1`**：
   缺键与「用户选了默认值」在这里被区分开（缺键由 `missingOptionKeys` 报出，见 `store/common-use`）。 */

/** 17 键里取布尔值的那些（其余是 `cyExport` 整块与 `cyLinkObject` 数值） */
export const COMMON_USE_BOOLEAN_KEYS = [
  'cyAutoFillColor',
  'cyClipMaskAutoEmbed',
  'cyDeleteNext',
  'cyDragInAutoEmbed',
  'cyImportToLinkObject',
  'cyOpenDranInToLinkObject',
  'cyOptimizeAll',
  'cyOptimizeDeleteAllEmpty',
  'cyOptimizeDeleteAllHide',
  'cyPasetImageAutoEmbed',
  'cyShowBatch',
  'cyShowCompress',
  'cyShowSetFolder',
  'cyShowTransformation',
  'cyShowZoom'
] as const;

export type CommonUseBooleanKey = (typeof COMMON_USE_BOOLEAN_KEYS)[number];

/** 布尔键的官方默认值：显隐两键默认**开**，其余默认关（逐条照 `:65780-65812`） */
export const COMMON_USE_BOOLEAN_DEFAULTS: Record<CommonUseBooleanKey, boolean> = {
  cyAutoFillColor: true,
  cyClipMaskAutoEmbed: false,
  cyDeleteNext: false,
  cyDragInAutoEmbed: false,
  cyImportToLinkObject: false,
  cyOpenDranInToLinkObject: false,
  cyOptimizeAll: false,
  cyOptimizeDeleteAllEmpty: false,
  cyOptimizeDeleteAllHide: false,
  cyPasetImageAutoEmbed: false,
  cyShowBatch: false,
  cyShowCompress: false,
  cyShowSetFolder: false,
  cyShowTransformation: true,
  cyShowZoom: true
};

/** `cyLinkObject` 的三个合法值：-1 不存链接 / 1 原始路径 / 2 与 PSD 同目录（官方是**数值**不是字符串） */
export const LINK_OBJECT_VALUES = [-1, 1, 2] as const;
export type LinkObjectValue = (typeof LINK_OBJECT_VALUES)[number];
export const LINK_OBJECT_DEFAULT: LinkObjectValue = -1;

/** `cyExport` 的官方默认整块：11 个字段 + `compress` 的 4 个子键（`:65792-65809`） */
export const EXPORT_CONFIG_DEFAULTS: Record<string, unknown> = {
  path: '',
  pathType: 2,
  name: '',
  ext: 'JPG',
  quality: 100,
  saveType: 1,
  isNumber: true,
  layerName: false,
  png8: false,
  autoOpenFolder: true,
  compress: { width: '', height: '', watermark: '', exportOriginalGraph: false }
};

/** 取一个布尔设置的**生效值**：文件里是布尔就用它，否则用官方默认 */
export function booleanOptionOf(options: CommonUseOptions, key: CommonUseBooleanKey): boolean {
  const value = options[key];
  return typeof value === 'boolean' ? value : COMMON_USE_BOOLEAN_DEFAULTS[key];
}

/** 取 `cyLinkObject` 的生效值：只认 -1 / 1 / 2，其它（含缺键、字符串 `'none'`）一律回默认 */
export function linkObjectOf(options: CommonUseOptions): LinkObjectValue {
  const value = options.cyLinkObject;
  return (LINK_OBJECT_VALUES as readonly unknown[]).includes(value)
    ? (value as LinkObjectValue)
    : LINK_OBJECT_DEFAULT;
}

/**
 * 取 `cyExport` 的生效整块：**官方默认 + 文件里的值逐键合并**。
 *
 * 传整块给 jsx 是官方语义（`getKey("cyExport")`），所以这里必须补齐缺键；
 * 但补出来的默认值**不写回文件**，用户设置里仍只有他动过的键。
 */
export function exportConfigOf(options: CommonUseOptions): Record<string, unknown> {
  const raw = options.cyExport;
  return mergeCommonUseOptions(EXPORT_CONFIG_DEFAULTS, isRecord(raw) ? raw : {});
}

/** 文件里缺了哪些键（供 store 报「N 项设置缺失，已用官方默认」） */
export function missingOptionKeys(options: CommonUseOptions): CommonUseSettingKey[] {
  return COMMON_USE_SETTING_KEYS.filter((key) => typeof options[key] === 'undefined');
}

/** 投影形状：17 个键都在，缺的值为 `undefined`（缺键 ≠ 用户关掉了它） */
export type CommonUseOptions = Record<CommonUseSettingKey, unknown>;

export function isCommonUseSettingKey(key: string): key is CommonUseSettingKey {
  return (COMMON_USE_SETTING_KEYS as readonly string[]).includes(key);
}

/**
 * 从整份 `sj_set.json` 里挑出 17 个键。
 *
 * 缺键给 `undefined` 而**不是 `false`**：显隐类开关判定统一写 `!== false`
 * （官方默认开），否则「文件里没有这个键」会被读成「用户关掉了」。
 */
export function pickCommonUseOptions(raw: Record<string, unknown>): CommonUseOptions {
  const picked = {} as CommonUseOptions;
  for (const key of COMMON_USE_SETTING_KEYS) picked[key] = raw[key];
  return picked;
}

function mergeValue(base: unknown, patch: unknown): unknown {
  /* 对象逐键合并；数组是对象但必须整体替换（`cyExport.ext` 这种列表不能按下标合并） */
  if (isRecord(patch)) {
    const baseObject = isRecord(base) ? base : {};
    const next: Record<string, unknown> = { ...baseObject };
    for (const [key, value] of Object.entries(patch)) {
      next[key] = mergeValue(baseObject[key], value);
    }
    return next;
  }
  return patch;
}

/**
 * 把 `patch` 合并进整份设置对象，返回**整份**（未知键原样带回）。
 *
 * 返回值要直接写盘，所以必须是整份而不是补丁——只写补丁会把其它页面的键清空。
 */
export function mergeCommonUseOptions(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    merged[key] = mergeValue(base[key], value);
  }
  return merged;
}

/** `cyExport.compress` 下允许写的 4 个键（`13-常用-V2` §4.5）；其余二级路径一律拒 */
export const EXPORT_COMPRESS_KEYS = ['width', 'height', 'watermark', 'exportOriginalGraph'] as const;

/** `compress` 的 4 个子键（从常量派生，别在调用方再抄一遍字面量联合） */
export type ExportCompressKey = (typeof EXPORT_COMPRESS_KEYS)[number];

/**
 * 把「点路径 + 值」变成写盘用的嵌套补丁；路径不在白名单就返回 `VALIDATION`。
 *
 * 只允许三种深度：`<键>` / `<键>.<一级子键>` / `cyExport.compress.<4 键>`。
 * 白名单之外的路径必须**落成失败**而不是「拼一个出来试试」：`sj_set.json` 是全客户端共用的，
 * 写进未知键可能让官方读配置时整份判坏。
 */
export function optionPatchOf(path: string, value: unknown): Result<Record<string, unknown>> {
  const [head, child, grandChild, ...rest] = path.split('.');
  if (!head || !isCommonUseSettingKey(head)) {
    return failWithDetail('VALIDATION', MSG.badArgument, path);
  }
  if (rest.length > 0) return failWithDetail('VALIDATION', MSG.badArgument, path);
  if (child === '') return failWithDetail('VALIDATION', MSG.badArgument, path);

  if (grandChild === undefined) {
    return ok(child === undefined ? { [head]: value } : { [head]: { [child]: value } });
  }
  if (head !== 'cyExport' || child !== 'compress') {
    return failWithDetail('VALIDATION', MSG.badArgument, path);
  }
  if (!(EXPORT_COMPRESS_KEYS as readonly string[]).includes(grandChild)) {
    return failWithDetail('VALIDATION', MSG.badArgument, path);
  }
  return ok({ [head]: { compress: { [grandChild]: value } } });
}
