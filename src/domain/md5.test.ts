import { describe, expect, it } from 'vitest';
import { md5 } from './md5';

/* 4 条标准向量（RFC 1321 附录 A.5）：签名算错时接口只报「签名错误」，靠这组锁住实现 */
describe('md5', () => {
  it('空串', () => {
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
  });

  it('abc', () => {
    expect(md5('abc')).toBe('900150983cd24fb0d6963f7d28e17f72');
  });

  it('message digest', () => {
    expect(md5('message digest')).toBe('f96b697d7cb7938d525a2f31aaf161d0');
  });

  it('多字节字符按 UTF-8 字节算', () => {
    /* 值与 node crypto 的 update(文本, 'utf8') 对齐：中文按 UTF-16 码元算会得到别的摘要，接口只报签名错误 */
    expect(md5('设计助理')).toBe('2cde1025157c502041274937ea1aa004');
  });
});
