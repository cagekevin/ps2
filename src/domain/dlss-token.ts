/**
 * DLSS 参数 token：参数 → 图层名里那段机器可读文本的唯一编码处。
 *
 * **纯逻辑**（零 IO / 零 DOM / 零 PS），移植自原插件 `js/params.js`，语义逐字不变。
 * 为什么必须能单测：token 会写进用户的 PSD 图层名，几个月后才读回来，
 * 解析 bug 是**永久性**的 —— 少读一个键，用户下次打开就少一档设置。
 *
 * token 形状（方括号里全部机器可读，键序 = `PKEYS`）：
 *   `<名> · DLSS NR 2x [NR5 sc2 i1.5 d1 c1 ls1 lt1 sk-1 st0 srdefault am0 ui0]`
 *
 * 字符集只允许「PS 图层名与 Windows 文件名都能活下来」的那些（字母 / 数字 / 空格 /
 * `· [ ] , . - _`）：结果尺寸变大时同一串会变成新文档名，jsx 的 `mm_dlss_safeName`
 * 会把其余字符改写成 `_`，那样 token 就毁了 —— 所以本文件里**不许出现** `:` 或 `|`。
 *
 * 本轮**只做编码**。读回（`dlssTokenOf`）与预设比对（`dlssSameParams`）归阶段 2/3，
 * 现在写就是零消费者的代码。原插件的 `TOKEN_VER` / `PRESET_KEYS` 也不迁：前者只服务
 * `makeToken`（已内联），后者只服务 `sameParams`。
 */

import type { DlssLook, DlssParams } from '../types/dlss';

/** 内置档位（照抄原插件 `BUILTIN`，数值是面板原来的硬编码值；不含输出尺寸） */
export type DlssPresetName = 'light' | 'standard' | 'max' | 'portrait' | 'cinema';

export const DLSS_BUILTIN: Record<DlssPresetName, DlssLook> = {
  light: { i: 0.8, d: 1.0, c: 1.0, ls: 1.0, lt: 1.0, sk: -1, st: 0, sr: 'default', am: 0, ui: 0 },
  standard: { i: 1.5, d: 1.0, c: 1.0, ls: 1.0, lt: 1.0, sk: -1, st: 0, sr: 'default', am: 0, ui: 0 },
  max: { i: 2.0, d: 1.2, c: 1.0, ls: 1.2, lt: 1.2, sk: -1, st: 0, sr: 'default', am: 0, ui: 0 },
  portrait: { i: 1.2, d: 1.0, c: 1.0, ls: 1.0, lt: 1.0, sk: 0.5, st: 1, sr: 'default', am: 0, ui: 0 },
  cinema: { i: 2.0, d: 1.0, c: 1.0, ls: 1.0, lt: 1.0, sk: -1, st: 2, sr: 'default', am: 0, ui: 0 }
};

/** 写入顺序 = 读回时认的键集合；顺序变化会让同一组参数写出两种串 */
const PKEYS = ['sc', 'w', 'i', 'd', 'c', 'ls', 'lt', 'sk', 'st', 'sr', 'am', 'ui'] as const;

/**
 * 数字 → token 文本：`1.50 → 1.5`、`1 → 1`、`-1 → -1`。
 *
 * `-0` 必须写成 `0`：`(-0).toFixed(2)` 给的是 `"-0.00"`，读回来是 `-0`，
 * 与 `0` 虽然相等，但两种串会让「同一组参数」看起来不一样。
 */
function fmtNum(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  const text = n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return text === '' || text === '-0' ? '0' : text;
}

/** 布尔 → 0/1（原插件同时接受 `true` / `1` / `'1'` / `'true'`） */
function flag(value: unknown): 0 | 1 {
  return value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0;
}

/** `{ i: 1.5, am: 1, … }` → `'i1.5 d1 …'`（只写出现过的键） */
export function dlssTokenBody(params: DlssParams): string {
  const parts: string[] = [];
  for (const key of PKEYS) {
    const value = params[key];
    if (value === undefined || value === null) continue;
    if (key === 'sr') parts.push('sr' + String(value));
    else if (key === 'am' || key === 'ui') parts.push(key + flag(value));
    else if (key === 'st') parts.push('st' + String(Math.trunc(Number(value))));
    else parts.push(key + fmtNum(Number(value)));
  }
  return parts.join(' ');
}

/**
 * 去掉旧后缀，得到可读的名字底：`'L · DLSS NR 2x [NR5 …]'` → `'L'`。
 *
 * 不清就会越跑越长（对结果层再跑一次时叠加）。
 */
function baseName(name: string): string {
  return String(name ?? '')
    .replace(/\s*\[NR\d+[^\]]*\]/g, '')
    .replace(/\s*·\s*DLSS NR[^[\]]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 结果层名：`'<名> · DLSS NR 2x [NR5 …]'`；有宽度时写 `1024px` 而不是倍率 */
export function dlssResultName(name: string, params: DlssParams): string {
  const base = baseName(name) || 'Layer';
  const width = params.w;
  const size = width !== undefined && width > 0 ? `${width}px` : `${fmtNum(params.sc ?? 0)}x`;
  return `${base} · DLSS NR ${size} [NR5 ${dlssTokenBody(params)}]`;
}
