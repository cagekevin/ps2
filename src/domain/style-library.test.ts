import { describe, expect, it } from 'vitest';
import {
  decodeStyleIndex,
  fileNameOf,
  kuGuid,
  normalizeStyleIndex,
  readKuGroups,
  type KuGroup
} from './style-library';

describe('decodeStyleIndex', () => {
  it('正常索引', () => {
    const raw = { index: 1, list: [{ name: 'A' }, { name: 'B' }] };
    const result = decodeStyleIndex(raw);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.value.index).toBe(1);
      expect(result.value.list).toHaveLength(2);
    }
  });

  it('不是对象 → error(CORRUPT)', () => {
    expect(decodeStyleIndex(null).status).toBe('error');
    expect(decodeStyleIndex([]).status).toBe('error');
  });

  it('缺少 list → error(CORRUPT)', () => {
    const result = decodeStyleIndex({ index: 0 });
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('CORRUPT');
      expect(result.reason).toContain('list');
    }
  });

  it('index 越界被夹到合法范围', () => {
    const raw = { index: 99, list: [{ name: 'A' }, { name: 'B' }] };
    expect(normalizeStyleIndex(raw).index).toBe(1);

    const negative = { index: -5, list: [{ name: 'A' }] };
    expect(normalizeStyleIndex(negative).index).toBe(0);
  });
});

describe('fileNameOf', () => {
  it('取登记的库文件名', () => {
    expect(fileNameOf({ name: 'A', color: 'sj_kuCol1.ini' }, 'color')).toBe('sj_kuCol1.ini');
  });

  it('没登记返回空串', () => {
    expect(fileNameOf({ name: 'A' }, 'style')).toBe('');
    expect(fileNameOf(undefined, 'color')).toBe('');
  });
});

describe('readKuGroups - 颜色', () => {
  const text = JSON.stringify([
    {
      name: '白到黑',
      show: false,
      list: [
        { name: '未命名', color: { hex: '151515', c: 86, m: 82, y: 81, k: 69 } },
        { name: '坏颜色', color: { hex: 'zzz' } }
      ]
    }
  ]);

  it('解析组与色值', () => {
    const result = readKuGroups('color', text);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;

    const groups = result.value;
    expect(groups).toHaveLength(1);
    expect(groups[0]?.name).toBe('白到黑');
    expect(groups[0]?.show).toBe(false);
    expect(groups[0]?.items[0]?.swatch).toBe('#151515');
  });

  it('非法 hex 不给色块，但保留项', () => {
    const result = readKuGroups('color', text);
    if (result.status !== 'ok') return;
    expect(result.value[0]?.items[1]?.swatch).toBeUndefined();
    expect(result.value[0]?.items[1]?.name).toBe('坏颜色');
  });

  it('非 JSON → error(CORRUPT)', () => {
    const result = readKuGroups('color', 'not json');
    expect(result.status).toBe('error');
  });

  it('顶层不是数组 → error(CORRUPT)', () => {
    const result = readKuGroups('color', '{"a":1}');
    expect(result.status).toBe('error');
  });

  it('flat 形态未注入解码器时如实报错', () => {
    const result = readKuGroups('color', JSON.stringify([{ name: 'a', data: 'xxx' }]));
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.reason).toContain('内层');
  });

  it('flat 形态注入解码器后能解析', () => {
    const inner = JSON.stringify([{ name: '组', show: true, list: [{ name: '色', color: { hex: 'FFFFFF' } }] }]);
    const result = readKuGroups('color', JSON.stringify([{ name: 'sj_kuCol1.ini', data: 'QUJD' }]), () => inner);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value[0]?.items[0]?.swatch).toBe('#FFFFFF');
  });
});

describe('readKuGroups - 渐变换算', () => {
  it('location 除以 4096，角度加 90（真实结构是双层 gradient）', () => {
    const text = JSON.stringify([
      {
        name: '组',
        list: [
          {
            name: '渐变',
            gradient: {
              angle: 90,
              gradient: {
                colors: [
                  { color: { hexValue: 'D8C09E' }, location: 0 },
                  { color: { hexValue: 'FFFFFF' }, location: 4096 }
                ]
              }
            }
          }
        ]
      }
    ]);

    const result = readKuGroups('gradient', text);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;

    const swatch = result.value[0]?.items[0]?.swatch;
    expect(swatch).toBe('linear-gradient(180deg, #D8C09E 0%, #FFFFFF 100%)');
  });

  it('location 1997 换算为 48.7548828125%', () => {
    const text = JSON.stringify([
      {
        name: '组',
        list: [
          {
            name: '渐变',
            gradient: {
              angle: 0,
              gradient: {
                colors: [
                  { color: { hexValue: 'D8C09E' }, location: 0 },
                  { color: { hexValue: 'E5D6BD' }, location: 1997 }
                ]
              }
            }
          }
        ]
      }
    ]);

    const result = readKuGroups('gradient', text);
    if (result.status !== 'ok') return;
    expect(result.value[0]?.items[0]?.swatch).toBe(
      'linear-gradient(90deg, #D8C09E 0%, #E5D6BD 48.7548828125%)'
    );
  });

  it('颜色少于两个不给色块', () => {
    const text = JSON.stringify([
      {
        name: '组',
        list: [
          {
            name: '单色',
            gradient: { angle: 0, gradient: { colors: [{ color: { hexValue: 'FFFFFF' }, location: 0 }] } }
          }
        ]
      }
    ]);
    const result = readKuGroups('gradient', text);
    if (result.status !== 'ok') return;
    expect(result.value[0]?.items[0]?.swatch).toBeUndefined();
  });

  it('图片型渐变透出 fileName', () => {
    const text = JSON.stringify([
      { name: '组', list: [{ name: '图片渐变', gradient: { fileName: 'abc.png' } }] }
    ]);
    const result = readKuGroups('gradient', text);
    if (result.status !== 'ok') return;
    expect(result.value[0]?.items[0]?.image).toBe('abc.png');
  });
});

describe('readKuGroups - 字体', () => {
  it('取 fonts[0] 的四件套', () => {
    const text = JSON.stringify([
      {
        name: '组',
        list: [
          {
            name: '字体项',
            fonts: [{ family: '思源黑体', weight: 'Regular', size: '24px', color: { rgb: { r: 1, g: 2, b: 3 } } }]
          }
        ]
      }
    ]);

    const result = readKuGroups('font', text);
    if (result.status !== 'ok') return;

    const preview = result.value[0]?.items[0]?.fontPreview;
    expect(preview?.count).toBe(1);
    expect(preview?.size).toBe('24点');
    expect(preview?.color).toBe('rgb(1, 2, 3)');
    expect(preview?.family).toBe('思源黑体');
  });

  it('color 为 null 时给空串，不抛错', () => {
    const text = JSON.stringify([
      { name: '组', list: [{ name: '字体项', fonts: [{ family: 'A', color: null }] }] }
    ]);
    const result = readKuGroups('font', text);
    if (result.status !== 'ok') return;
    expect(result.value[0]?.items[0]?.fontPreview?.color).toBe('');
  });
});

describe('readKuGroups - 样式', () => {
  it('有 id 才给缩略图', () => {
    const text = JSON.stringify([
      { name: '组', list: [{ name: '有图', id: 'abc' }, { name: '无图' }] }
    ]);
    const result = readKuGroups('style', text);
    if (result.status !== 'ok') return;
    const groups: KuGroup[] = result.value;
    expect(groups[0]?.items[0]?.thumb).toBe('abc.png');
    expect(groups[0]?.items[1]?.thumb).toBeUndefined();
  });
});

describe('kuGuid', () => {
  it('格式为 8-4-4-4-12 的大写十六进制', () => {
    expect(kuGuid()).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/);
  });

  it('每次生成不同', () => {
    expect(kuGuid()).not.toBe(kuGuid());
  });
});
