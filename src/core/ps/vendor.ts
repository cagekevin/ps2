/**
 * 【范本】官方 jsx 的两条通道（全仓唯一实现）
 *
 * 官方前端有四个方法名，落到线上只有两条通道（`docs/PS-CHANNEL-NOTES.md` §一）：
 *   `jsxHistory` / `jsxHistoryNoCheck` → `ps_onJsx('{"f","arr","n"}')` → `runVendor`
 *   `jsx` / `jsxNoCheck`（直调）        → `fn(a, b)`                    → `runDirect`
 *
 * 判断依据是**原版调用点用的哪个方法**，不是函数名前缀（`CONVENTIONS` §4.7）：
 * 同族函数可能一个走调度、一个走直调（常用页的 `cy_zoom` 直调、`cy_transformPosition` 走调度）。
 * 调错通道的表现是 `EvalScript error.`（脚本层面炸）或「缺少必需值」（缺调度上下文）。
 *
 * 为什么两条都收在这一个文件：第二处调用方出现时按原样复制一份，迟早只改其中一份。
 * 现用户：`style.ts`（渐变 / 图层样式）、`text.ts`（文本属性）、`common-use.ts`（常用页）。
 */

import { callJsx, WRITE_TIMEOUT } from '../cep/bridge';
import { fail, failWithDetail, ok, type Result } from '../../types/result';
import { isRecord } from '../../types/guards';
import { requireVendor } from './init';
import { envelopeMessage, parseJsxRaw, unwrapRaw } from './raw';

/** 调度通道的宿主函数名；只有这里认识这个字符串 */
const DISPATCH = 'ps_onJsx';

/** 官方能力未就绪的统一失败文案 */
export const UNREADY = '官方 PS 能力未就绪';

/**
 * 调度通道：`ps_onJsx({ f, arr, n })`。
 *
 * `n` 只是日志标签，**不传给 jsx 函数本身**；`arr` 是实参数组（项本身，不是 `[项]` 嵌套）。
 * 用于原版 `jsxHistory*` 那批：渐变、图层样式，以及常用页里走调度的按钮。
 */
export async function runVendor(fn: string, args: unknown[], label?: string): Promise<Result<void>> {
  if (!(await requireVendor())) return fail('PS_UNREADY', UNREADY);

  const payload: Record<string, unknown> = { f: fn, arr: args };
  if (label) payload.n = label;

  const call = await callJsx(DISPATCH, [payload]);
  if (call.status === 'error') return call;

  const guard = unwrapRaw(call.value);
  if (guard.status === 'error') return guard;

  return ok(undefined);
}

/**
 * 直调通道：`fn(a, b)`，写操作 60s。
 *
 * `rejected` 只在 `err === 1` **且宿主没给 `msg`** 时兜底：各函数「1」的含义不同
 * （换字面是字体缺失，其它是不满足前提），宿主给了原因就用宿主的原话
 * （如 `{err:1, msg:"请选择文字图层"}`），不许拿一句笼统文案顶替。
 *
 * 解析不出 JSON 时按成功处理（UNVERIFIED）：这批函数可能返回裸 `1` / 空串，
 * 按严格判据会把正常操作全判成失败。真机确认形状后必须收紧。
 */
export async function runDirect(
  fn: string,
  args: unknown[],
  rejected: string
): Promise<Result<void>> {
  if (!(await requireVendor())) return fail('PS_UNREADY', UNREADY);

  const call = await callJsx(fn, args, { timeout: WRITE_TIMEOUT });
  if (call.status === 'error') return call;

  /* 约定值（-1 / no-doc / not-shape / skipped）先折成失败，再谈信封 */
  const unwrapped = unwrapRaw(call.value);
  if (unwrapped.status === 'error') return unwrapped;

  const parsed = parseJsxRaw(call.value);
  if (parsed.status === 'error') return ok(undefined);

  if (isRecord(parsed.value) && parsed.value.err === 1) {
    return failWithDetail(
      'VALIDATION',
      envelopeMessage(parsed.value) || rejected,
      `raw:${call.value.slice(0, 120)}`
    );
  }

  return ok(undefined);
}
