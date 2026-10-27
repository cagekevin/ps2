import { describe, expect, it } from 'vitest';
import { resolveFontFace, type FontItem } from './font-item';

function font(overrides: Partial<FontItem> = {}): FontItem {
  return {
    family: 'MiSans',
    weights: ['Regular'],
    names: ['MiSans'],
    postScriptNames: ['MiSans-Regular'],
    ...overrides
  };
}

describe('resolveFontFace', () => {
  it('三个名字齐全 → 按索引取出一组', () => {
    const result = resolveFontFace(font(), 0);
    expect(result).toEqual({
      status: 'ok',
      value: { postScriptName: 'MiSans-Regular', name: 'MiSans', weight: 'Regular' }
    });
  });

  it('缺 PostScript 名 → VALIDATION，不再回落到家族名', () => {
    const result = resolveFontFace(font({ postScriptNames: [] }), 0);
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('VALIDATION');
      expect(result.reason).toContain('PostScript 名');
    }
  });

  it('缺字重 → VALIDATION，不再回落成 Regular', () => {
    const result = resolveFontFace(font({ weights: [] }), 0);
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('VALIDATION');
      expect(result.reason).toContain('字重');
      expect(result.detail).toBe('family:MiSans index:0');
    }
  });

  it('索引超出数组 → 缺哪个报哪个（三个一起报）', () => {
    const result = resolveFontFace(font(), 3);
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.reason).toContain('字重');
  });
});
