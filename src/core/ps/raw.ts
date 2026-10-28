/**
 * 【范本】jsx 原始返回值（raw 协议）的唯一解析处。
 *
 * 全仓只有两处允许认识这些约定值：
 *   core/cep/bridge.ts  —— 构造线上字符串（拼 evalScript）
 *   本文件              —— 解析返回值（约定值 / JSON / err 信封）
 * 新增约定值必须先登记 `RAW_FAILURES` 这张表，不许在能力函数里手写字符串比较。
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

/** raw 是 JSON → 解析；不是 → CORRUPT（detail 带原始值，排障不用翻日志） */
export function parseJsxRaw(raw: string): Result<unknown> {
  return parseJson(raw, 'jsx 返回值');
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
