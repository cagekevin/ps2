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

const logWarn = vi.hoisted(() => vi.fn());

vi.mock('../logger', () => ({
  log: { info: vi.fn(), warn: logWarn, error: vi.fn() }
}));

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

describe('toLocalPath（CEP 返回的 URI → 本地路径）', () => {
  beforeEach(() => {
    vi.resetModules();
    logWarn.mockClear();
  });

  it('正常 URI：解码 + 剥 file 前缀', async () => {
    const { toLocalPath } = await import('./bridge');

    expect(toLocalPath('file:///C:/a%20b')).toBe('C:/a b');
    expect(logWarn).not.toHaveBeenCalled();
  });

  it('路径里有不完整的 %（decodeURI 抛）→ 回落原文、不抛、且留痕（`TD-01-27`）', async () => {
    const { toLocalPath } = await import('./bridge');

    expect(toLocalPath('file:///C:/a%zz')).toBe('C:/a%zz');
    expect(logWarn).toHaveBeenCalledTimes(1);
  });
});
