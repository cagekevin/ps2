/**
 * 本域（结果形状）以此为准：`src/types/result.ts` 的 `ok` / `fail` / `failWithDetail`。新增失败只加 `ErrorCode`，不再新建形状或构造文件。
 *
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
 *   PS_WRONG_LAYER 选中的对象不满足前提（图层类型不对 / 选中数量不够）；换图层或多选就好，
 *                  不是故障。`reason` 必须写明「当前是什么，需要什么」，
 *                  `detail` 带 `kind:<类型>` 或 `selection:<数量>`
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
  | 'PS_WRONG_LAYER'
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

/**
 * 失败臂（不带 payload）：`Result` 去掉 ok 分支。
 *
 * 用于「只需要记住失败」的地方（如 store 的 `reasons`）。存整条 `Result` 会让
 * 「没失败（ok）」与「没读过（null）」两个状态混在一个字段里，读的时候必须再判一次 `status`
 * —— 那正是 `TD-09-3`。这里只留失败臂，`null` 就只有一个意思：**最近一次读没有失败**。
 */
export type Failure = Extract<Result<unknown>, { status: 'error' }>;
