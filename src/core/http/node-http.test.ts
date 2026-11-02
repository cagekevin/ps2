import { describe, expect, it } from 'vitest';
import { requestTarget } from './node-http';

/**
 * 这组用例钉的是一个真实事故（2026-11-02）：POST 分支只取 `pathname`，
 * 把地址里自带的 query 丢了，百度的 `access_token` / `grant_type` 全没发出去，
 * 整条 OCR 与翻译都报「凭证无效」。
 */
describe('requestTarget：地址自带的 query 不许丢', () => {
  it('POST：保留 URL 上的 query，params 走请求体', () => {
    const url = new URL('https://aip.baidubce.com/rest/2.0/ocr/v1/general?access_token=abc');
    const target = requestTarget(url, 'POST', { image: 'AAA', language_type: 'CHN_ENG' });

    expect(target.path).toBe('/rest/2.0/ocr/v1/general?access_token=abc');
    expect(target.body).toBe('image=AAA&language_type=CHN_ENG');
  });

  it('POST：URL 上没有 query 时路径保持干净', () => {
    const url = new URL('https://aip.baidubce.com/oauth/2.0/token');
    const target = requestTarget(url, 'POST', {});

    expect(target.path).toBe('/oauth/2.0/token');
    expect(target.body).toBe('');
  });

  it('GET：params 追加在原有 query 之后，请求体为空', () => {
    const url = new URL('https://example.com/api?x=1');
    const target = requestTarget(url, 'GET', { y: '2' });

    expect(target.path).toBe('/api?x=1&y=2');
    expect(target.body).toBe('');
  });
});
