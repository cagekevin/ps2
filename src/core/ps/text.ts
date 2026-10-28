/**
 * 【范本】PS 文本属性能力（字体面板页）
 *
 * 30 个 jsx 函数里本文件承载 4 读 + 23 写；`ys_getFontInfo` / `ys_checkUseFont` /
 * `ys_useFont` 已在 `core/ps/font.ts`，**不在这里再包一层**。
 *
 * 通道：全部直调 `jsx()`（原版 `jsx` / `jsxWrite`），**不走 `ps_onJsx`**；
 * 直调的实现只有一份，在 `./vendor.ts` 的 `runDirect`（与常用页共用，别再本地包一层）。
 * 参数一律明文——只有 `ys_*` 两条要 `encodeText`，给 `zt_*` 编码会写出乱码字体名。
 * 函数清单、两处原版拼写错误、`hostCode === 1` 的含义见 `docs/PS-CHANNEL-NOTES.md` §11.3。
 *
 * 三条硬边界：
 *   1. **不 import `domain`**（依赖表禁止）：读函数只返回 raw / 已拆 `data` 的载荷，归一化在 domain
 *   2. **返回结构全部 UNVERIFIED**：写函数只把「能识别的失败」当失败（约定值、`{err:1}`），
 *      认不出结构时按成功处理——真机验完必须收紧，别让宽松解析变成永久契约
 *   3. **三个读函数先判「当前图层是文字图层」**：非文字图层上 PS 不是返回 `{err:1}`，
 *      而是直接抛「命令"获取"当前不可用」，那句话会被当成失败原因显示给用户
 */

import { callJsx, WRITE_TIMEOUT } from '../cep/bridge';
import { fail, failWithDetail, ok, type Result } from '../../types/result';
import { isRecord } from '../../types/guards';
import { requireVendor } from './init';
import { requireTextLayer } from './layer';
import { dataOf, envelopeMessage, parseDataEnvelope, parseJsxRaw } from './raw';
import { runDirect, UNREADY } from './vendor';

/* ---------------- 读（返回 raw / 已拆 data 的载荷） ---------------- */

/**
 * 当前文字图层属性快照（`zt_getFontSimpleInfo`）。
 *
 * **`err !== 0` 必须当失败**：原版 `selectLayer` 只在该值为 0 时才覆盖面板
 * （`app.v4.js:42523` 一带）。若把 `{ err: 1, data: {...} }` 的 data 直接交出去，
 * 非文字图层上会拿上一次的残留字段当新值，面板数字看着变了其实图层没变。
 */
export async function getTextInfoRaw(): Promise<Result<unknown>> {
  if (!(await requireVendor())) return fail('PS_UNREADY', UNREADY);

  const layer = await requireTextLayer();
  if (layer.status === 'error') return layer;

  const call = await callJsx('zt_getFontSimpleInfo', []);
  if (call.status === 'error') return call;

  const parsed = parseJsxRaw(call.value);
  if (parsed.status === 'error') return parsed;

  const value = parsed.value;
  if (isRecord(value) && typeof value.err === 'number' && value.err !== 0) {
    return failWithDetail(
      'VALIDATION',
      envelopeMessage(value) || '当前图层没有可读的文字属性',
      `err:${value.err}`
    );
  }
  return ok(dataOf(value));
}

/** 当前图层字体信息（`zt_getCurrentFontInfo`）：字体快选「加当前图层」用，只有 `family` 有用 */
export async function getCurrentFontInfoRaw(): Promise<Result<unknown>> {
  if (!(await requireVendor())) return fail('PS_UNREADY', UNREADY);

  const layer = await requireTextLayer();
  if (layer.status === 'error') return layer;

  const call = await callJsx('zt_getCurrentFontInfo', []);
  if (call.status === 'error') return call;
  return parseDataEnvelope(call.value);
}

/** 当前选中的文字段（`zt_getCurrentText`）：翻译的输入，条目里有混淆过的 `text` */
export async function getCurrentTextRaw(): Promise<Result<unknown>> {
  if (!(await requireVendor())) return fail('PS_UNREADY', UNREADY);

  const layer = await requireTextLayer();
  if (layer.status === 'error') return layer;

  const call = await callJsx('zt_getCurrentText', []);
  if (call.status === 'error') return call;
  return parseDataEnvelope(call.value);
}

/* ---------------- 写（全部 Result<void>） ---------------- */

/**
 * 换字面（`zt_setFontName(hjm, mz, zz)`）。
 *
 * `err === 1` 不止「字体缺失」：没选中文字图层时宿主给 `{err:1, msg:"请选择文字图层"}`，
 * 原因由 `runDirect` 取 `msg`，兜底才是「字体不可用」。
 */
export function setFontName(
  postScriptName: string,
  name: string,
  weight: string
): Promise<Result<void>> {
  return runDirect('zt_setFontName', [postScriptName, name, weight], '字体不可用');
}

/** 面板输入的字号（`layer_font_setFontSize`），与层级字号是两条 jsx */
export function setNumberSize(value: number): Promise<Result<void>> {
  return runDirect('layer_font_setFontSize', [value], '当前图层不支持改字号');
}

/** 层级字号（`zt_setFontSize`） */
export function setHierarchySize(value: number): Promise<Result<void>> {
  return runDirect('zt_setFontSize', [value], '当前图层不支持改字号');
}

/** 行距（`layer_font_setLeading`） */
export function setLeading(value: number): Promise<Result<void>> {
  return runDirect('layer_font_setLeading', [value], '当前图层不支持改行距');
}

/** 字距（`zt_setFontWordSpacing`） */
export function setTracking(value: number): Promise<Result<void>> {
  return runDirect('zt_setFontWordSpacing', [value], '当前图层不支持改字距');
}

/**
 * 取色（`zt_setFontColor`，无参）：PS 会拉起系统取色器，返回值是 `{ rgb }` 而不是成功标志。
 * 用户可能在取色器里停留很久，60s 超时后队列放行但 PS 侧可能仍在执行——页面要给重试。
 */
export async function pickTextColor(): Promise<Result<unknown>> {
  if (!(await requireVendor())) return fail('PS_UNREADY', UNREADY);

  const call = await callJsx('zt_setFontColor', [], { timeout: WRITE_TIMEOUT });
  if (call.status === 'error') return call;
  return parseDataEnvelope(call.value);
}

/** 全部大写（`zt_setFontAllCaps`） */
export function setAllCaps(value: boolean): Promise<Result<void>> {
  return runDirect('zt_setFontAllCaps', [value], '当前图层不支持切换大小写');
}

/** 文字视觉调整（`zt_setFontVision`）：`manual` 关闭 / `opticalKern` 开启 */
export function setFontVision(mode: 'manual' | 'opticalKern'): Promise<Result<void>> {
  return runDirect('zt_setFontVision', [mode], '当前图层不支持视觉调整');
}

/** 倾斜（`zt_setFauxItali`，原版拼写照抄） */
export function setFauxItalic(value: boolean): Promise<Result<void>> {
  return runDirect('zt_setFauxItali', [value], '当前图层不支持倾斜');
}

/** 加粗（`zt_setFontAddBold`） */
export function setFauxBold(value: boolean): Promise<Result<void>> {
  return runDirect('zt_setFontAddBold', [value], '当前图层不支持加粗');
}

/** 段落对齐（`zt_setFontJustified`）：属性面板 Ctrl+点击才走这条 */
export function setJustified(index: number): Promise<Result<void>> {
  return runDirect('zt_setFontJustified', [index], '当前图层不支持段落对齐');
}

/**
 * 点文本对齐（`zt_setTextAlignment`）。
 * **第二参数不传时不能补 `false`**：原版靠「有没有这个参数」区分两种调用。
 */
export function setTextAlignment(index: number, shift?: boolean): Promise<Result<void>> {
  const args = shift === undefined ? [index] : [index, shift];
  return runDirect('zt_setTextAlignment', args, '当前图层不支持文本对齐');
}

/** 水平居中分布（`zt_setHorizontalCenters`，参数固定 4） */
export function setHorizontalCenters(): Promise<Result<void>> {
  return runDirect('zt_setHorizontalCenters', [4], '当前图层不支持水平居中分布');
}

/** 垂直平均分布（`zt_verticalCenter`，参数固定 5） */
export function setVerticalCenter(): Promise<Result<void>> {
  return runDirect('zt_verticalCenter', [5], '当前图层不支持垂直平均分布');
}

/** 顶 / 中 / 底对齐（`zt_setUpDownAlign`） */
export function setTextUpDownAlign(index: number): Promise<Result<void>> {
  return runDirect('zt_setUpDownAlign', [index], '当前图层不支持垂直对齐');
}

/** 与背景对齐（`zt_setBackrgoudAlign`，原版拼写照抄）：3 水平 / 4 垂直 */
export function setBackgroundAlign(value: 3 | 4): Promise<Result<void>> {
  return runDirect('zt_setBackrgoudAlign', [value], '当前图层不支持与背景对齐');
}

/** 水平垂直居中对齐（`zt_alignHorizontal`）：只服务第二入口，本页不放按钮 */
export function alignHorizontal(): Promise<Result<void>> {
  return runDirect('zt_alignHorizontal', [], '当前图层不支持居中对齐');
}

/** 按间距分布（`cy_distributedByPitch`）：axis 1 水平 / 2 垂直，第 3 个参数固定 2 */
export function distributeByPitch(
  axis: 1 | 2,
  value: string,
  filter: boolean
): Promise<Result<void>> {
  return runDirect('cy_distributedByPitch', [axis, value, 2, filter], '当前图层不支持按间距分布');
}

/**
 * 拆分/合并的前置确认（`zt_changeTextBranchMerge`）。
 *
 * 原版先探一次、再真正执行，两步不能合并。UNVERIFIED：这个函数名可能只是原版派发表的
 * key（转发到 `zt_textBranchMerge`），见 `PS-CHANNEL-NOTES.md` §11.3 第 7 条。
 */
export function changeTextBranchMerge(mode: 1 | 2 | 3 | 4): Promise<Result<void>> {
  return runDirect('zt_changeTextBranchMerge', [mode], '当前图层不支持拆分或合并');
}

/** 拆分/合并真正执行（`zt_textBranchMerge`）：1 分行 / 2 分为单个 / 3 合并 / 4 合并为段落 */
export function textBranchMerge(mode: 1 | 2 | 3 | 4): Promise<Result<void>> {
  return runDirect('zt_textBranchMerge', [mode], '当前图层不支持拆分或合并');
}

/** 生成按钮（`zt_createButton`）：`type` 1 圆角 / 2 直角，`padding` 是「10,20」这类文本 */
export function createButton(config: {
  type: 1 | 2;
  isLine: boolean;
  padding: string;
}): Promise<Result<void>> {
  return runDirect('zt_createButton', [config], '当前图层无法生成按钮');
}

/** 切换文本方向（`zt_switchFontDirection`） */
export function switchFontDirection(): Promise<Result<void>> {
  return runDirect('zt_switchFontDirection', [], '当前图层不支持切换文本方向');
}

/** 写回译文（`zt_setTranslateText`）：`replace` 为真 = 覆盖原文 */
export function setTranslateText(data: unknown, replace: boolean): Promise<Result<void>> {
  return runDirect('zt_setTranslateText', [data, replace], '当前图层不支持写回译文');
}
