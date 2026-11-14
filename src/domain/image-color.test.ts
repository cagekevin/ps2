import { describe, expect, it } from 'vitest';
import { GRADIENT_STOP_USER, GRADIENT_TYPE_LINEAR, createGradientItem, hexToCmyk, hexToRgb, quantizeColors, rgbToCmyk } from './image-color';

describe('hexToRgb', () => {
  it('六位十六进制转 rgb（带不带 # 都认）', () => {
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#ff8800')).toEqual({ r: 255, g: 136, b: 0 });
    expect(hexToRgb('ff8800')).toEqual({ r: 255, g: 136, b: 0 });
  });

  it('认不出返回 null（调用方兜底色）', () => {
    expect(hexToRgb(null)).toBeNull();
    expect(hexToRgb('#fff')).toBeNull();
    expect(hexToRgb('red')).toBeNull();
  });
});

describe('rgbToCmyk', () => {
  it('纯黑只占 K，纯白全零', () => {
    expect(rgbToCmyk({ r: 0, g: 0, b: 0 })).toEqual({ c: 0, m: 0, y: 0, k: 100 });
    expect(rgbToCmyk({ r: 255, g: 255, b: 255 })).toEqual({ c: 0, m: 0, y: 0, k: 0 });
  });

  it('纯红是 C0 M100 Y100 K0', () => {
    expect(rgbToCmyk({ r: 255, g: 0, b: 0 })).toEqual({ c: 0, m: 100, y: 100, k: 0 });
  });
});

describe('hexToCmyk', () => {
  it('认得出时等价于 hexToRgb → rgbToCmyk', () => {
    expect(hexToCmyk('#ff0000')).toEqual({ c: 0, m: 100, y: 100, k: 0 });
  });

  it('认不出返回 null，不给一个看起来正常的颜色', () => {
    expect(hexToCmyk('zzzzzz')).toBeNull();
    expect(hexToCmyk('#12')).toBeNull();
  });
});

describe('createGradientItem', () => {
  it('两色：色标落在 0 与 4096 两端，位置是整数刻度', () => {
    const item = createGradientItem('两色', ['#9383CA', '#F6E9BF']);
    const stops = item.gradient.gradient.colors;
    expect(stops.map((stop) => stop.location)).toEqual([0, 4096]);
  });

  it('N 色：位置等距，首尾仍是 0 与 4096', () => {
    const item = createGradientItem('五色', ['#000000', '#444444', '#888888', '#BBBBBB', '#FFFFFF']);
    expect(item.gradient.gradient.colors.map((stop) => stop.location)).toEqual([0, 1024, 2048, 3072, 4096]);
  });

  it('位置恒为整数，不把小数刻度写进载荷', () => {
    /* 3 个色标：4096/2 恰好整除；7 个色标：4096/6 = 682.67，必须落成整数 */
    const item = createGradientItem('七色', ['#000000', '#111111', '#222222', '#333333', '#444444', '#555555', '#666666']);
    for (const stop of item.gradient.gradient.colors) {
      expect(Number.isInteger(stop.location)).toBe(true);
    }
  });

  it('只要一个色标就抛错，不返回构造不出来的渐变', () => {
    expect(() => createGradientItem('一色', ['#000000'])).toThrow(RangeError);
    expect(() => createGradientItem('零色', [])).toThrow(RangeError);
  });

  it('type 是数字 charID：与读回来的 `getEnumerationValue` 同型', () => {
    const item = createGradientItem('类型', ['#000000', '#FFFFFF']);
    expect(item.gradient.type).toBe(GRADIENT_TYPE_LINEAR);
    expect(typeof item.gradient.type).toBe('number');
    for (const stop of item.gradient.gradient.colors) {
      expect(stop.type).toBe(GRADIENT_STOP_USER);
      expect(typeof stop.type).toBe('number');
    }
  });

  it('透明度固定两端两档，不随色标数量膨胀', () => {
    const item = createGradientItem('八色', ['#000000', '#202020', '#404040', '#606060', '#808080', '#A0A0A0', '#C0C0C0', '#FFFFFF']);
    expect(item.gradient.gradient.transparency).toEqual([
      { opacity: 100, location: 0, midpoint: 50 },
      { opacity: 100, location: 4096, midpoint: 50 }
    ]);
  });

  it('hexValue 不带井号：库项显示侧按 `#` + hexValue 拼 CSS（domain/style-library.gradientSwatch）', () => {
    const item = createGradientItem('井号', ['#9383ca', '#f6e9bf']);
    expect(item.gradient.gradient.colors.map((stop) => stop.color.hexValue)).toEqual(['9383ca', 'f6e9bf']);
  });
});

describe('quantizeColors 的容差聚类（覆盖 isSimilarHex 走 hexToRgb 之后的比较口径）', () => {
  /** 造一幅纯色块拼成的图：`blocks` 是 [rgba, 像素个数] 的列表，按行优先填 */
  function makeImage(blocks: Array<[number[], number]>): { data: Uint8ClampedArray; width: number; height: number } {
    const pixels: number[] = [];
    for (const [rgba, count] of blocks) for (let index = 0; index < count; index += 1) pixels.push(...rgba);
    const data = new Uint8ClampedArray(pixels);
    return { data, width: pixels.length / 4, height: 1 };
  }

  it('三通道差都在容差内（50）的两种颜色合并成一种', () => {
    /* #808080 与 #969696 差 22，且各自都超过稀有阈值 50 像素 ⇒ 都在 common 组 */
    const colors = quantizeColors(makeImage([[[128, 128, 128, 255], 250], [[150, 150, 150, 255], 150]]));
    expect(colors).toHaveLength(1);
    /* 种子是像素更多的那一种，占比合计为 1 */
    expect(colors[0]).toEqual({ hex: '#808080', num: 1 });
  });

  it('超出容差的两种颜色保持两种', () => {
    const colors = quantizeColors(makeImage([[[0, 0, 0, 255], 200], [[200, 200, 200, 255], 200]]));
    expect(colors).toHaveLength(2);
    expect(colors.map((color) => color.hex)).toEqual(['#000000', '#c8c8c8']);
  });

  it('只要有一个通道超差就不合并（不是「平均差」判据）', () => {
    /* 只有红通道差 60 > 50，绿蓝完全相同 */
    const colors = quantizeColors(makeImage([[[100, 100, 100, 255], 200], [[160, 100, 100, 255], 200]]));
    expect(colors).toHaveLength(2);
  });
});
