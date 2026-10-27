import { describe, expect, it } from 'vitest';
import {
  COMMON_USE_SETTING_KEYS,
  isCommonUseSettingKey,
  mergeCommonUseOptions,
  pickCommonUseOptions
} from './common-use-options';

describe('COMMON_USE_SETTING_KEYS', () => {
  it('正好 17 个，且没有重复', () => {
    expect(COMMON_USE_SETTING_KEYS).toHaveLength(17);
    expect(new Set(COMMON_USE_SETTING_KEYS).size).toBe(17);
  });

  it('白名单判定只认这 17 个', () => {
    expect(isCommonUseSettingKey('cyShowZoom')).toBe(true);
    expect(isCommonUseSettingKey('cyNotExist')).toBe(false);
    expect(isCommonUseSettingKey('ztHierarych')).toBe(false);
  });
});

describe('pickCommonUseOptions', () => {
  it('缺键给 undefined（不是 false），17 个键都在', () => {
    const options = pickCommonUseOptions({ cyShowZoom: true });
    expect(Object.keys(options)).toHaveLength(17);
    expect(options.cyShowZoom).toBe(true);
    expect(options.cyShowTransformation).toBeUndefined();
  });

  it('不在白名单的键不会被带进来', () => {
    const options = pickCommonUseOptions({ ztHierarych: [6, 5, 4], cyShowBatch: false });
    expect(options.cyShowBatch).toBe(false);
    expect(Object.keys(options)).toHaveLength(17);
  });

  it('嵌套对象原样取（不解释 cyExport 的形状）', () => {
    const options = pickCommonUseOptions({ cyExport: { ext: 'png', quality: 80 } });
    expect(options.cyExport).toEqual({ ext: 'png', quality: 80 });
  });
});

describe('mergeCommonUseOptions', () => {
  it('未知顶层键原样保留', () => {
    const merged = mergeCommonUseOptions(
      { appUnit: 'pt', ztHierarych: [1, 2] },
      { cyShowZoom: false }
    );
    expect(merged).toEqual({ appUnit: 'pt', ztHierarych: [1, 2], cyShowZoom: false });
  });

  it('对象逐键合并（不整块替换，别的子键不丢）', () => {
    const merged = mergeCommonUseOptions(
      { cyExport: { ext: 'png', quality: 80, scale: 1 } },
      { cyExport: { quality: 60 } }
    );
    expect(merged.cyExport).toEqual({ ext: 'png', quality: 60, scale: 1 });
  });

  it('数组整体替换，不按下标合并', () => {
    const merged = mergeCommonUseOptions({ cyOptimizeAll: [1, 2, 3] }, { cyOptimizeAll: [9] });
    expect(merged.cyOptimizeAll).toEqual([9]);
  });

  it('嵌套到二级也走对象合并', () => {
    const merged = mergeCommonUseOptions(
      { cyExport: { advanced: { a: 1 } } },
      { cyExport: { advanced: { b: 2 } } }
    );
    expect(merged.cyExport).toEqual({ advanced: { a: 1, b: 2 } });
  });

  it('null 与原始值整体覆盖', () => {
    const merged = mergeCommonUseOptions(
      { cyShowZoom: { deep: true }, cyShowBatch: 1 },
      { cyShowZoom: null, cyShowBatch: false }
    );
    expect(merged.cyShowZoom).toBeNull();
    expect(merged.cyShowBatch).toBe(false);
  });
});
