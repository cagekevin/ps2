import { describe, expect, it } from 'vitest';
import { fontFamilyValue } from './font-stack';

describe('fontFamilyValue', () => {
  it('PostScript 名在前、家族名在后，各自带引号', () => {
    expect(fontFamilyValue('MiSans-Bold', 'MiSans')).toBe('"MiSans-Bold", "MiSans"');
  });

  it('中文家族名原样保留（不转义非 ASCII）', () => {
    expect(fontFamilyValue('FZLanTingHeiS-B-GB', '方正兰亭黑简体')).toBe(
      '"FZLanTingHeiS-B-GB", "方正兰亭黑简体"'
    );
  });

  it('名字里的双引号与反斜杠都要转义，否则整条声明拼废', () => {
    expect(fontFamilyValue('A"B', 'C\\D')).toBe('"A\\"B", "C\\\\D"');
  });

  it('空串也产出合法引号串（调用方保证非空，这里不抛）', () => {
    expect(fontFamilyValue('', '')).toBe('"", ""');
  });
});
