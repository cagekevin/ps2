import { describe, expect, it } from 'vitest';
import { buildPath, stripBom } from './index';

describe('buildPath', () => {
  const userData = 'C:\\Users\\test\\AppData\\Roaming';

  it('data 根指向 Maomao', () => {
    expect(buildPath(userData, 'data', 'userColor.ini')).toBe(
      'C:\\Users\\test\\AppData\\Roaming/Maomao/userColor.ini'
    );
  });

  it('legacy 根指向 SheJiZhuLi', () => {
    expect(buildPath(userData, 'legacy', 'sj_kuStoreInfo.ini')).toBe(
      'C:\\Users\\test\\AppData\\Roaming/SheJiZhuLi/sj_kuStoreInfo.ini'
    );
  });
});

describe('stripBom', () => {
  it('去掉 UTF-8 BOM', () => {
    expect(stripBom('\uFEFF{"a":1}')).toBe('{"a":1}');
  });

  it('无 BOM 时原样返回', () => {
    expect(stripBom('{"a":1}')).toBe('{"a":1}');
  });

  it('空串安全', () => {
    expect(stripBom('')).toBe('');
  });
});
