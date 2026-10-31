/**
 * `core/auth` 的降级留痕（`TD-01-27`）。
 *
 * 这两条 catch 的判据是「降级可以，但必须留痕」：CEP 里 `localStorage` 可能被禁，
 * 此时**不抛**是对的（没登录不是故障，业务要能继续），但「这次读写失败了」必须进日志，
 * 否则用户「为什么每次都要重新登录」永远查不出来。
 *
 * node 环境默认没有 `localStorage`——正好就是降级路径本身，不用桩。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const logWarn = vi.hoisted(() => vi.fn());

vi.mock('../logger', () => ({
  log: { info: vi.fn(), warn: logWarn, error: vi.fn() }
}));

beforeEach(() => {
  vi.resetModules();
  logWarn.mockClear();
});

describe('localStorage 不可用', () => {
  it('getToken 不抛、返回 null，并且留痕', async () => {
    const { getToken } = await import('./index');

    expect(getToken()).toBeNull();
    expect(logWarn).toHaveBeenCalledTimes(1);
  });

  it('setToken 不抛，并且留痕（内存态仍然生效）', async () => {
    const { setToken } = await import('./index');

    expect(() => setToken('abc')).not.toThrow();
    expect(logWarn).toHaveBeenCalledTimes(1);
  });

  it('clearToken 走同一条路（等价 setToken(null)）', async () => {
    const { clearToken } = await import('./index');

    expect(() => clearToken()).not.toThrow();
    expect(logWarn).toHaveBeenCalledTimes(1);
  });
});

describe('localStorage 可用', () => {
  it('写入后能读回，且不产生日志', async () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key)
    });

    const { getToken, setToken, clearToken } = await import('./index');

    setToken('abc');
    expect(getToken()).toBe('abc');
    expect(store.size).toBe(1);

    clearToken();
    expect(store.size).toBe(0);
    expect(logWarn).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
