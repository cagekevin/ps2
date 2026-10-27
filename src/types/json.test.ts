import { describe, expect, it } from 'vitest';
import { parseJson } from './json';

describe('parseJson', () => {
  it('合法 JSON 原样透出', () => {
    const result = parseJson('{"index":0,"list":[]}', '仓库索引');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value).toEqual({ index: 0, list: [] });
  });

  it('失败时 reason 带 label（说清是哪份文本）', () => {
    const result = parseJson('not json', '库文件');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('CORRUPT');
      expect(result.reason).toBe('库文件不是合法 JSON');
    }
  });
});
