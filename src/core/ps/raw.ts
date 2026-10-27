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

import { parseJson } from '../../types/json';
import { failWithDetail, ok, type ErrorCode, type Result } from '../../types/result';

const RAW_FAILURES: Record<string, { code: ErrorCode; reason: string }> = {
  'no-doc': { code: 'PS_NO_DOC', reason: '没有打开的文档' },
  'not-shape': { code: 'PS_NOT_SHAPE', reason: '当前图层不是形状图层' },
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
 * 官方直调函数（ys_*）的 err 信封：`{ err: number }`。
 * err === 1 表示宿主侧失败（如字体缺失）；解析不出按「没有 err 字段」处理，由调用方定语义。
 */
export function parseErrEnvelope(raw: string): number | null {
  const parsed = parseJson(raw, 'jsx err 信封');
  if (parsed.status !== 'ok') return null;
  const err = (parsed.value as { err?: unknown }).err;
  return typeof err === 'number' ? err : null;
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
  const value = parsed.value;
  if (value && typeof value === 'object' && 'data' in value) {
    return ok((value as { data: unknown }).data);
  }
  return ok(value);
}
