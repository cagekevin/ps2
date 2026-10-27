import { describe, expect, it } from 'vitest';
import {
  applyTextPatch,
  DEFAULT_TEXT_INFO,
  normalizeTextColor,
  normalizeTextInfo
} from './text-info';

describe('text-info', () => {
  it('默认值：12 点 / 白 / 左对齐 / 请选择字体', () => {
    expect(DEFAULT_TEXT_INFO.size).toBe('12');
    expect(DEFAULT_TEXT_INFO.leading).toBe(0);
    expect(DEFAULT_TEXT_INFO.tracking).toBe(0);
    expect(DEFAULT_TEXT_INFO.color).toEqual({ r: 255, g: 255, b: 255 });
    expect(DEFAULT_TEXT_INFO.family).toBe('请选择字体');
    expect(DEFAULT_TEXT_INFO.justification).toBe('left');
  });

  it('归一化：缺的字段补默认，认出一个字段就够', () => {
    const result = normalizeTextInfo({ size: 24, color: { rgb: { r: 1, g: 2, b: 3 } } });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.value.size).toBe('24');
      expect(result.value.color).toEqual({ r: 1, g: 2, b: 3 });
      expect(result.value.weight).toBe(DEFAULT_TEXT_INFO.weight);
    }
  });

  it('归一化：一个可识别字段都没有 → CORRUPT，不渲染成默认值', () => {
    const result = normalizeTextInfo({ foo: 1, bar: 2 });
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('CORRUPT');
  });

  it('颜色归一：越界夹到 0~255，取不到用白色', () => {
    expect(normalizeTextColor({ r: 300, g: -5, b: 10.6 })).toEqual({ r: 255, g: 0, b: 11 });
    expect(normalizeTextColor(null)).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('乐观 patch：base 为 null 时从默认值起算，颜色是副本', () => {
    const patched = applyTextPatch(null, { size: '30', color: { r: 10, g: 20, b: 30 } });
    expect(patched.size).toBe('30');
    expect(patched.color).toEqual({ r: 10, g: 20, b: 30 });
    expect(patched.family).toBe(DEFAULT_TEXT_INFO.family);

    expect(patched.color).not.toBe(DEFAULT_TEXT_INFO.color);
  });
});
