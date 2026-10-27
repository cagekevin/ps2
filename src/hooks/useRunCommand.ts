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
 * **不适用**（不同语义，别再包一层）：
 *   - `features/font-panel/useFontPanel` 的 `run`：它**不包 loading**，由调用方决定转不转圈，
 *     换成这个 hook 会给 20 多处凭空加遮罩（可见行为变化）
 *   - `features/home/HomePage`：调试页，toast 里要带 `code` 给开发者，且用返回值渲染
 */

import { useCallback } from 'react';
import { useLoading } from '../components/Loading';
import { useToast } from '../components/Toast';
import { log } from '../core/logger';
import type { ErrorCode, Result } from '../types/result';

export interface RunOptions {
  /** 成功时提示的话；不给 = 成功静默（执行类命令默认不喧哗） */
  success?: string;
  /** 这些码不算故障（典型：用户取消 `CANCELLED`），不提示 */
  quiet?: readonly ErrorCode[];
  /** 本域更具体的失败文案（如库文件缺失）；不给就用 `result.reason` */
  reasonOf?: (result: Result<unknown>) => string;
  /** 收尾动作（如重读列表）。**无论成败都执行**，与原 `runWithFeedback` 行为一致 */
  after?: () => void;
}

/** 返回原 `Result`，调用方仍可自行判断（需要差别处理某几个码时） */
export function useRunCommand(): (
  task: () => Promise<Result<unknown>>,
  options?: RunOptions
) => Promise<Result<unknown>> {
  const toast = useToast();
  const loading = useLoading();

  return useCallback(
    async (task: () => Promise<Result<unknown>>, options: RunOptions = {}) => {
      const result = await loading.run(task);

      if (result.status === 'error') {
        const quiet = options.quiet?.includes(result.code) ?? false;
        if (!quiet) {
          /* 原因不丢：码与机器现场进日志，人话进 toast */
          log.warn('命令执行失败', { code: result.code, detail: result.detail });
          toast.error(options.reasonOf ? options.reasonOf(result) : result.reason);
        }
      } else if (options.success) {
        toast.info(options.success);
      }

      options.after?.();
      return result;
    },
    [loading, toast]
  );
}
