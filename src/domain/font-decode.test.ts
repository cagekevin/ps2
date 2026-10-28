import { describe, expect, it } from 'vitest';
import { ok } from '../types/result';
import { decodeFontItem, decodeFontList } from './font-decode';

describe('decodeFontItem', () => {
  it('收 jsx 那套键名', () => {
    const result = decodeFontItem({
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
    const result = decodeFontItem({
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
    const result = decodeFontItem({ weights: ['Regular'] });
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('CORRUPT');
  });

  it('单字符串按一项数组收', () => {
    const result = decodeFontItem({ family: 'X', weights: 'Bold' });
    if (result.status === 'ok') expect(result.value.weights).toEqual(['Bold']);
    else throw new Error('应当成功');
  });
});

describe('decodeFontList', () => {
  it('坏项丢弃并记账（path 指出第几项）', () => {
    const result = decodeFontList([
      { family: 'A' },
      { weights: ['Regular'] },
      null,
      { name: 'B' }
    ]);

    if (result.status === 'error') throw new Error('应当成功');
    expect(result.value.list.map((item) => item.family)).toEqual(['A', 'B']);
    expect(result.value.dropped.map((item) => item.path)).toEqual(['root[1]', 'root[2]']);
  });

  it('空数组不算丢项', () => {
    expect(decodeFontList([])).toEqual(ok({ list: [], dropped: [] }));
  });

  it('顶层不是数组 → CORRUPT（不把「不是数组」当空列表）', () => {
    const result = decodeFontList({ arr: [] });
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('CORRUPT');
  });
});
