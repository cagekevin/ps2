/**
 * 子进程原语的语义（`ADR-0002` 判据 5：每条语义要有会红的检查）。
 *
 * 用 `process.execPath` spawn 自己（node），不依赖任何外部可执行文件：
 * 退出码、超时、两路输出合并都能在一个进程内造出来。
 */
import { describe, expect, it, vi } from 'vitest';

/* `nodeRequire` 走的是 CEP 的 `window.require`，node 环境下没有 `window` —— 直接给它 node 的 require */
vi.mock('./node', async () => {
  const { createRequire } = await import('node:module');
  const requireCjs = createRequire(import.meta.url);
  return {
    nodeRequire: (name: string) => ({ status: 'ok', value: requireCjs(name) })
  };
});

import { runProcess } from './process';

const NODE = process.execPath;

describe('runProcess', () => {
  it('正常退出：code 0，stdout 与 stderr 合并进同一个 lines', async () => {
    const result = await runProcess(
      NODE,
      ['-e', "console.log('out-1'); console.error('err-1'); console.log('out-2');"],
      { timeoutMs: 10_000 }
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.code).toBe(0);
    expect(result.value.lines).toContain('out-1');
    expect(result.value.lines).toContain('err-1');
    expect(result.value.lines).toContain('out-2');
  });

  it('非 0 退出码原样返回（判成败是调用方的事，不是原语的）', async () => {
    const result = await runProcess(NODE, ['-e', 'process.exit(3)'], { timeoutMs: 10_000 });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.code).toBe(3);
  });

  it('超时：kill 进程并落 TIMEOUT，detail 带毫秒数', async () => {
    const result = await runProcess(NODE, ['-e', 'setTimeout(function () {}, 10000)'], {
      timeoutMs: 200
    });

    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.code).toBe('TIMEOUT');
    expect(result.detail).toBe('timeout:200');
  });

  it('exe 不存在：IO_ERROR，detail 带路径与原因', async () => {
    const result = await runProcess('C:/maomao-no-such-dir/no-such.exe', [], { timeoutMs: 5_000 });

    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.code).toBe('IO_ERROR');
    expect(result.detail).toContain('no-such.exe');
  });
});
