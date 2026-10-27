/**
 * 【范本】常用页在 `sj_set.json` 里的 17 个键（纯函数，零 IO）
 *
 * 新增同类「共用设置文件里的白名单键」照这个结构：白名单 + 投影 + 深合并，三件都在这里。
 *
 * 这 17 个键是**本页唯一允许写的键**：`sj_set.json` 还装着别的页面的设置，
 * 写的时候只能动这里列出的键，其余键（含我们不认识的）必须原样保留。
 *
 * 合并规则：**递归到叶子；数组整体替换；对象逐键合并**。
 * `cyExport` 是嵌套的导出配置，形状由 v2 的子面板自己定，这里不解释、不补默认值——
 * 补默认值等于替官方决定配置，写回去会覆盖用户真正选过的项。
 */

import { isRecord } from '../types/guards';

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
