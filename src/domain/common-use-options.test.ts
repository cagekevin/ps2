import { describe, expect, it } from 'vitest';
import {
  COMMON_USE_SETTING_KEYS,
  booleanOptionOf,
  exportConfigOf,
  isCommonUseSettingKey,
  linkObjectOf,
  missingOptionKeys,
  mergeCommonUseOptions,
  optionPatchOf,
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

describe('optionPatchOf', () => {
  it('一级键 → 整值补丁', () => {
    const patch = optionPatchOf('cyShowZoom', false);
    expect(patch).toEqual({ status: 'ok', value: { cyShowZoom: false } });
  });

  it('一级子路径 → 嵌套一层（cyExport.compress 的 4 个键）', () => {
    const patch = optionPatchOf('cyExport.compress.width', '800');
    expect(patch).toEqual({ status: 'ok', value: { cyExport: { compress: { width: '800' } } } });
    expect(optionPatchOf('cyExport.ext', 'PNG').status).toBe('ok');
  });

  it('白名单外的路径 → VALIDATION（不拼未知键）', () => {
    for (const path of ['notAKey', 'cyExport.compress.foo', 'cyShowZoom.deep.deeper', 'cyExport.']) {
      expect(optionPatchOf(path, 1).status, path).toBe('error');
    }
    expect(optionPatchOf('cyShowZoom.deep.deeper', 1)).toMatchObject({ code: 'VALIDATION' });
  });

  it('cyExport.compress 整块可写（只有 compress 的**子键**受 4 键白名单约束）', () => {
    const patch = optionPatchOf('cyExport.compress', { width: '800' });
    expect(patch).toEqual({ status: 'ok', value: { cyExport: { compress: { width: '800' } } } });
  });
});

describe('官方默认值（唯一出处）', () => {
  it('booleanOptionOf：文件是布尔就用文件，缺键用官方默认', () => {
    const empty = pickCommonUseOptions({});
    expect(booleanOptionOf(empty, 'cyShowZoom')).toBe(true);
    expect(booleanOptionOf(empty, 'cyDragInAutoEmbed')).toBe(false);

    const filled = pickCommonUseOptions({ cyShowZoom: false, cyDragInAutoEmbed: true });
    expect(booleanOptionOf(filled, 'cyShowZoom')).toBe(false);
    expect(booleanOptionOf(filled, 'cyDragInAutoEmbed')).toBe(true);
  });

  it('linkObjectOf：只认 -1/1/2，字符串与缺键回默认 -1（Vue 那套字符串写法作废）', () => {
    expect(linkObjectOf(pickCommonUseOptions({ cyLinkObject: 2 }))).toBe(2);
    expect(linkObjectOf(pickCommonUseOptions({ cyLinkObject: '2' }))).toBe(-1);
    expect(linkObjectOf(pickCommonUseOptions({}))).toBe(-1);
  });

  it('exportConfigOf：官方默认 + 文件值逐键合并，缺 compress 也补齐', () => {
    const config = exportConfigOf(pickCommonUseOptions({ cyExport: { ext: 'PNG', compress: { width: '800' } } }));

    expect(config.ext).toBe('PNG');
    expect(config.quality).toBe(100); // 官方默认
    expect(config.pathType).toBe(2);
    expect(config.compress).toEqual({ width: '800', height: '', watermark: '', exportOriginalGraph: false });
    /* 不认识的子键必须留着：整块交给 jsx，洗掉就等于改用户配置 */
    const extra = exportConfigOf(pickCommonUseOptions({ cyExport: { foo: 1 } }));
    expect(extra.foo).toBe(1);
  });

  it('missingOptionKeys：缺键与「用户选了默认值」必须能分开', () => {
    expect(missingOptionKeys(pickCommonUseOptions({}))).toHaveLength(17);
    expect(missingOptionKeys(pickCommonUseOptions({ cyShowZoom: false }))).toHaveLength(16);
  });
});
