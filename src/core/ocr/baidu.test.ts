import { describe, expect, it } from 'vitest';
import { decodeBaiduWords } from './baidu';

/* 只测纯解析（不发请求）：`recognize` 的网络部分要真机，见 plan 17 §10 */

describe('decodeBaiduWords', () => {
  it('words_result 逐项折成行级框', () => {
    const result = decodeBaiduWords({
      words_result: [
        { words: '标题', location: { left: 10, top: 20, width: 100, height: 30 } },
        { words: '正文', location: { left: 12, top: 60, width: 200, height: 24 } }
      ]
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.lines).toEqual([
      { content: '标题', left: 10, top: 20, width: 100, height: 30 },
      { content: '正文', left: 12, top: 60, width: 200, height: 24 }
    ]);
    expect(result.value.dropped).toBe(0);
  });

  it('缺 location 或字段类型不对的项跳过，不猜坐标，并计入 dropped', () => {
    const result = decodeBaiduWords({
      words_result: [
        { words: '没有框' },
        { words: '框不完整', location: { left: 1, top: 2 } },
        { words: '正常', location: { left: 1, top: 2, width: 3, height: 4 } }
      ]
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.lines).toHaveLength(1);
    expect(result.value.lines[0]?.content).toBe('正常');
    /* 少了两行必须让调用方说得出来，不能静默丢 */
    expect(result.value.dropped).toBe(2);
  });

  it('配额类 error_code 折 FORBIDDEN，原文进 detail', () => {
    const result = decodeBaiduWords({ error_code: 17, error_msg: 'Open api daily request limit reached' });

    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.code).toBe('FORBIDDEN');
    expect(result.detail).toContain('17');
  });

  it('图像类 error_code 折 VALIDATION', () => {
    const result = decodeBaiduWords({ error_code: 216201, error_msg: 'image format error' });

    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.code).toBe('VALIDATION');
  });

  it('token 失效折 AUTH（调用方据此重取一次）', () => {
    const result = decodeBaiduWords({ error_code: 110, error_msg: 'Access token invalid or no longer valid' });

    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.code).toBe('AUTH');
  });

  it('结构认不出给 CORRUPT', () => {
    expect(decodeBaiduWords(null).status).toBe('error');
    expect(decodeBaiduWords({ words_result: 'nope' }).status).toBe('error');
  });
});
