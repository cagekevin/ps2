import { describe, expect, it } from 'vitest';
import { hexToCmyk, hexToRgb, rgbToCmyk } from './image-color';

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
