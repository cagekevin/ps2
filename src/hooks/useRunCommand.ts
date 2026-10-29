/**
 * 【范本】执行一条命令：包 loading + 反馈 + 原因留痕
 *
 * 唯一入口：`features/*` 调 `commands/*` 的动作用它。
 * 替代了什么：
 *   - `features/common` 里三份一模一样的「`loading.run` + `toast.error`」
 *     （`useCommonPage` / `SpacingPanel` / `ReferencePanel`）
 *   - `features/style/useStyleActions` 的 `runWithToast` / `runWithFeedback` 实现体
 *     （它们现在只保留两个动词名 + 一句配置，逻辑都在这里）
 * 谁在用：常用页与两个子面板、样式面板。
 * 禁止：
 *   - 在这里做业务判断（成功/失败由命令给）
 *   - 丢掉 `code` / `detail`：toast 只显示给人看的那句，机器现场必须进日志
 *
 * ## 迁移记录：15 处手写「失败提示」已全部收进来（2026-10-28）
 *
 * 前置条件是两件事同时做到：
 *   1. 提示条 / 遮罩的**状态**从 `components/*` 下沉到 `core/feedback/*`（否则 `hooks` 反向
 *      依赖 `components`，`CONVENTIONS` §3 越界）；
 *   2. 本 hook 加 `spin?: false`（默认仍转圈，4 个既有调用点行为不变）。
 *
 * 收法三种，**都是为了不逼调用方绕过同一入口**：
 *
 * | 位置 | 原样 | 现在 |
 * |---|---|---|
 * | `features/font-panel/useFontPanel` | 3 处手写 + 1 个 `run`（`Promise<boolean>`） | 3 处直接 `runCommand`；`run` 变成**薄适配器**（只把 `Result` 折成 `boolean`，20 多处调用点签名不动） |
 * | `features/settings/SettingsPage` | 3 处（含乐观写回滚） | `spin: false` + 拿返回值回滚，失败提示由 hook 出 |
 * | `features/font-manage/useFontManage` | `notify`（`Promise<boolean>`） | 同 `useFontPanel.run`：薄适配器委托给本 hook |
 * | `features/font-manage/useTagActions` | 2 处（`CANCELLED` 静默） | `quiet: ['CANCELLED']`，正好是本 hook 的既有槽 |
 * | `features/home/HomePage` | 4 处（诊断 / 清日志 / 复制 / ping） | 全部走本 hook，`spin` 按各处原行为选 |
 * | `features/style/useStyleActions` | `toastFailure(result)`（**读路径**，只弹不记） | `useReportFailure()` + `reasonOf: styleReason`，与写路径同一个出口、同样留痕 |
 * | `features/style/StylePage` | 图片解析失败只弹字面量，且 `extractImageColors` 抛错时**无人捕获** | 折成 `Result` 走 `runCommand`，抛错进 `detail` |
 *
 * **收益**：这 15 处此前失败时只弹 toast、**不写 `log.warn(code, detail)`**，机器现场只剩各命令
 * 自己的日志；现在统一留痕。`StylePage` 那处还顺带修掉一个无人捕获的 rejection
 * （原来 `extractImageColors` 一 reject，遮罩消失、界面没反应、日志空白）。
 *
 * ## 还剩 6 处 `toast.error`，为什么不算漏
 *
 * 全部是**字面量、没有 `Result` 来源**的用户操作不成立提示：
 * `请输入缩放倍数` / `标签名不能为空` / `标签「x」已存在` / `没有可复制的内容` /
 * `没有选中仓库` / `这个渐变项缺少数据`。
 *
 * 判据：**能不能写出一个 `Result`？** 写不出来（没有失败码、没有 `detail`、没有可留痕的机器现场），
 * 就不是「某个操作失败了」，而是「这个操作不成立」，不该进本 hook。可复核的口径：
 * `grep "toast\.error(" src/features` 的结果里**不带 `result` 的才允许存在**。
 */

import { useCallback } from 'react';
import { log } from '../core/logger';
import { useLoading } from './useLoading';
import { useToast } from './useToast';
import type { ErrorCode, Result } from '../types/result';

export interface RunOptions {
  /** 成功时提示的话；不给 = 成功静默（执行类命令默认不喧哗） */
  success?: string;
  /** 这些码不算故障（典型：用户取消 `CANCELLED`），不提示 */
  quiet?: readonly ErrorCode[];
  /**
   * 本域更具体的失败文案（如「设置未保存：」前缀、库文件缺失）；不给就用 `result.reason`。
   *
   * 入参只给**失败臂**：调用点本来就在 `status === 'error'` 分支里，收窄之后
   * 直接 `result.reason` / `result.code` 即可，不必自己再判一次。
   */
  reasonOf?: (failure: Extract<Result<unknown>, { status: 'error' }>) => string;
  /** 收尾动作（如重读列表）。**无论成败都执行**，与原 `runWithFeedback` 行为一致 */
  after?: () => void;
  /**
   * 是否转圈，默认 `true`。
   *
   * `false` 给「高频、瞬时、自己管着局部状态」的调用：字号拖拽、开关一个偏好项、
   * 增删标签——这些包一层全屏遮罩反而闪。设 `false` 时**只少遮罩**，
   * 失败留痕（`log.warn` + toast）一条不少。
   */
  spin?: boolean;
  /**
   * 遮罩上的文案。不传走 `useLoading` 的默认文案——那对「导出图片 / 转智能对象」
   * 这类耗时动作不给任何上下文，用户只看到转圈。
   */
  tip?: string;
}

/**
 * 「失败 → 留痕 + 提示」的**唯一实现**：`run` 与 `reportFailure` 都走它。
 *
 * 分成两个出口只因为**结果从哪来**不同：`run` 是「我去执行一条命令」，
 * `reportFailure` 是「结果已经在我手里了」（读路径，如 `readKuItem`）。
 * 两处各写一遍 `log.warn` + `toast.error` 就是一份重复实现，而且读路径那份通常忘了写日志。
 */
function announce(
  failure: Extract<Result<unknown>, { status: 'error' }>,
  options: RunOptions,
  toast: { error: (message: string) => void },
  label: string
): void {
  if (options.quiet?.includes(failure.code)) return;
  /*
   * 三样都进日志：`code` 是机器分类、`detail` 是机器原文、**`reason` 是宿主原话**。
   *
   * 真机证据（2026-10-28）：`ys_checkUseFont` 回 `{"err":1,"msg":"请选择文字图层!"}`，
   * 折出来的 `detail` 是**空串** —— 只记 code+detail 的话，日志里唯一有用的信息
   *（「请选择文字图层!」）就没了，排障只能靠猜。
   */
  log.warn(label, { code: failure.code, reason: failure.reason, detail: failure.detail });
  toast.error(options.reasonOf ? options.reasonOf(failure) : failure.reason);
}

/**
 * 已经拿到 `Result`、只需要「留痕 + 提示」时用它（读路径）。
 *
 * 没有这个出口时，读路径只能自己 `toast.error(reason)`——只弹提示不写日志，
 * 于是同一个失败在命令路径有码、在读路径没码，真机上对不上账。
 */
export function useReportFailure(): (result: Result<unknown>, options?: RunOptions) => void {
  const toast = useToast();

  return useCallback(
    (result: Result<unknown>, options: RunOptions = {}) => {
      if (result.status === 'error') announce(result, options, toast, '读取失败');
    },
    [toast]
  );
}

/**
 * 返回原 `Result`，调用方仍可自行判断（需要差别处理某几个码时）。
 *
 * 泛型是为了让 `result.value` 保持原类型——否则每个「失败才提示、成功用值」的调用点
 * 都得写一次 `as` 断言。
 */
export function useRunCommand(): <T>(
  task: () => Promise<Result<T>>,
  options?: RunOptions
) => Promise<Result<T>> {
  const toast = useToast();
  const loading = useLoading();

  return useCallback(
    async <T,>(task: () => Promise<Result<T>>, options: RunOptions = {}) => {
      /* 不转圈时直接跑：`task` 自己保证返回 Result（命令层从不抛），异常照旧上抛 */
      const result = options.spin === false ? await task() : await loading.run(task, options.tip);

      if (result.status === 'error') {
        announce(result, options, toast, '命令执行失败');
      } else if (options.success) {
        toast.info(options.success);
      }

      options.after?.();
      return result;
    },
    [loading, toast]
  );
}
