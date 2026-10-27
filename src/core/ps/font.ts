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
 */

import { callJsx } from '../cep/bridge';
import { encodeText } from '../cep/text-codec';
import { fail, ok, type Result } from '../../types/result';
import { requireVendor } from './init';

/** 写操作超时比读长：应用字体会遍历文本图层 */
const WRITE_TIMEOUT = 60_000;

/** 解析宿主返回的 `err` 字段：1 表示字体缺失 */
function hostErr(raw: string): number | null {
  try {
    const parsed = JSON.parse(raw) as { err?: unknown };
    return typeof parsed.err === 'number' ? parsed.err : null;
  } catch {
    return null;
  }
}

/**
 * 检查字体是否可用。
 * 返回 `ok(false)` 表示字体缺失，调用方应中止并提示。
 */
export async function checkFontUsable(item: Record<string, unknown>): Promise<Result<boolean>> {
  if (!(await requireVendor())) return fail('PS_ERROR', '官方 PS 能力未就绪');

  const payload = encodeText(JSON.stringify(item));
  const call = await callJsx('ys_checkUseFont', [payload]);
  if (!call.ok) return fail('PS_ERROR', call.reason);

  /* 返回结构未公开时按可用处理，不阻断正常流程 */
  return ok(hostErr(call.raw) !== 1);
}

/**
 * 读取当前文字图层的字体属性（原版 `addFont` `app.v4.js:51243-51264`）。
 *
 * 返回 `{ fonts: [...] }`；`fonts` 为空 = 读取失败（原版报「读取字体属性失败」）。
 * 整份原样入库，不补键、不改写——库项形状由 jsx 决定。
 */
export async function getFontInfo(): Promise<Result<Record<string, unknown>>> {
  if (!(await requireVendor())) return fail('PS_ERROR', '官方 PS 能力未就绪');

  const call = await callJsx('ys_getFontInfo', []);
  if (!call.ok) return fail('PS_ERROR', call.reason);

  let parsed: unknown;
  try {
    parsed = JSON.parse(call.raw);
  } catch {
    return fail('CORRUPT', '字体属性格式异常');
  }

  if (parsed === false) return fail('PS_ERROR', '当前图层不是文字图层');
  if (parsed && typeof parsed === 'object' && (parsed as { err?: unknown }).err === 1) {
    return fail('PS_ERROR', '读取字体属性失败');
  }

  const data =
    parsed && typeof parsed === 'object' && 'data' in parsed
      ? (parsed as { data: unknown }).data
      : parsed;
  if (
    !data ||
    typeof data !== 'object' ||
    !Array.isArray((data as { fonts?: unknown }).fonts) ||
    ((data as { fonts: unknown[] }).fonts as unknown[]).length === 0
  ) {
    return fail('PS_ERROR', '读取字体属性失败');
  }

  return ok(data as Record<string, unknown>);
}

/** 应用字体到当前文字图层 */
export async function applyFont(item: Record<string, unknown>): Promise<Result<void>> {
  if (!(await requireVendor())) return fail('PS_ERROR', '官方 PS 能力未就绪');

  const payload = encodeText(JSON.stringify(item));
  const call = await callJsx('ys_useFont', [payload], { timeout: WRITE_TIMEOUT });
  if (!call.ok) return fail('PS_ERROR', call.reason);

  const err = hostErr(call.raw);
  if (err === 1) return fail('PS_ERROR', '字体不可用（系统里可能没装这个字体）');

  return ok(undefined);
}
