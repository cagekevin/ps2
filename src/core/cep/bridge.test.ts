/**
 * CEP 通道的失败可见性。
 *
 * 只测「宿主不存在」这一条路：它是 node 环境里唯一能稳定复现的通道失败，
 * 也正好是历史上被折成 `ok('')` 假成功的那条（`lenientVoid` 会把空串判成功，
 * 界面提示已生效、PS 里什么都没发生）。
 *
 * 不测 evalScript 正常路径：那要真机，`UNVERIFIED`。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** 最小 `window` 桩：本模块只读 `window.__adobe_cep__` 与 `window.CSEvent` */
function setWindow(cep: unknown, csEvent?: unknown): void {
  (globalThis as unknown as { window?: unknown }).window = {
    __adobe_cep__: cep,
    CSEvent: csEvent
  };
}

describe('CEP 宿主不存在', () => {
  beforeEach(() => {
    vi.resetModules();
    setWindow(undefined);
  });

  it('evalScript 返回 PS_UNREADY，不返回空串假成功', async () => {
    const { evalScript } = await import('./bridge');
    const result = await evalScript('1 + 1');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('PS_UNREADY');
      expect(result.detail).toBe('bridge:no-cep');
    }
  });

  it('emitAppEvent 返回失败，不静默吞掉广播', async () => {
    const { emitAppEvent } = await import('./bridge');
    const result = emitAppEvent('com.maomao.event.test', 'x');

    expect(result.status).toBe('error');
  });
});
