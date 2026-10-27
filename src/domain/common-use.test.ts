import { describe, expect, it } from 'vitest';
import { COMMON_USE_SEED, parseCommonUseFile, toTiles } from './common-use';

describe('COMMON_USE_SEED', () => {
  it('是官方 14 项，且 id 顺序不是数字顺序', () => {
    expect(COMMON_USE_SEED).toHaveLength(14);
    expect(COMMON_USE_SEED.map((item) => item.id)).toEqual([
      'div_img_cya1',
      'div_img_cya2',
      'div_img_cya3',
      'div_img_cya4',
      'div_img_cya5',
      'div_img_cya6',
      'div_img_cya7',
      'div_img_cya8',
      'div_img_cya9',
      'div_img_cya11',
      'div_img_cya13',
      'div_img_cya14',
      'div_img_cya15',
      'div_img_cya12'
    ]);
  });

  it('7 项可展开、7 项直接执行，且 cya10 / cya16 不存在', () => {
    expect(COMMON_USE_SEED.filter((item) => item.comName !== undefined)).toHaveLength(7);
    expect(COMMON_USE_SEED.filter((item) => item.isMore === true)).toHaveLength(7);
    expect(COMMON_USE_SEED.some((item) => item.id === 'div_img_cya10')).toBe(false);
    expect(COMMON_USE_SEED.some((item) => item.id === 'div_img_cya16')).toBe(false);
  });

  it('cya4 的 title 是官方空串（不是漏抄）', () => {
    const tile = COMMON_USE_SEED.find((item) => item.id === 'div_img_cya4');
    expect(tile?.title).toBe('');
  });
});

describe('parseCommonUseFile', () => {
  it('顶层不是数组 → CORRUPT，detail 指到 root', () => {
    const result = parseCommonUseFile({ list: [] });
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('CORRUPT');
      expect(result.detail).toBe('root');
    }
  });

  it('数组里有非对象条目 → CORRUPT，detail 指到第几个', () => {
    const result = parseCommonUseFile([{ id: 'a' }, 'b']);
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.detail).toBe('root[1]');
  });

  it('缺 id → CORRUPT，不静默跳过', () => {
    const result = parseCommonUseFile([{ name: '没有 id' }]);
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.detail).toBe('root[0].id');
  });

  it('正常文件保留未知键', () => {
    const result = parseCommonUseFile([{ id: 'div_img_cya1', sort: 3, openistrue: true }]);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.value[0]).toEqual({ id: 'div_img_cya1', sort: 3, openistrue: true });
    }
  });
});

describe('toTiles', () => {
  it('文件为 null 时按种子渲染，index 从 0 连续', () => {
    const tiles = toTiles(null);
    expect(tiles).toHaveLength(14);
    expect(tiles.map((tile) => tile.index)).toEqual([...Array(14).keys()]);
    expect(tiles[0]?.id).toBe('div_img_cya1');
  });

  it('图标去前导 #，fillSvg 为 false 时没有悬停图', () => {
    const tiles = toTiles(null);
    expect(tiles[0]?.icon).toEqual({ rest: 'iconqianrutupian', filled: null });
    const filled = tiles.find((tile) => tile.id === 'div_img_cya4');
    expect(filled?.icon.filled).toBe('iconzidongtianchongyanselan');
  });

  it('isShow 缺失按显示，显式 false 才隐藏', () => {
    const tiles = toTiles([{ id: 'a', svg: '#x' }, { id: 'b', isShow: false }, { id: 'c', isShow: true }]);
    expect(tiles.map((tile) => tile.visible)).toEqual([true, false, true]);
  });

  it('没有 id 的项不进视图（不拿下标冒充 id）', () => {
    const tiles = toTiles([{ id: 'a' }, { name: '无 id' }]);
    expect(tiles.map((tile) => tile.id)).toEqual(['a']);
  });

  it('comName 为空串按「不可展开」处理', () => {
    const tiles = toTiles([{ id: 'a', comName: '' }, { id: 'b', comName: 'comspacing' }]);
    expect(tiles[0]?.comName).toBeNull();
    expect(tiles[1]?.comName).toBe('comspacing');
  });
});
