import { describe, expect, it } from 'vitest';
import {
  BATCH_CONFIRM_OVER,
  COMMON_USE_SEED,
  decodeCommonUseItem,
  decodePsdList,
  needsBatchConfirm,
  toTiles
} from './common-use';

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

describe('toTiles 的下标空间', () => {
  it('坏项被跳过时 index 仍是文件里的真实下标', () => {
    /* 视图与写回共用原始记录：过滤后重新编号会让拖拽移动相邻的那一项 */
    const tiles = toTiles([{ id: 'a' }, { name: '没有 id' }, { id: 'c' }]);

    expect(tiles.map((tile) => tile.id)).toEqual(['a', 'c']);
    expect(tiles.map((tile) => tile.index)).toEqual([0, 2]);
  });
});

describe('decodeCommonUseItem', () => {
  it('不是对象 → CORRUPT，detail 是传进来的 path', () => {
    const result = decodeCommonUseItem('b', 'root[1]');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('CORRUPT');
      expect(result.detail).toBe('root[1]');
    }
  });

  it('缺 id → CORRUPT，detail 指到那一项的 id', () => {
    const result = decodeCommonUseItem({ name: '没有 id' }, 'root[0]');
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.detail).toBe('root[0].id');
  });

  it('正常项原样返回，未知键保留', () => {
    const item = { id: 'div_img_cya1', sort: 3, openistrue: true };
    const result = decodeCommonUseItem(item, 'root[0]');

    expect(result.status).toBe('ok');
    /* 同一个对象引用：写回时未知键不能丢 */
    if (result.status === 'ok') expect(result.value).toBe(item);
  });

  it('缺 id 但带 comName → 仍然可用（真机上就有这种项）', () => {
    /* `sj_commonFunction.json` 第 13 项就是这个形状：{ created, comName }，一个 id 都没有 */
    const result = decodeCommonUseItem({ created: '按间距分布', comName: 'comspacing' }, 'root[12]');
    expect(result.status).toBe('ok');
  });

  it('既没有 id 也没有 comName → 才记坏项', () => {
    const result = decodeCommonUseItem({ created: '按间距分布' }, 'root[12]');
    expect(result.status).toBe('error');
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

  it('缺 id 的项用 comName 当 id，仍进视图', () => {
    const tiles = toTiles([{ id: 'a' }, { created: '按间距分布', comName: 'comspacing' }]);
    expect(tiles.map((tile) => tile.id)).toEqual(['a', 'comspacing']);
    expect(tiles[1]?.index).toBe(1);
  });

  it('comName 为空串按「不可展开」处理', () => {
    const tiles = toTiles([{ id: 'a', comName: '' }, { id: 'b', comName: 'comspacing' }]);
    expect(tiles[0]?.comName).toBeNull();
    expect(tiles[1]?.comName).toBe('comspacing');
  });
});

describe('decodePsdList（PSD 列表的唯一判形状处）', () => {
  it('字符串数组 → 过滤空串后原样返回（空数组不算失败）', () => {
    expect(decodePsdList(['a.psd', '', 'b.psd'])).toEqual({ status: 'ok', value: ['a.psd', 'b.psd'] });
    expect(decodePsdList([])).toEqual({ status: 'ok', value: [] });
  });

  it('顶层不是数组 → VALIDATION，原样进 detail（不猜形状）', () => {
    const result = decodePsdList({ files: ['a.psd'] });
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('VALIDATION');
      expect(result.detail).toContain('files');
    }
  });
});

describe('needsBatchConfirm（官方 >30 才确认）', () => {
  it('29 / 30 不弹，31 弹', () => {
    expect(needsBatchConfirm(29)).toBe(false);
    expect(needsBatchConfirm(BATCH_CONFIRM_OVER)).toBe(false);
    expect(needsBatchConfirm(31)).toBe(true);
  });
});
