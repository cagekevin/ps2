import { describe, expect, it } from 'vitest';
import { fail, failWithDetail, ok } from './result';

describe('Result', () => {
  it('ok 携带数据', () => {
    const result = ok(1);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value).toBe(1);
  });

  it('fail 携带错误码、原因，detail 为空串', () => {
    const result = fail('AUTH', '未登录');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('AUTH');
      expect(result.reason).toBe('未登录');
      expect(result.detail).toBe('');
    }
  });

  it('failWithDetail 带底层原文', () => {
    const result = failWithDetail('PS_ERROR', '执行失败', 'raw:-1');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason).toBe('执行失败');
      expect(result.detail).toBe('raw:-1');
    }
  });
});
