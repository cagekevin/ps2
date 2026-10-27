import { describe, expect, it } from 'vitest';
import { parseErrEnvelope, parseJsxRaw, unwrapRaw } from './raw';

describe('unwrapRaw', () => {
  it('约定失败码折成对应子码，detail 带原始值', () => {
    const result = unwrapRaw('no-doc');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('PS_NO_DOC');
      expect(result.detail).toBe('raw:no-doc');
    }
    expect(unwrapRaw('-1').status).toBe('error');
    expect(unwrapRaw('skipped').status).toBe('error');
    expect(unwrapRaw('not-shape').status).toBe('error');
  });

  it('前后空白不影响判定', () => {
    const result = unwrapRaw('  no-doc\n');
    if (result.status === 'error') expect(result.code).toBe('PS_NO_DOC');
    else throw new Error('应当失败');
  });

  it('非约定值算成功', () => {
    expect(unwrapRaw('ok').status).toBe('ok');
    expect(unwrapRaw('1').status).toBe('ok');
  });
});

describe('parseJsxRaw', () => {
  it('合法 JSON 原样透出', () => {
    const result = parseJsxRaw('{"a":1}');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value).toEqual({ a: 1 });
  });

  it('非 JSON → CORRUPT，detail 带原始值', () => {
    const result = parseJsxRaw('not json');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('CORRUPT');
      expect(result.reason).toContain('jsx 返回值');
      expect(result.detail).toContain('not json');
    }
  });
});

describe('parseErrEnvelope', () => {
  it('解析 {err:1}', () => {
    expect(parseErrEnvelope('{"err":1}')).toBe(1);
  });

  it('没有 err 字段返回 null', () => {
    expect(parseErrEnvelope('{"data":1}')).toBeNull();
  });

  it('不是 JSON 返回 null（调用方自己定语义）', () => {
    expect(parseErrEnvelope('garbage')).toBeNull();
  });
});
