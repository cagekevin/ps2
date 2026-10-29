import { describe, expect, it } from 'vitest';
import { decodeArray, decodeList } from './decode-list';
import { failWithDetail, ok, type Result } from './result';

/** 只认数字，其余一律失败——用最小的判据验策略，不掺业务字段 */
function numberItem(value: unknown, path: string): Result<number> {
  return typeof value === 'number' ? ok(value) : failWithDetail('CORRUPT', '不是数字', path);
}

describe('decodeList', () => {
  it('全好：顺序与数量不变，dropped 为空', () => {
    expect(decodeList([1, 2, 3], numberItem, 'filter')).toEqual(
      ok({ items: [1, 2, 3], records: [1, 2, 3], dropped: [] })
    );
  });

  it('空数组 → ok（不是 CORRUPT，空是合法状态）', () => {
    expect(decodeList([], numberItem, 'reject')).toEqual(
      ok({ items: [], records: [], dropped: [] })
    );
  });

  it('顶层不是数组 → CORRUPT，两种策略都一样（结构性错误不能过滤）', () => {
    for (const policy of ['reject', 'filter'] as const) {
      const result = decodeList({ list: [] }, numberItem, policy);

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.code).toBe('CORRUPT');
        expect(result.detail).toBe('root');
      }
    }
  });

  it('reject：一项坏就整份失败，detail 指出第几个', () => {
    const result = decodeList([1, 'x', 3], numberItem, 'reject');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('CORRUPT');
      expect(result.detail).toBe('root[1]');
    }
  });

  it('filter：丢掉坏项、保留其余，dropped 带 path 与那一项的原因', () => {
    expect(decodeList([1, 'x', 3], numberItem, 'filter')).toEqual(
      ok({
        items: [1, 3],
        /* records 是**原始数组**：调用方靠它保下标与写回空间，不必二次解码 */
        records: [1, 'x', 3],
        /* `detail` 一并带过来：只有 path 时看不出「坏在哪个字段」（刀14） */
        dropped: [{ path: 'root[1]', code: 'CORRUPT', reason: '不是数字', detail: 'root[1]' }]
      })
    );
  });

  it('records 与入参是同一个数组（不是副本）', () => {
    const raw = [1, 'x', 3];
    const result = decodeList(raw, numberItem, 'filter');

    if (result.status === 'error') throw new Error('应当成功');
    expect(result.value.records).toBe(raw);
  });

  it('filter 全坏时仍返回 ok + 逐项 dropped（要不要整份拒绝由调用方选策略）', () => {
    const result = decodeList(['a', 'b'], numberItem, 'filter');

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.value.items).toEqual([]);
      expect(result.value.dropped).toHaveLength(2);
    }
  });

  it('pathPrefix 同时决定 dropped.path 与 detail 的前缀', () => {
    const filtered = decodeList(['x'], numberItem, 'filter', 'tags');

    expect(filtered.status).toBe('ok');
    if (filtered.status === 'ok') expect(filtered.value.dropped[0]?.path).toBe('tags[0]');

    const rejected = decodeList(['x'], numberItem, 'reject', 'stars');
    if (rejected.status === 'error') expect(rejected.detail).toBe('stars[0]');
  });
});

describe('decodeArray', () => {
  it('是数组就原样返回（同一个引用，调用方靠它保下标）', () => {
    const raw = [1, 2, 3];
    expect(decodeArray(raw)).toEqual(ok(raw));
  });

  it('不是数组 → CORRUPT，detail 用传入的前缀', () => {
    const result = decodeArray({ list: [] }, 'tags');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('CORRUPT');
      expect(result.detail).toBe('tags');
    }
  });
});
