/**
 * 【范本】全仓唯一的结果形状
 *
 * 成功 / 失败只有这一个形状：文件三态、jsx 宿主层、业务失败全部收进 `code`。
 * 唯一构造点：`ok()` / `fail()` / `failWithDetail()`——别处不许写 `{ status: ... }` 字面量。
 * 三态语义由码承载，不再有第二种形状：
 *   NOT_FOUND  = 文件不存在（不重试）
 *   CORRUPT    = 数据损坏（不重试）
 *   IO_ERROR   = 读写失败（可重试）
 *
 * 错误码语义（新增码必须写进这里，不允许各处自创）：
 *   NOT_FOUND     文件 / 资源不存在（含「索引登记了但文件缺失」）
 *   CORRUPT       数据损坏、结构不符
 *   IO_ERROR      读写失败：占用、权限
 *   PS_NO_DOC     没有打开的文档
 *   PS_NOT_TEXT   当前图层不是文字图层（换图层就好，不是故障）
 *   PS_NOT_SHAPE  当前图层不是形状图层
 *   PS_SKIPPED    官方配置显式关闭（sj_interfaceSet.ini 的 img_cya4 === false）
 *   PS_UNREADY    PS 能力未就绪（jsx 未加载 / 环境变量注入失败）
 *   PS_REJECTED   宿主拒绝执行（vendor 返回 -1，多为没选中图层）
 *   PS_ERROR      PS 脚本执行失败（EvalScript error / jsx 内部异常 / 返回格式不符）
 *   NETWORK       网络请求失败（非 HTTP 状态码问题）
 *   TIMEOUT       请求超时
 *   AUTH          登录失效（401）
 *   FORBIDDEN     无权限（403）
 *   VALIDATION    参数或状态不满足业务前提（如图层类型不支持）
 *   CANCELLED     用户主动取消（关对话框 / 切走选区）：**不是故障**，按静默处理
 *   UNKNOWN       兜底，尽量不用
 */
export type ErrorCode =
  | 'NOT_FOUND'
  | 'CORRUPT'
  | 'IO_ERROR'
  | 'PS_NO_DOC'
  | 'PS_NOT_TEXT'
  | 'PS_NOT_SHAPE'
  | 'PS_SKIPPED'
  | 'PS_UNREADY'
  | 'PS_REJECTED'
  | 'PS_ERROR'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'AUTH'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'CANCELLED'
  | 'UNKNOWN';

export type Result<T> =
  | { status: 'ok'; value: T }
  | { status: 'error'; code: ErrorCode; reason: string; detail: string };

export function ok<T>(value: T): Result<T> {
  return { status: 'ok', value };
}

/** 无观测的失败（detail 记空串）；有底层原文时用 failWithDetail */
export function fail<T = never>(code: ErrorCode, reason: string): Result<T> {
  return { status: 'error', code, reason, detail: '' };
}

/** 带底层原文的失败：detail 放机器可查的观测（原始返回值、HTTP 状态等） */
export function failWithDetail<T = never>(
  code: ErrorCode,
  reason: string,
  detail: string
): Result<T> {
  return { status: 'error', code, reason, detail };
}
