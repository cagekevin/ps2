/**
 * 【范本】执行一条命令：包 loading + 反馈 + 原因留痕
 *
 * 唯一入口：`features/*` 调 `commands/*` 的动作用它。
 * 谁在用：常用页与两个子面板、样式页、字体面板、字体管理、设置页、首页。
 * 禁止：
 *   - 在这里做业务判断（成功/失败由命令给）
 *   - 丢掉 `code` / `detail`：toast 只显示给人看的那句，机器现场必须进日志
 *   - 把「操作不成立」的字面量提示塞进来（`请输入缩放倍数` 这类）：判据是
 *     **能不能写出一个 `Result`？** 写不出来（没有失败码、没有 `detail`、没有可留痕的现场），
 *     就不是「某个操作失败了」，而是「这个操作不成立」。可复核口径：
 *     `grep "toast\.error(" src/features` 的结果里**不带 `result` 的才允许存在**。
 */

import { useCallback } from 'react';
import { log } from '../core/logger';
import { useLoading } from './useLoading';
import { useToast } from './useToast';
import type { ErrorCode, Failure, Result } from '../types/result';

export interface RunOptions {
  /** 成功时提示的话；不给 = 成功静默（执行类命令默认不喧哗） */
  success?: string;
  /** 这些码不算故障（典型：用户取消 `CANCELLED`），不提示 */
  quiet?: readonly ErrorCode[];
  /** 收尾动作（如重读列表）。**无论成败都执行**，与原 `runWithFeedback` 行为一致 */
  after?: () => void;
  /**
   * 是否转圈（全屏遮罩），默认 `true`。
   *
   * **遮罩只给"用户应该等"的操作**：批量导出/导入、多文件、读取 PS 动作这类 >1s 的。
   * 秒级内的单次操作——单次 PS 变换、样式库增删改/应用/入库、模板索引写盘、动作库增删、
   * 字体应用——**不要弹遮罩**：官方同款操作从不遮罩，弹了只是闪一下，反而碍眼。
   *
   * 这类"不弹遮罩"的调用显式传 `spin: false`。想核对全部清单，`grep "spin: false"` 即可
   * （样式页的 `runWithFeedback` / `runWithToast` 把 `spin` 收成第三个位置参数，见该文件顶部注释）；
   * 没传（或 `spin: true`）的就是保留遮罩的。设 `false` 时**只少遮罩**，
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
  failure: Failure,
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
  /* 只转发生产者给的句子；不查表补字（补字 = 消费者替生产者说话） */
  toast.error(failure.reason);
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
