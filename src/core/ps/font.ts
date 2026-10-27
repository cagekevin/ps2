/**
 * 【范本】PS 字体应用能力
 *
 * 两步，顺序不能反（原版 app.v4.js:51200-51215）：
 *   1. `ys_checkUseFont`  检查字体是否可用，`err == 1` 就中止
 *   2. `ys_useFont`       真正应用
 *
 * **这两个函数直接调，不走 `ps_onJsx` 调度**。
 * 原版用 `jsx` / `jsxWrite`（transport.ts:197-241 直接拼 `fn(args)`），
 * 只有 `jsxHistory` 系列才包成 `ps_onJsx('<JSON>')`。
 * 颜色 / 渐变 / 图层样式走调度，字体不走——这是两条不同的通道。
 *
 * 参数必须先 `encodeText` 编码（原版 `Xv`），jsx 侧解码。
 * raw 的解析统一走 `./raw.ts`，本文件不写 JSON.parse。
 */

import { callJsx, WRITE_TIMEOUT } from '../cep/bridge';
import { encodeText } from '../cep/text-codec';
import { fail, failWithDetail, ok, type Result } from '../../types/result';
import { requireVendor } from './init';
import { parseDataEnvelope, parseErrEnvelope, parseJsxRaw } from './raw';

/**
 * 检查字体是否可用。
 * 返回 `ok(false)` 表示字体缺失，调用方应中止并提示。
 */
export async function checkFontUsable(item: Record<string, unknown>): Promise<Result<boolean>> {
  if (!(await requireVendor())) return fail('PS_UNREADY', '官方 PS 能力未就绪');

  const payload = encodeText(JSON.stringify(item));
  const call = await callJsx('ys_checkUseFont', [payload]);
  if (call.status === 'error') return call;

  /* 返回结构未公开时按可用处理，不阻断正常流程 */
  return ok(parseErrEnvelope(call.value) !== 1);
}

/**
 * 读取当前文字图层的字体属性（原版 `addFont` `app.v4.js:51243-51264`）。
 *
 * 返回 `{ fonts: [...] }`；`fonts` 为空 = 读取失败（原版报「读取字体属性失败」）。
 * 整份原样入库，不补键、不改写——库项形状由 jsx 决定。
 */
export async function getFontInfo(): Promise<Result<Record<string, unknown>>> {
  if (!(await requireVendor())) return fail('PS_UNREADY', '官方 PS 能力未就绪');

  const call = await callJsx('ys_getFontInfo', []);
  if (call.status === 'error') return call;

  const parsed = parseJsxRaw(call.value);
  if (parsed.status === 'error') return parsed;
  const value = parsed.value;

  if (value === false) return fail('VALIDATION', '当前图层不是文字图层');
  if (value && typeof value === 'object' && (value as { err?: unknown }).err === 1) {
    return failWithDetail('PS_ERROR', '读取字体属性失败', `raw:${call.value}`);
  }

  /* 信封拆包走 raw.ts——这里只判「fonts 是否非空」，不认识返回形状 */
  const envelope = parseDataEnvelope(call.value);
  if (envelope.status === 'error') return envelope;
  const data = envelope.value;
  if (
    !data ||
    typeof data !== 'object' ||
    !Array.isArray((data as { fonts?: unknown }).fonts) ||
    ((data as { fonts: unknown[] }).fonts as unknown[]).length === 0
  ) {
    return failWithDetail('PS_ERROR', '读取字体属性失败', `raw:${call.value}`);
  }

  return ok(data as Record<string, unknown>);
}

/** 应用字体到当前文字图层 */
export async function applyFont(item: Record<string, unknown>): Promise<Result<void>> {
  if (!(await requireVendor())) return fail('PS_UNREADY', '官方 PS 能力未就绪');

  const payload = encodeText(JSON.stringify(item));
  const call = await callJsx('ys_useFont', [payload], { timeout: WRITE_TIMEOUT });
  if (call.status === 'error') return call;

  const err = parseErrEnvelope(call.value);
  if (err === 1) {
    return failWithDetail('VALIDATION', '字体不可用（系统里可能没装这个字体）', `raw:${call.value}`);
  }

  return ok(undefined);
}
