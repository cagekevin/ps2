/**
 * 【范本】读取结果的三态
 *
 * 用来区分「环境问题」和「数据问题」，避免把 bug 伪装成读取失败：
 *   missing    索引登记了，但文件不存在
 *   corrupt    文件在，但内容不是预期结构（数据问题，不重试）
 *   unreadable IO 失败：占用、权限（环境问题，可重试）
 *
 * 代码 bug（TypeError 等）不要捕获成这些状态，让它冒泡到错误边界。
 *
 * 分层约定：
 *   domain / repo  → ReadOutcome（保留三态，页面能区分「缺文件」和「读坏了」）
 *   core / commands → Result（用 toResult 转换，带错误码）
 */

import { fail, ok, type Result } from './result';

export type ReadOutcome<T> =
  | { status: 'ok'; value: T }
  | { status: 'missing' }
  | { status: 'corrupt'; reason: string }
  | { status: 'unreadable'; reason: string };

export function isOk<T>(outcome: ReadOutcome<T>): outcome is { status: 'ok'; value: T } {
  return outcome.status === 'ok';
}

/** 是否值得让用户点「重试」 */
export function isRetryable(outcome: ReadOutcome<unknown>): boolean {
  return outcome.status === 'unreadable';
}

/**
 * 三态 → Result。
 * 只在确实要往上抛到命令/页面时才用；repo 内部保持三态，不要提前压平。
 */
export function toResult<T>(outcome: ReadOutcome<T>): Result<T> {
  switch (outcome.status) {
    case 'ok':
      return ok(outcome.value);
    case 'missing':
      return fail('NOT_FOUND', '文件不存在');
    case 'corrupt':
      return fail('CORRUPT', outcome.reason);
    case 'unreadable':
      return fail('IO_ERROR', outcome.reason);
  }
}
