import { describe, expect, it } from 'vitest';
import {
  buildTranslateParams,
  decodeText,
  encodeText,
  MAX_TEXT_LENGTH,
  decodeTranslateItems,
  decodeTranslateResponse
} from './translate';

describe('translate', () => {
  it('编码 → 解码可往返，含中文与标点', () => {
    const source = '你好，世界! 100%';
    expect(decodeText(encodeText(source))).toBe(source);
  });

  it('签名顺序是 md5(appid + q + salt + key)', () => {
    /* 期望值由 node crypto 对同一串 UTF-8 文本算出，锁住拼接顺序与 salt 的用途 */
    const params = buildTranslateParams({ text: '你好', from: 'auto', to: 'en', salt: '123' });
    expect(params.sign).toBe('1b8e0e4979fcd813224859d525e24bdb');
    expect(params.salt).toBe('123');
    expect(params._time).toBe('123');
  });

  it('响应解析：两代成功码都认，错误码折 CORRUPT 且 detail 带 error_msg', () => {
    expect(decodeTranslateResponse({ error_code: '52000', trans_result: [{ dst: 'Hello' }] })).toEqual({
      status: 'ok',
      value: 'Hello'
    });
    expect(decodeTranslateResponse({ error_code: '0', trans_result: [{ dst: 'Hello' }] })).toEqual({
      status: 'ok',
      value: 'Hello'
    });

    const bad = decodeTranslateResponse({ error_code: '54003', error_msg: 'Invalid Access Limit' });
    expect(bad.status).toBe('error');
    if (bad.status === 'error') {
      expect(bad.code).toBe('CORRUPT');
      expect(bad.detail).toContain('Invalid Access Limit');
    }
  });

  it('1000 字边界：上限常量是 1000，边界长度往返不丢字', () => {
    expect(MAX_TEXT_LENGTH).toBe(1000);

    const text = '字'.repeat(MAX_TEXT_LENGTH);
    expect(decodeText(encodeText(text))).toBe(text);
  });

  it('条目归一：缺 text 的段落要报出第几段，不按空串继续', () => {
    expect(decodeTranslateItems([{ text: 'a' }, { other: 1 }])).toEqual({
      status: 'error',
      code: 'CORRUPT',
      reason: '文本段落缺少 text 字段',
      detail: 'root[1]'
    });
  });
});
