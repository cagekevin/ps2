/**
 * 【范本】统一返回类型
 * 业务层不抛异常，一律返回 Result。
 *
 * 错误码语义（新增码必须写进这里，不允许各处自创）：
 *   NETWORK      网络请求失败（非 HTTP 状态码问题）
 *   TIMEOUT      请求超时
 *   AUTH         登录失效（401）
 *   FORBIDDEN    无权限（403）
 *   NOT_FOUND    文件 / 资源不存在（对应 ReadOutcome.missing）
 *   CORRUPT      数据损坏、结构不符（对应 ReadOutcome.corrupt）
 *   IO_ERROR     读写失败：占用、权限（对应 ReadOutcome.unreadable）
 *   PS_ERROR     PS 脚本执行失败、无文档、能力未就绪
 *   VALIDATION   参数或状态不满足业务前提（如图层类型不支持）
 *   UNKNOWN      兜底，尽量不用
 */
export type ErrorCode =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'AUTH'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CORRUPT'
  | 'IO_ERROR'
  | 'PS_ERROR'
  | 'VALIDATION'
  | 'UNKNOWN';

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail<T = never>(code: ErrorCode, message: string): Result<T> {
  return { ok: false, code, message };
}
