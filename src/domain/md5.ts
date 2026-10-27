/**
 * MD5（纯函数，RFC 1321）
 *
 * 为什么自己写：翻译接口的 `sign` 是 `md5(appid + q + salt + key)`（原版 `Jv`），
 * 而本项目不引第三方依赖，`crypto.subtle` 只提供 SHA 且是异步的。
 *
 * 输入按 **UTF-8 字节** 计算：签名里带中文，按 UTF-16 码元算会得到别的摘要，
 * 接口会一直报「签名错误」。
 */

/** 每轮左移位数 */
const SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9,
  14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15,
  21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
];

/** K[i] = floor(abs(sin(i + 1)) * 2^32)，按 int32 存 */
const K = new Int32Array(64);
for (let index = 0; index < 64; index += 1) {
  K[index] = Math.floor(Math.abs(Math.sin(index + 1)) * 4294967296) | 0;
}

/** 32 位十六进制小写摘要 */
export function md5(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const bitLength = bytes.length * 8;

  /* 补 0x80 + 补零到 56 mod 64 + 末尾 8 字节长度（小端） */
  const total = (((bytes.length + 8) >> 6) + 1) * 64;
  const buffer = new Uint8Array(total);
  buffer.set(bytes);
  buffer[bytes.length] = 0x80;

  const view = new DataView(buffer.buffer);
  view.setUint32(total - 8, bitLength >>> 0, true);
  view.setUint32(total - 4, Math.floor(bitLength / 4294967296) >>> 0, true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89 | 0;
  let c0 = 0x98badcfe | 0;
  let d0 = 0x10325476;

  const words = new Int32Array(16);

  for (let offset = 0; offset < total; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getInt32(offset + index * 4, true);
    }

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let index = 0; index < 64; index += 1) {
      let f: number;
      let g: number;

      if (index < 16) {
        f = (b & c) | (~b & d);
        g = index;
      } else if (index < 32) {
        f = (d & b) | (~d & c);
        g = (5 * index + 1) % 16;
      } else if (index < 48) {
        f = b ^ c ^ d;
        g = (3 * index + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * index) % 16;
      }

      const mixed = (f + a + (K[index] ?? 0) + (words[g] ?? 0)) | 0;
      const shift = SHIFTS[index] ?? 0;

      a = d;
      d = c;
      c = b;
      b = (b + ((mixed << shift) | (mixed >>> (32 - shift)))) | 0;
    }

    a0 = (a0 + a) | 0;
    b0 = (b0 + b) | 0;
    c0 = (c0 + c) | 0;
    d0 = (d0 + d) | 0;
  }

  return [a0, b0, c0, d0]
    .map((word) => {
      let hex = '';
      for (let index = 0; index < 4; index += 1) {
        hex += ((word >>> (index * 8)) & 0xff).toString(16).padStart(2, '0');
      }
      return hex;
    })
    .join('');
}
