import { describe, expect, it } from 'vitest';
import { envelopeMessage, isOkSentinel, parseErrEnvelope, parseJsxRaw, unwrapRaw } from './raw';

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

describe('isOkSentinel', () => {
  it('ok / OK / 带空白都算哨兵', () => {
    expect(isOkSentinel('ok')).toBe(true);
    expect(isOkSentinel('OK')).toBe(true);
    expect(isOkSentinel('  ok\n')).toBe(true);
  });

  it('其它值不算哨兵', () => {
    expect(isOkSentinel('1')).toBe(false);
    expect(isOkSentinel('{"arr":[]}')).toBe(false);
  });
});

describe('envelopeMessage', () => {
  it('取宿主的 msg（trim 前后空白）', () => {
    expect(envelopeMessage({ err: 1, msg: '请选择文字图层', code: 0 })).toBe('请选择文字图层');
    expect(envelopeMessage({ err: 1, msg: ' 字体缺失 ' })).toBe('字体缺失');
  });

  it('没有 msg / msg 不是字符串 → 空串（调用方走兜底文案）', () => {
    expect(envelopeMessage({ err: 1 })).toBe('');
    expect(envelopeMessage({ err: 1, msg: null })).toBe('');
    expect(envelopeMessage({ code: 'OK' })).toBe('');
    expect(envelopeMessage('not json')).toBe('');
    expect(envelopeMessage(null)).toBe('');
  });
});

describe('parseErrEnvelope', () => {
  it('解析 {err:1}', () => {
    const parsed = parseErrEnvelope('{"err":1}');
    expect(parsed.status).toBe('ok');
    if (parsed.status === 'ok') expect(parsed.value).toBe(1);
  });

  it('没有 err 字段 → CORRUPT（不再有 null 通道）', () => {
    const parsed = parseErrEnvelope('{"data":1}');
    expect(parsed.status).toBe('error');
    if (parsed.status === 'error') expect(parsed.code).toBe('CORRUPT');
  });

  it('不是 JSON → CORRUPT', () => {
    const parsed = parseErrEnvelope('garbage');
    expect(parsed.status).toBe('error');
    if (parsed.status === 'error') expect(parsed.code).toBe('CORRUPT');
  });
});
