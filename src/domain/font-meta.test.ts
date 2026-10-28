import { describe, expect, it } from 'vitest';
import { decodeFontStars, decodeFontTags, parseTagArchive } from './font-meta';

describe('decodeFontTags', () => {
  it('收合法标签，缺省 arr / xz 补默认值', () => {
    const result = decodeFontTags([{ text: '标题' }, { text: '正文', arr: ['MiSans'], xz: true }]);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.value.tags).toEqual([
        { text: '标题', arr: [], xz: false },
        { text: '正文', arr: ['MiSans'], xz: true }
      ]);
      expect(result.value.dropped).toHaveLength(0);
    }
  });

  it('坏条目丢弃并计数', () => {
    const result = decodeFontTags([
      { text: '' },
      { text: 'A', arr: [1] },
      { text: 'B', xz: 'yes' },
      'bad'
    ]);
    if (result.status === 'ok') {
      expect(result.value.tags).toEqual([]);
      expect(result.value.dropped).toHaveLength(4);
      expect(result.value.dropped[0]?.path).toBe('root[0]');
      expect(result.value.dropped[0]?.code).toBe('CORRUPT');
    } else {
      throw new Error('应当成功');
    }
  });

  it('顶层不是数组 → CORRUPT', () => {
    const result = decodeFontTags({ tags: [] });
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('CORRUPT');
  });
});

describe('decodeFontStars', () => {
  it('数字与字符串都收，重复取后者', () => {
    const result = decodeFontStars([
      { name: 'MiSans', star: 2 },
      { name: 'OPPOSans', star: '3' },
      { name: 'MiSans', star: 1 }
    ]);
    if (result.status === 'ok') {
      expect(result.value.stars).toEqual({ MiSans: 1, OPPOSans: 3 });
      expect(result.value.dropped).toHaveLength(0);
    } else {
      throw new Error('应当成功');
    }
  });

  it('非法星级丢弃', () => {
    const result = decodeFontStars([{ name: 'A', star: 0 }, { name: 'B', star: 'x' }, {}]);
    if (result.status === 'ok') {
      expect(result.value.stars).toEqual({});
      expect(result.value.dropped).toHaveLength(3);
    } else {
      throw new Error('应当成功');
    }
  });
});

describe('parseTagArchive', () => {
  it('纯标签数组：只覆盖标签，未知键原样保留', () => {
    const result = parseTagArchive(
      JSON.stringify([{ text: '标题', arr: ['MiSans'], extra: 1 }])
    );
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.value.tags).toHaveLength(1);
      expect(result.value.tags[0]?.extra).toBe(1);
      expect(result.value.stars).toBeUndefined();
    }
  });

  it('对象形状：标签 + 评分，star 的字符串类型不被规范化', () => {
    const result = parseTagArchive(
      JSON.stringify({
        tags: [{ text: '正文', arr: [], xz: false }],
        stars: [{ name: 'OPPOSans', star: '3', extra: true }]
      })
    );
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.value.stars?.[0]?.star).toBe('3');
      expect(result.value.stars?.[0]?.extra).toBe(true);
    }
  });

  it('失败的 detail 指出条目与字段，不靠中文定位', () => {
    const arr = parseTagArchive(JSON.stringify([{ text: 'A', arr: [1] }]));
    if (arr.status === 'error') expect(arr.detail).toBe('tags[0].arr');

    const star = parseTagArchive(JSON.stringify({ tags: [], stars: [{ name: 'A', star: true }] }));
    if (star.status === 'error') expect(star.detail).toBe('stars[0].star');

    const tags = parseTagArchive(JSON.stringify({ tags: 'x' }));
    if (tags.status === 'error') expect(tags.detail).toBe('root.tags');
  });

  it('字段不合法 → CORRUPT，且不返回半份数据', () => {
    expect(parseTagArchive(JSON.stringify([{ text: '' }])).status).toBe('error');
    expect(parseTagArchive(JSON.stringify([{ text: 'A', arr: [1] }])).status).toBe('error');
    expect(
      parseTagArchive(JSON.stringify({ tags: [], stars: [{ name: 'A', star: true }] })).status
    ).toBe('error');
    expect(parseTagArchive('not json').status).toBe('error');
  });

  it('stars 缺省 = 不覆盖；空数组 = 覆盖成空', () => {
    const absent = parseTagArchive(JSON.stringify({ tags: [] }));
    if (absent.status === 'ok') expect(absent.value.stars).toBeUndefined();

    const empty = parseTagArchive(JSON.stringify({ tags: [], stars: [] }));
    if (empty.status === 'ok') expect(empty.value.stars).toEqual([]);
  });
});

