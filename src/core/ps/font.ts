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
 *
 * 本文件同时承载**第二条字体通道**（字体管理页）：
 *   `ztgl_initSystemList` / `ztgl_setFont` —— 直调、明文参数、**不 encodeText**。
 * 两条通道服务不同数据（样式库字体项 vs 系统字体列表），不要合并。
 */

import { callJsx, LONG_TIMEOUT, WRITE_TIMEOUT } from '../cep/bridge';
import { encodeText } from '../cep/text-codec';
import { fail, failWithDetail, ok, type Result } from '../../types/result';
import { requireVendor } from './init';
import { dataOf, errOf, parseErrEnvelope, parseJsxRaw, unwrapRaw } from './raw';

/**
 * 检查字体是否可用。
 * 返回 `ok(false)` 表示字体缺失，调用方应中止并提示。
 */
export async function checkFontUsable(item: Record<string, unknown>): Promise<Result<boolean>> {
  if (!(await requireVendor())) return fail('PS_UNREADY', '官方 PS 能力未就绪');

  const payload = encodeText(JSON.stringify(item));
  const call = await callJsx('ys_checkUseFont', [payload]);
  if (call.status === 'error') return call;

  const err = parseErrEnvelope(call.value);
  /* 信封不成立（返回结构未公开）时按可用处理，不阻断正常流程；UNVERIFIED */
  if (err.status === 'ok' && err.value === 1) return ok(false);
  return ok(true);
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

  const err = errOf(value, call.value);
  if (err.status === 'ok' && err.value === 1) {
    return failWithDetail('PS_ERROR', '读取字体属性失败', `raw:${call.value}`);
  }

  /* 信封拆包走 raw.ts——这里只判「fonts 是否非空」，不认识返回形状 */
  const data = dataOf(value);
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
  if (err.status === 'error') return err;
  if (err.value === 1) {
    return failWithDetail('VALIDATION', '字体不可用（系统里可能没装这个字体）', `raw:${call.value}`);
  }

  return ok(undefined);
}

/* ---------------- 系统字体列表（字体管理页） ---------------- */

/**
 * 读系统字体列表（原版字体管理页 `ztgl_initSystemList`）。
 *
 * 直调通道，长超时。返回**原始字符串**：字体数组 JSON，或 `ok` 哨兵
 * （哨兵表示数据已写到 `SysFont2.json`，调用方重读文件）。
 * 归一化不在这里做——`core` 不能 import `domain`。
 */
export async function getSystemFontList(): Promise<Result<string>> {
  if (!(await requireVendor())) return fail('PS_UNREADY', '官方 PS 能力未就绪');

  return callJsx('ztgl_initSystemList', [], { timeout: LONG_TIMEOUT });
}

/**
 * 应用系统字体（原版字体管理页 `ztgl_setFont(hjm, mz, zz)`）。
 *
 * 直调通道；三个参数是**明文**，不要 `encodeText`（与 `ys_useFont` 的区别）。
 * `{err:1}` = 字体缺失；`-1` 等约定值统一交给 `unwrapRaw`。
 */
export async function setFontByNames(
  postScriptName: string,
  name: string,
  weight: string
): Promise<Result<void>> {
  if (!(await requireVendor())) return fail('PS_UNREADY', '官方 PS 能力未就绪');

  const call = await callJsx('ztgl_setFont', [postScriptName, name, weight], {
    timeout: WRITE_TIMEOUT
  });
  if (call.status === 'error') return call;

  const unwrapped = unwrapRaw(call.value);
  if (unwrapped.status === 'error') return unwrapped;

  const err = parseErrEnvelope(call.value);
  if (err.status === 'error') return err;
  if (err.value === 1) {
    return failWithDetail('VALIDATION', '字体不可用（系统里可能没装这个字体）', `raw:${call.value}`);
  }

  return ok(undefined);
}
