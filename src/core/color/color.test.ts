import { describe, expect, it } from 'vitest';
import { fromPs, normalizeHex, sameColor, toCss, toPs } from './index';

const BASE = { hex: 'E6CDB2', c: 13, m: 23, y: 31, k: 0 };

describe('fromPs', () => {
  it('解析完整格式', () => {
    expect(fromPs('E6CDB2|13|23|31|0')).toEqual(BASE);
  });

  it('缺省 cmyk 视为 0，hex 转大写', () => {
    expect(fromPs('ffffff')).toEqual({ hex: 'FFFFFF', c: 0, m: 0, y: 0, k: 0 });
  });

  it('非法输入返回 null', () => {
    expect(fromPs('')).toBeNull();
    expect(fromPs('ZZZZZZ')).toBeNull();
    expect(fromPs('12345')).toBeNull();
  });

  it('越界百分比被裁剪', () => {
    const color = fromPs('000000|120|-5|50|100');
    expect(color?.c).toBe(100);
    expect(color?.m).toBe(0);
    expect(color?.y).toBe(50);
  });
});

describe('toPs', () => {
  it('往返一致', () => {
    expect(toPs(BASE)).toBe('E6CDB2|13|23|31|0');
  });

  it('hex 带 # 也能处理', () => {
    expect(toPs({ hex: '#ffffff', c: 0, m: 0, y: 0, k: 0 })).toBe('FFFFFF|0|0|0|0');
  });

  it('非法 hex 抛错', () => {
    expect(() => toPs({ hex: 'xyz', c: 0, m: 0, y: 0, k: 0 })).toThrow();
  });
});

describe('normalizeHex', () => {
  it('去 # 并大写', () => {
    expect(normalizeHex('#e6cdb2')).toBe('E6CDB2');
  });

  it('长度不对抛错', () => {
    expect(() => normalizeHex('FFF')).toThrow();
  });
});

describe('toCss / sameColor', () => {
  it('toCss 带 #', () => {
    expect(toCss(BASE)).toBe('#E6CDB2');
  });

  it('sameColor 忽略大小写与 #', () => {
    expect(sameColor({ hex: '#e6cdb2', c: 0, m: 0, y: 0, k: 0 }, BASE)).toBe(true);
    expect(sameColor({ hex: 'FFFFFF', c: 0, m: 0, y: 0, k: 0 }, BASE)).toBe(false);
  });
});
