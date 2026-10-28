/**
 * 【范本】jsx 原始返回值（raw 协议）的唯一解析处。
 *
 * 全仓只有两处允许认识这些约定值：
 *   core/cep/bridge.ts  —— 构造线上字符串（拼 evalScript）
 *   本文件              —— 解析返回值（约定值 / JSON / err 信封）
 * 新增约定值必须先登记 `RAW_FAILURES` 这张表，不许在能力函数里手写字符串比较。
 *
 * 能力表（`./capabilities.ts`）的 `parse` 字段只许引用本文件的解析器：**严格度是能力的契约**
 * （认不出结构算失败还是算成功），写在表里一眼能看见，不许散回各能力函数里。
 *
 * 约定值来自原版面板与我们的 jsx/main.jsx（详见 docs/PS-CHANNEL-NOTES.md §三）。
 */

import { isRecord } from '../../types/guards';
import { parseJson } from '../../types/json';
import { failWithDetail, ok, type ErrorCode, type Result } from '../../types/result';

const RAW_FAILURES: Record<string, { code: ErrorCode; reason: string }> = {
  'no-doc': { code: 'PS_NO_DOC', reason: '没有打开的文档' },
  'not-shape': { code: 'PS_WRONG_LAYER', reason: '当前图层不是形状图层' },
  skipped: {
    code: 'PS_SKIPPED',
    reason: '自动填充已关闭（sj_interfaceSet.ini 里的 img_cya4 为 false）'
  },
  '-1': { code: 'PS_REJECTED', reason: 'PS 拒绝执行，请确认已选中图层' }
};

/**
 * raw → Result<void>：约定失败码折成失败（detail 带原始值），其余算成功。
 * 成功时调用方继续用原始 raw（有的函数还要解析 JSON / 前缀）。
 */
export function unwrapRaw(raw: string): Result<void> {
  const trimmed = raw.trim();
  const hit = RAW_FAILURES[trimmed];
  if (hit) return failWithDetail(hit.code, hit.reason, `raw:${trimmed}`);
  return ok(undefined);
}

/**
 * raw 是 JSON → 解析。
 *
 * **不是合法 JSON 时用 `PS_ERROR` 而不是 `CORRUPT`**：
 * `CORRUPT` 是「数据不认识」（JSON 合法但结构不对，读文件时就是这个）；
 * 而「jsx 返回值不是 JSON」是**宿主这次没给出可解析的结果**——真机见过
 * `zt_getFontSimpleInfo` 返回 `undefined`（`callJsx` 把它转成字符串 `"undefined"`）。
 * 报 `CORRUPT` 会让人以为「文件/结构坏了」，实际是「这次没读到」。
 */
export function parseJsxRaw(raw: string): Result<unknown> {
  return parseJson(raw, 'jsx 返回值', 'PS_ERROR');
}

/**
 * 官方直调**读**函数的哨兵：宿主说「数据已写文件，不在这里」。
 * 目前只有 `ztgl_initSystemList` 返回它（数据写 `SysFont2.json`）。
 * 全仓判 `'ok'/'OK'` 只许在这里。
 */
export function isOkSentinel(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed === 'ok' || trimmed === 'OK';
}

/**
 * 官方直调函数（ys_*）的 err 信封：`{ err: number }`。
 *
 * **没有 `null` 通道**：信封不成立（不是 JSON / 没有 err 字段）一律返回 `CORRUPT`，
 * 由调用方决定「算失败」还是「按可用处理」——不允许默默当成成功。
 */
export function parseErrEnvelope(raw: string): Result<number> {
  const parsed = parseJsxRaw(raw);
  if (parsed.status === 'error') return parsed;
  return errOf(parsed.value, raw);
}

/**
 * 已解析的值 → 信封里宿主给的那句话（没有 `msg` 时为空串）。
 *
 * 同一个 `err: 1` 在不同函数、甚至同一函数的不同情况下含义不同：`ztgl_setFont`
 * 没选中文字图层时返回 `{err:1, msg:"请选择文字图层"}`，字体真缺失时又是另一句。
 * 宿主已经说清楚了，就别拿我们猜的兜底文案顶替——把「没选文字图层」写成
 * 「字体不可用」会让用户去重装一个本来装着的字体。
 */
export function envelopeMessage(value: unknown): string {
  const msg = isRecord(value) ? value.msg : undefined;
  return typeof msg === 'string' ? msg.trim() : '';
}

/** 已解析的值 → err 字段（避免同一段 raw 解析两次） */
export function errOf(value: unknown, raw: string): Result<number> {
  const err = isRecord(value) ? value.err : undefined;
  if (typeof err !== 'number') {
    return failWithDetail('CORRUPT', '返回里没有 err 字段', `raw:${raw.slice(0, 120)}`);
  }
  return ok(err);
}

/**
 * 官方直调**读**函数（ys_getGradientInfo / ys_getFontInfo）的 data 信封。
 *
 * UNVERIFIED：这两个函数的真实返回形状未逐字段验证——可能是 `{ err, data }`
 * 双字段信封，也可能是裸载荷。这里兼容两种（有 `data` 字段就拆出来）；
 * 真机确认形状后删掉不用的分支，别让「两种都收」变成永久契约。
 */
export function parseDataEnvelope(raw: string): Result<unknown> {
  const parsed = parseJsxRaw(raw);
  if (parsed.status === 'error') return parsed;
  return ok(dataOf(parsed.value));
}

/** 已解析的值 → data 载荷（同一段 raw 只解析一次） */
export function dataOf(value: unknown): unknown {
  if (isRecord(value) && 'data' in value) return value.data;
  return value;
}

/* ---------------- 能力表用的具名解析器 ---------------- */

/** raw 解析器签名：能力表 `parse` 字段的类型，输入原始串、输出已翻译的结果 */
export type Parser<T> = (raw: string) => Result<T>;

/** 原样交出 raw（`ztgl_initSystemList`：调用方自己判 `ok` 哨兵，再决定要不要解析 JSON） */
export const passthrough: Parser<string> = (raw) => ok(raw);

/**
 * 宽松写：认不出结构按成功。
 *
 * 这批直调函数可能返回裸 `1` / 空串（结构 UNVERIFIED），按严格判据会把正常操作全判成失败，
 * 所以沿用 `runDirect` 的历史妥协。**收紧必须单独一轮 + 真机证据**，不许在这里顺手改。
 */
export function lenientVoid(fallback: string): Parser<void> {
  return (raw) => {
    const guard = unwrapRaw(raw);
    if (guard.status === 'error') return guard;

    const parsed = parseJsxRaw(raw);
    if (parsed.status === 'error') return ok(undefined);

    if (isRecord(parsed.value) && parsed.value.err === 1) {
      return failWithDetail(
        'VALIDATION',
        envelopeMessage(parsed.value) || fallback,
        `raw:${raw.slice(0, 120)}`
      );
    }
    return ok(undefined);
  };
}

/**
 * 严格写：信封不成立就是 `CORRUPT`（`ys_useFont` / `ztgl_setFont` 这一档）。
 *
 * 与 `lenientVoid` 的唯一区别在第 2 步：「解析不出来 = 当成功」是假成功——字体没换却提示成功。
 * 两个解析器并存是刻意的，用哪个由能力表决定，不设默认值。
 */
export function strictVoid(fallback: string): Parser<void> {
  return (raw) => {
    const guard = unwrapRaw(raw);
    if (guard.status === 'error') return guard;

    const parsed = parseJsxRaw(raw);
    if (parsed.status === 'error') return parsed;

    const err = errOf(parsed.value, raw);
    if (err.status === 'error') return err;
    if (err.value === 1) {
      return failWithDetail('VALIDATION', envelopeMessage(parsed.value) || fallback, `raw:${raw}`);
    }
    return ok(undefined);
  };
}

/**
 * 约定值先折失败，再当 JSON 解析（严格）：`mm_style_getForegroundColor` 这一档。
 * 与 `strictVoid` 的区别是没有 err 信封可判，解析出来就是载荷本身。
 */
export function sentinelJson(raw: string): Result<unknown> {
  const guard = unwrapRaw(raw);
  if (guard.status === 'error') return guard;
  return parseJsxRaw(raw);
}

/**
 * 三态载荷读（`ys_getFontInfo` / `ys_getGradientInfo` 这一档）：
 * `false` = 当前图层不适用（`VALIDATION`）、`{err:1}` = 读失败（`PS_ERROR`）、其余当载荷。
 *
 * 两个函数原本各写一遍这段骨架（`false` 分支、`err===1` 分支、载荷校验、`ok`），
 * 只差文案与载荷判定——同一件事两处实现。
 *
 * **不折约定值**：`no-doc` / `-1` 在这里落成 `CORRUPT`（与 `strictData` 一致，既有行为）。
 */
export function strictPayload<T>(opts: {
  /** `false` 时给用户看的话（图层不适用，不是故障） */
  whenFalse: string;
  /** 读失败时的兜底文案；宿主给了 `msg` 就用宿主的 */
  whenFailed: string;
  /** 载荷校验：不合格返回 `null`（按 `whenFailed` 失败），合格返回收窄后的值 */
  accept: (data: unknown) => T | null;
}): Parser<T> {
  return (raw) => {
    const parsed = parseJsxRaw(raw);
    if (parsed.status === 'error') return parsed;

    const value = parsed.value;
    if (value === false) return failWithDetail('VALIDATION', opts.whenFalse, `raw:${raw}`);

    const err = errOf(value, raw);
    if (err.status === 'ok' && err.value === 1) {
      return failWithDetail('PS_ERROR', envelopeMessage(value) || opts.whenFailed, `raw:${raw}`);
    }

    const accepted = opts.accept(dataOf(value));
    if (accepted === null) {
      return failWithDetail('PS_ERROR', opts.whenFailed, `raw:${raw}`);
    }
    return ok(accepted);
  };
}

/**
 * 严格读：`err !== 0` 当失败，其余交 `data` 载荷。
 *
 * 原版只在该值为 0 时才覆盖面板（`app.v4.js:42523` 一带）；把 `{ err: 1, data }` 的 data
 * 直接交出去，非文字图层上会拿上一次的残留字段当新值——面板数字看着变了其实图层没变。
 *
 * **折约定值**（与 `lenientVoid` / `strictVoid` / `sentinelJson` 同一套判据）：
 * 以前这里不折，`no-doc`（宿主说没打开文档）会落成 `CORRUPT`「不是合法 JSON」——
 * 那不是「数据坏了」。真机 2026-10-28 给的正是 `PS_NO_DOC`。
 */
export function strictData(fallback: string): Parser<unknown> {
  return (raw) => {
    const guard = unwrapRaw(raw);
    if (guard.status === 'error') return guard;

    const parsed = parseJsxRaw(raw);
    if (parsed.status === 'error') return parsed;

    const value = parsed.value;
    if (isRecord(value) && typeof value.err === 'number' && value.err !== 0) {
      return failWithDetail('VALIDATION', envelopeMessage(value) || fallback, `err:${value.err}`);
    }
    return ok(dataOf(value));
  };
}
