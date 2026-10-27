import { describe, expect, it } from 'vitest';
import { normalizeFontItem, normalizeFontList } from './font-normalize';

describe('normalizeFontItem', () => {
  it('收 jsx 那套键名', () => {
    const result = normalizeFontItem({
      family: 'MiSans',
      weights: ['Regular', 'Bold'],
      names: ['MiSans'],
      postScriptNames: ['MiSans-Regular', 'MiSans-Bold']
    });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.value.family).toBe('MiSans');
      expect(result.value.weights).toEqual(['Regular', 'Bold']);
      expect(result.value.postScriptNames).toHaveLength(2);
    }
  });

  it('收磁盘缓存那套键名', () => {
    const result = normalizeFontItem({
      name: '思源黑体',
      zz: ['Regular'],
      mz: ['思源黑体'],
      hjm: ['SourceHanSansSC-Regular']
    });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.value.family).toBe('思源黑体');
      expect(result.value.weights).toEqual(['Regular']);
      expect(result.value.names).toEqual(['思源黑体']);
      expect(result.value.postScriptNames).toEqual(['SourceHanSansSC-Regular']);
    }
  });

  it('缺家族名 → CORRUPT', () => {
    const result = normalizeFontItem({ weights: ['Regular'] });
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('CORRUPT');
  });

  it('单字符串按一项数组收', () => {
    const result = normalizeFontItem({ family: 'X', weights: 'Bold' });
    if (result.status === 'ok') expect(result.value.weights).toEqual(['Bold']);
    else throw new Error('应当成功');
  });
});

describe('normalizeFontList', () => {
  it('坏项丢弃并计数', () => {
    const { list, dropped } = normalizeFontList([
      { family: 'A' },
      { weights: ['Regular'] },
      null,
      { name: 'B' }
    ]);

    expect(list.map((item) => item.family)).toEqual(['A', 'B']);
    expect(dropped).toBe(2);
  });

  it('空数组不算丢项', () => {
    expect(normalizeFontList([])).toEqual({ list: [], dropped: 0 });
  });
});
