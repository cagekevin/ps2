/**
 * 【范本】子进程唯一出口 —— 全仓只许这一处 `child_process`；新增同类代码照此结构。
 *
 * 调用方只需要知道三件事：给 exe + 参数数组 + 超时；拿到 `code` 与合并后的输出行。
 * 不用知道：行缓冲怎么切、两路输出怎么合、超时怎么杀、`code` 为什么可能是 `null`。
 *
 * 三条定死：
 *   1. **参数走数组**（不经 shell）：中文 / 空格路径不需要引号，也不会有注入面。
 *   2. **两路输出合并成一个 `lines`**：引擎本来就把 stdout / stderr 当一份日志，
 *      分两路等于每个调用方都要再拼一次。
 *   3. **本模块不记日志**：同一失败只记一次（`ADR-0003`），失败尾部随 `Result` 上抛，
 *      由调用方决定要不要落日志。
 *
 * 超时不是 `Result` 的一个字段，而是 `Result` 的 `TIMEOUT` 臂 —— 成功时不需要再表达一次。
 */

import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import { nodeRequire } from './node';

interface ReadableStream {
  on(event: 'data', listener: (chunk: { toString(encoding: string): string }) => void): void;
  on(event: 'end', listener: () => void): void;
}

interface ChildProcessHandle {
  stdout: ReadableStream;
  stderr: ReadableStream;
  on(event: 'error', listener: (error: Error) => void): void;
  on(event: 'close', listener: (code: number | null) => void): void;
  kill(): void;
}

interface ChildProcessModule {
  spawn(
    exe: string,
    args: string[],
    options: { cwd?: string; windowsHide?: boolean }
  ): ChildProcessHandle;
}

export interface ProcessOutput {
  /** 被 kill / 信号结束时是 `null` —— 类型写实，别断言成 `number` */
  code: number | null;
  /** stdout 与 stderr 合并后的非空行（按到达顺序） */
  lines: string[];
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 跑一个外部进程：行缓冲收集输出，超时 kill。
 *
 * `timeoutMs` 必填 —— 通用原语不猜域常量（`DLSS_TIMEOUT_MS` 之类由调用方传）。
 */
export function runProcess(
  exe: string,
  args: string[],
  options: { cwd?: string; timeoutMs: number }
): Promise<Result<ProcessOutput>> {
  const module = nodeRequire<ChildProcessModule>('child_process');
  if (module.status === 'error') return Promise.resolve(module);

  return new Promise<Result<ProcessOutput>>((resolve) => {
    const lines: string[] = [];
    let settled = false;
    /* 不写 `window.setTimeout`：这个模块要能在 node 里单测，两边的全局 `setTimeout` 都有 */
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = (result: Result<ProcessOutput>): void => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      resolve(result);
    };

    /* 每个流一个闭包缓冲：超时要能把没换行的尾巴也吐出来 */
    const flushers: Array<() => void> = [];
    const flushAll = (): void => {
      for (const flush of flushers) flush();
    };

    const collect = (stream: ReadableStream): void => {
      let buffer = '';
      const flush = (): void => {
        const rest = buffer.replace(/\r$/, '');
        if (rest.trim()) lines.push(rest);
        buffer = '';
      };

      stream.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        let breakAt = buffer.indexOf('\n');
        while (breakAt >= 0) {
          const line = buffer.slice(0, breakAt).replace(/\r$/, '');
          if (line.trim()) lines.push(line);
          buffer = buffer.slice(breakAt + 1);
          breakAt = buffer.indexOf('\n');
        }
      });
      stream.on('end', flush);
      flushers.push(flush);
    };

    let child: ChildProcessHandle;
    try {
      child = module.value.spawn(exe, args, { cwd: options.cwd, windowsHide: true });
    } catch (error) {
      resolve(failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, `spawn:${exe}:${messageOf(error)}`));
      return;
    }

    collect(child.stdout);
    collect(child.stderr);

    timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        /* 已经退出：kill 失败不影响结论，超时这件事本身要报出去 */
      }
      flushAll();
      finish(failWithDetail('TIMEOUT', MSG.codeReason.TIMEOUT, `timeout:${options.timeoutMs}`));
    }, options.timeoutMs);

    child.on('error', (error) => {
      finish(failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, `spawn:${exe}:${messageOf(error)}`));
    });

    child.on('close', (code) => {
      flushAll();
      finish(ok({ code, lines }));
    });
  });
}
