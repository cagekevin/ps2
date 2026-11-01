import { describe, expect, it } from 'vitest';
import { MSG } from '../types/messages';
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
    /* 期望值由 node crypto 对同一串 UTF-8 文本算出，锁住拼接顺序与 salt 的用途。
       用假凭证：真密钥只存在 `credentials.json`，不进仓库 */
    const params = buildTranslateParams({
      text: '你好',
      from: 'auto',
      to: 'en',
      appId: 'test-app',
      key: 'test-key',
      salt: '123'
    });
    expect(params.sign).toBe('c0e7626880a1f1604b0c5e36303bdcdf');
    expect(params.appid).toBe('test-app');
    expect(params.salt).toBe('123');
    expect(params._time).toBe('123');
  });

  it('响应解析：两代成功码都认，已知错误码按语义折、未知码才 CORRUPT', () => {
    expect(decodeTranslateResponse({ error_code: '52000', trans_result: [{ dst: 'Hello' }] })).toEqual({
      status: 'ok',
      value: 'Hello'
    });
    expect(decodeTranslateResponse({ error_code: '0', trans_result: [{ dst: 'Hello' }] })).toEqual({
      status: 'ok',
      value: 'Hello'
    });

    /* 54003 频控 → NETWORK（不是「数据坏了」） */
    const busy = decodeTranslateResponse({ error_code: '54003', error_msg: 'Invalid Access Limit' });
    expect(busy.status).toBe('error');
    if (busy.status === 'error') {
      expect(busy.code).toBe('NETWORK');
      expect(busy.detail).toContain('Invalid Access Limit');
    }

    /* 54004 欠费 → FORBIDDEN，且不再说「返回数据无法识别」 */
    const quota = decodeTranslateResponse({ error_code: '54004', error_msg: 'Please recharge' });
    expect(quota.status).toBe('error');
    if (quota.status === 'error') {
      expect(quota.code).toBe('FORBIDDEN');
      expect(quota.reason).toBe(MSG.font.translateQuota);
    }

    /* 表里没有的码才归 CORRUPT */
    const unknown = decodeTranslateResponse({ error_code: '99999', error_msg: 'weird' });
    expect(unknown.status).toBe('error');
    if (unknown.status === 'error') expect(unknown.code).toBe('CORRUPT');
  });

  it('1000 字边界：上限常量是 1000，边界长度往返不丢字', () => {
    expect(MAX_TEXT_LENGTH).toBe(1000);

    const text = '字'.repeat(MAX_TEXT_LENGTH);
    expect(decodeText(encodeText(text))).toBe(text);
  });

  it('条目归一：缺 text 的段落要报出第几段，不按空串继续', () => {
    /* 句子来自 `MSG`（生产者给字），`detail` 指出第几段 */
    expect(decodeTranslateItems([{ text: 'a' }, { other: 1 }])).toEqual({
      status: 'error',
      code: 'CORRUPT',
      reason: MSG.corrupt,
      detail: 'root[1].text'
    });
  });
});
