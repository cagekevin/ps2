import { describe, expect, it } from 'vitest';
import { decodeClassification, emptyClassification, toCategoryTags } from './classification';

describe('toCategoryTags', () => {
  it('只收 id 数字且 category 字符串的项', () => {
    expect(
      toCategoryTags([
        { id: 1, category: 'language', name: '简体' },
        { id: '2', category: 'language' },
        { category: 'language' },
        { id: 3, category: 'language', repeat: 3 }
      ])
    ).toEqual([
      { id: 1, category: 'language', name: '简体', icon: undefined, repeat: undefined },
      { id: 3, category: 'language', name: undefined, icon: undefined, repeat: 3 }
    ]);
  });
});

describe('decodeClassification', () => {
  it('按固定顺序输出分组，跳过结构不认识的分组', () => {
    const result = decodeClassification({
      categories: {
        type: { name: '字体类型', tags: [{ id: 1, category: 'type', name: '黑体' }] },
        language: { name: '字体语言', tags: [{ id: 1, category: 'language', name: '简体' }] },
        broken: 'bad'
      }
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;

    expect(result.value.categories.map((item) => item.key)).toEqual(['language', 'type']);
  });

  it('只解分组：presets / commercials 不进结果', () => {
    const result = decodeClassification({
      categories: { language: { name: '字体语言', tags: [] } },
      presets: { MiSans: { type: [1] } },
      commercials: ['MiSans']
    });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value).toEqual({ categories: result.value.categories });
  });

  it('顶层不是对象 → CORRUPT', () => {
    const result = decodeClassification([]);
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('CORRUPT');
  });

  it('空对象是合法数据（分组为空但不损坏）', () => {
    const result = decodeClassification({});
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value).toEqual(emptyClassification());
  });
});
