import { describe, expect, it } from 'vitest';
import { COLOR_PAIRS_HEX, type ColorStyle } from './color-pairs';
import { COLOR_PAIRS, randomColorPair } from './color-system';
import type { RgbColor } from '../types/color';

/** 相对亮度（WCAG 口径）：只用来判「两色会不会糊在一起」，不是可读性标准 */
function luminance({ r, g, b }: RgbColor): number {
  const channel = (value: number): number => {
    const ratio = value / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

const STYLES: ColorStyle[] = ['mono', 'neighbor', 'triad', 'complement', 'muted', 'vivid'];

describe('本地配色表', () => {
  it('六类风格各 50 对，共 300 对', () => {
    expect(COLOR_PAIRS_HEX).toHaveLength(300);
    for (const style of STYLES) {
      expect(COLOR_PAIRS_HEX.filter(([label]) => label === style)).toHaveLength(50);
    }
  });

  it('没有重复的一对', () => {
    const seen = new Set(COLOR_PAIRS_HEX.map(([, foreground, background]) => foreground + background));
    expect(seen.size).toBe(COLOR_PAIRS_HEX.length);
  });

  it('所有通道都是 0–255 的整数', () => {
    for (const pair of COLOR_PAIRS) {
      for (const color of [pair.foreground, pair.background]) {
        for (const value of [color.r, color.g, color.b]) {
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(255);
        }
      }
    }
  });

  it('每对都一深一浅：亮度差有下限', () => {
    for (const pair of COLOR_PAIRS) {
      const gap = Math.abs(luminance(pair.foreground) - luminance(pair.background));
      expect(gap).toBeGreaterThanOrEqual(0.25);
    }
  });

  it('前景总是较暗的一色', () => {
    for (const pair of COLOR_PAIRS) {
      expect(luminance(pair.foreground)).toBeLessThan(luminance(pair.background));
    }
  });
});

describe('randomColorPair', () => {
  it('默认取到表内的一项', () => {
    expect(COLOR_PAIRS).toContainEqual(randomColorPair());
  });

  it('注入固定值：0 取第一对，1 取最后一对，越界与 NaN 夹到两端', () => {
    const last = COLOR_PAIRS[COLOR_PAIRS.length - 1];
    expect(randomColorPair(() => 0)).toEqual(COLOR_PAIRS[0]);
    expect(randomColorPair(() => 0.999999)).toEqual(last);
    expect(randomColorPair(() => 1)).toEqual(last);
    expect(randomColorPair(() => -5)).toEqual(COLOR_PAIRS[0]);
    expect(randomColorPair(() => Number.NaN)).toEqual(COLOR_PAIRS[0]);
  });

  it('不同随机值取到不同的一对', () => {
    expect(randomColorPair(() => 0.5)).not.toEqual(randomColorPair(() => 0));
  });
});
