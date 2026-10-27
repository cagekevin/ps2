import { describe, expect, it } from 'vitest';
import { fail, ok } from './result';

describe('Result', () => {
  it('ok 携带数据', () => {
    const result = ok(1);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(1);
  });

  it('fail 携带错误码与消息', () => {
    const result = fail('AUTH', '未登录');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('AUTH');
      expect(result.message).toBe('未登录');
    }
  });
});
