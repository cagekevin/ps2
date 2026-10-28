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

import { callJsx } from '../cep/bridge';
import { encodeText } from '../cep/text-codec';
import { isRecord } from '../../types/guards';
import { failWithDetail, ok, type Result } from '../../types/result';
import { callCapability, gateFailed } from './capability';
import { CAP, FONT_UNAVAILABLE } from './capabilities';
import { requireVendor } from './init';
import { envelopeMessage, parseJsxRaw, type SystemFontListRaw } from './raw';

/**
 * 检查字体是否可用。
 *
 * 不可用时**直接返回失败，并带上宿主的原话**：同一个 `err === 1` 既可能是字体缺失，
 * 也可能是「请选择文字图层!」（2026-10-28 真机日志）。以前只返回 `ok(false)`，
 * 调用方只能给一句「字体不可用」——把「换个图层」的事说成「去装字体」。
 *
 * 信封不成立（返回结构未公开）时按可用处理，不阻断正常流程；UNVERIFIED。
 */
export async function checkFontUsable(item: Record<string, unknown>): Promise<Result<void>> {
  if (!(await requireVendor())) return gateFailed('vendor');

  const payload = encodeText(JSON.stringify(item));
  const call = await callJsx('ys_checkUseFont', [payload]);
  if (call.status === 'error') return call;

  const parsed = parseJsxRaw(call.value);
  if (parsed.status === 'error') return ok(undefined);

  if (isRecord(parsed.value) && parsed.value.err === 1) {
    return failWithDetail(
      'VALIDATION',
      envelopeMessage(parsed.value) || FONT_UNAVAILABLE,
      `raw:${call.value}`
    );
  }
  return ok(undefined);
}

/**
 * 读取当前文字图层的字体属性（原版 `addFont` `app.v4.js:51243-51264`）。
 *
 * 返回 `{ fonts: [...] }`；`fonts` 为空 = 读取失败（原版报「读取字体属性失败」）。
 * 整份原样入库，不补键、不改写——库项形状由 jsx 决定。
 */
export function getFontInfo(): Promise<Result<Record<string, unknown>>> {
  /* 三态（false / err:1 / 载荷）与载荷校验都在 `CAP.fontInfo` 的 `strictPayload` 里 */
  return callCapability(CAP.fontInfo);
}

/**
 * 应用字体到当前文字图层。
 *
 * 先判「当前是不是文字图层」：不判的话 PS 会直接抛
 * 「命令"设置"当前不可用」，那句话被当成失败原因显示出来，
 * 用户看到的是「Photoshop 版本不支持」——而事实是没选中文字。
 */
export function applyFont(item: Record<string, unknown>): Promise<Result<void>> {
  /* 只有参数编码留在调用点：门 / 前置 / 解析都在 `CAP.applyFont` 里 */
  return callCapability(CAP.applyFont, [encodeText(JSON.stringify(item))]);
}

/* ---------------- 系统字体列表（字体管理页） ---------------- */

/**
 * 读系统字体列表（原版字体管理页 `ztgl_initSystemList`）。
 *
 * 直调通道，长超时。返回**已判定**的两态：`sentinel`（数据已写 `SysFont2.json`，去重读文件）
 * 或 `list`（原样数组，归一化交给 `domain` —— `core` 不能 import `domain`）。
 * 哨兵与「不是数组」的判断在 `raw.parseSystemFontList`，不在这里也不在命令层。
 */
export function getSystemFontList(): Promise<Result<SystemFontListRaw>> {
  return callCapability(CAP.systemFontList);
}

/**
 * 应用系统字体（原版字体管理页 `ztgl_setFont(hjm, mz, zz)`）。
 *
 * 直调通道；三个参数是**明文**，不要 `encodeText`（与 `ys_useFont` 的区别）。
 * 门 / 前置 / 解析都在表里（`CAP.setFont`）：先判「当前是文字图层」，否则 PS 会抛
 * 「命令"设置"当前不可用」，用户以为 PS 版本不支持；`{err:1}` 的原因取宿主 `msg`。
 */
export function setFontByNames(
  postScriptName: string,
  name: string,
  weight: string
): Promise<Result<void>> {
  return callCapability(CAP.setFont, [postScriptName, name, weight]);
}
