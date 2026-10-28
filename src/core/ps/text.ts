/**
 * 【范本】PS 文本属性能力（字体面板页）
 *
 * 25 个 jsx 函数里本文件承载 4 读 + 21 写；`ys_getFontInfo` / `ys_checkUseFont` /
 * `ys_useFont` 已在 `core/ps/font.ts`，**不在这里再包一层**。
 * `zt_changeTextBranchMerge` 已删（真机抛「没有这种元素」，是派发表 key 不是函数）。
 *
 * 通道：全部直调 `jsx()`（原版 `jsx` / `jsxWrite`），**不走 `ps_onJsx`**；
 * 门 / 前置 / 超时 / 解析都在能力表（`./capabilities.ts`）里，本文件只负责「参数怎么拼」
 * 与「返回值交给谁」——不许再本地包一层 gate 或解析。
 * 参数一律明文——只有 `ys_*` 两条要 `encodeText`，给 `zt_*` 编码会写出乱码字体名。
 * 函数清单、两处原版拼写错误、`hostCode === 1` 的含义见 `docs/PS-CHANNEL-NOTES.md` §11.3。
 *
 * 三条硬边界：
 *   1. **不 import `domain`**（依赖表禁止）：读函数只返回 raw / 已拆 `data` 的载荷，归一化在 domain
 *   2. **返回结构全部 UNVERIFIED**：写函数用 `lenientVoid`，只把「能识别的失败」当失败
 *      （约定值、`{err:1}`），认不出结构时按成功处理——真机验完必须收紧，别让宽松解析变成永久契约
 *   3. **属性类读函数先判「当前图层是文字图层」**（表里的 `require`）：非文字图层上 PS 不是
 *      返回 `{err:1}`，而是直接抛「命令"获取"当前不可用」，那句话会被当成失败原因显示给用户
 */

import type { Result } from '../../types/result';
import { callCapability } from './capability';
import { CAP } from './capabilities';

/* ---------------- 读（返回 raw / 已拆 data 的载荷） ---------------- */

/**
 * 当前文字图层属性快照（`zt_getFontSimpleInfo`）。
 *
 * **`err !== 0` 必须当失败**：原版 `selectLayer` 只在该值为 0 时才覆盖面板
 * （`app.v4.js:42523` 一带）。若把 `{ err: 1, data: {...} }` 的 data 直接交出去，
 * 非文字图层上会拿上一次的残留字段当新值，面板数字看着变了其实图层没变。
 */
export function getTextInfoRaw(): Promise<Result<unknown>> {
  return callCapability(CAP.textInfo);
}

/**
 * 当前图层的字体家族名（`zt_getCurrentFontInfo`）：字体快选「加当前图层」用。
 *
 * 返回 `string` 而不是 `unknown`：形状收窄在 `raw.parseFontFamily`，
 * 消费者不再自己判 `isRecord` / 字段类型（`ADR-0003` 防御归属）。
 * 「没有 family」在 `raw.parseFontFamily` 里就报失败，调用方拿到的 `string` 一定非空。
 */
export function getCurrentFontFamily(): Promise<Result<string>> {
  return callCapability(CAP.currentFontInfo);
}

/** 当前选中的文字段（`zt_getCurrentText`）：翻译的输入，条目里有混淆过的 `text` */
export function getCurrentTextRaw(): Promise<Result<unknown>> {
  return callCapability(CAP.currentText);
}

/**
 * 取色（`zt_setFontColor`，无参）：PS 会拉起系统取色器，返回值是 `{ rgb }` 而不是成功标志。
 * 用户可能在取色器里停留很久，60s 超时后队列放行但 PS 侧可能仍在执行——页面要给重试。
 */
export function pickTextColor(): Promise<Result<unknown>> {
  return callCapability(CAP.textColor);
}

/* ---------------- 写（全部 Result<void>） ---------------- */

/**
 * 换字面（`zt_setFontName(hjm, mz, zz)`）。
 *
 * `err === 1` 不止「字体缺失」：没选中文字图层时宿主给 `{err:1, msg:"请选择文字图层"}`，
 * 原因取宿主 `msg`，兜底才是「字体不可用」。
 */
export function setFontName(
  postScriptName: string,
  name: string,
  weight: string
): Promise<Result<void>> {
  return callCapability(CAP.setFontName, [postScriptName, name, weight]);
}

/** 面板输入的字号（`layer_font_setFontSize`），与层级字号是两条 jsx */
export function setNumberSize(value: number): Promise<Result<void>> {
  return callCapability(CAP.setNumberSize, [value]);
}

/** 层级字号（`zt_setFontSize`） */
export function setHierarchySize(value: number): Promise<Result<void>> {
  return callCapability(CAP.setHierarchySize, [value]);
}

/** 行距（`layer_font_setLeading`） */
export function setLeading(value: number): Promise<Result<void>> {
  return callCapability(CAP.setLeading, [value]);
}

/** 字距（`zt_setFontWordSpacing`） */
export function setTracking(value: number): Promise<Result<void>> {
  return callCapability(CAP.setTracking, [value]);
}

/** 全部大写（`zt_setFontAllCaps`） */
export function setAllCaps(value: boolean): Promise<Result<void>> {
  return callCapability(CAP.setAllCaps, [value]);
}

/** 文字视觉调整（`zt_setFontVision`）：`manual` 关闭 / `opticalKern` 开启 */
export function setFontVision(mode: 'manual' | 'opticalKern'): Promise<Result<void>> {
  return callCapability(CAP.setFontVision, [mode]);
}

/** 倾斜（`zt_setFauxItali`，原版拼写照抄） */
export function setFauxItalic(value: boolean): Promise<Result<void>> {
  return callCapability(CAP.setFauxItalic, [value]);
}

/** 加粗（`zt_setFontAddBold`） */
export function setFauxBold(value: boolean): Promise<Result<void>> {
  return callCapability(CAP.setFauxBold, [value]);
}

/** 段落对齐（`zt_setFontJustified`）：属性面板 Ctrl+点击才走这条 */
export function setJustified(index: number): Promise<Result<void>> {
  return callCapability(CAP.setJustified, [index]);
}

/**
 * 点文本对齐（`zt_setTextAlignment`）。
 * **第二参数不传时不能补 `false`**：原版靠「有没有这个参数」区分两种调用。
 */
export function setTextAlignment(index: number, shift?: boolean): Promise<Result<void>> {
  const args = shift === undefined ? [index] : [index, shift];
  return callCapability(CAP.setTextAlignment, args);
}

/** 水平居中分布（`zt_setHorizontalCenters`，参数固定 4） */
export function setHorizontalCenters(): Promise<Result<void>> {
  return callCapability(CAP.setHorizontalCenters, [4]);
}

/** 垂直平均分布（`zt_verticalCenter`，参数固定 5） */
export function setVerticalCenter(): Promise<Result<void>> {
  return callCapability(CAP.setVerticalCenter, [5]);
}

/** 顶 / 中 / 底对齐（`zt_setUpDownAlign`） */
export function setTextUpDownAlign(index: number): Promise<Result<void>> {
  return callCapability(CAP.setUpDownAlign, [index]);
}

/** 与背景对齐（`zt_setBackrgoudAlign`，原版拼写照抄）：3 水平 / 4 垂直 */
export function setBackgroundAlign(value: 3 | 4): Promise<Result<void>> {
  return callCapability(CAP.setBackgroundAlign, [value]);
}

/** 水平垂直居中对齐（`zt_alignHorizontal`）：只服务第二入口，本页不放按钮 */
export function alignHorizontal(): Promise<Result<void>> {
  return callCapability(CAP.alignHorizontal);
}

/**
 * 按间距分布（`cy_distributedByPitch`）：axis 1 水平 / 2 垂直，第 3 个参数固定 2。
 * 前置是「≥3 个选中图层」（表里的 `require`），不是「是文字图层」——分布的对象是多个图层。
 */
export function distributeByPitch(
  axis: 1 | 2,
  value: string,
  filter: boolean
): Promise<Result<void>> {
  return callCapability(CAP.distributeByPitch, [axis, value, 2, filter]);
}

/**
 * 拆分/合并（`zt_textBranchMerge`）：1 分行 / 2 分为单个 / 3 合并 / 4 合并为段落。
 *
 * 原版「先探一次」的 `zt_changeTextBranchMerge` 真机一调就抛「没有这种元素」
 * （2026-10-28 日志），确认它只是原版派发表的 key、不是可调函数，已删除。
 */
export function textBranchMerge(mode: 1 | 2 | 3 | 4): Promise<Result<void>> {
  return callCapability(CAP.textBranchMerge, [mode]);
}

/** 生成按钮（`zt_createButton`）：`type` 1 圆角 / 2 直角，`padding` 是「10,20」这类文本 */
export function createButton(config: {
  type: 1 | 2;
  isLine: boolean;
  padding: string;
}): Promise<Result<void>> {
  return callCapability(CAP.createButton, [config]);
}

/** 切换文本方向（`zt_switchFontDirection`） */
export function switchFontDirection(): Promise<Result<void>> {
  return callCapability(CAP.switchFontDirection);
}

/** 写回译文（`zt_setTranslateText`）：`replace` 为真 = 覆盖原文 */
export function setTranslateText(data: unknown, replace: boolean): Promise<Result<void>> {
  return callCapability(CAP.setTranslateText, [data, replace]);
}
