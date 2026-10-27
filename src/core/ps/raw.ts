/**
 * 【范本】jsx 原始返回值（raw 协议）的唯一解析处。
 *
 * 全仓只有两处允许认识这些约定值：
 *   core/cep/bridge.ts  —— 构造线上字符串（拼 evalScript）
 *   本文件              —— 解析返回值
 * 新增约定值必须先登记 `RAW_FAILURES` 这张表，不许在能力函数里手写字符串比较。
 *
 * 约定值来自原版面板与我们的 jsx/main.jsx（详见 docs/PS-CHANNEL-NOTES.md §三）。
 */
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
