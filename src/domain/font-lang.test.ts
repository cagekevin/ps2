import { describe, expect, it } from 'vitest';
import { familyLang, isAsciiFamily } from './font-lang';

describe('isAsciiFamily', () => {
  it('纯 ASCII 家族名算英文', () => {
    expect(isAsciiFamily('MiSans')).toBe(true);
    expect(isAsciiFamily('Noto Sans CJK JP')).toBe(true);
    expect(isAsciiFamily('Arial-Bold_1?')).toBe(true);
  });

  it('中文 / 假名 / 全角符号都算非英文', () => {
    expect(isAsciiFamily('思源黑体')).toBe(false);
    expect(isAsciiFamily('ヒラギノ角ゴ')).toBe(false);
    expect(isAsciiFamily('°')).toBe(false);
  });
});

describe('familyLang', () => {
  it('只给 en / cn 两种结论', () => {
    expect(familyLang('Didot')).toBe('en');
    expect(familyLang('苹方-简')).toBe('cn');
  });
});
