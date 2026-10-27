/**
 * base64 ↔ utf8 的唯一实现。
 *
 * 优先 Node Buffer；非 CEP 环境兜底 atob/btoa + TextDecoder。
 * 以前导出侧（ku-archive）和读取侧（style-repo）各写一份，编码/解码没有同一个家。
 */
import { nodeRequire } from './node';

interface BufferLike {
  from(data: string, encoding: 'utf8'): { toString(encoding: 'base64'): string };
  from(data: string, encoding: 'base64'): { toString(encoding: 'utf8'): string };
}

function bufferMod(): { Buffer: BufferLike } | null {
  return nodeRequire<{ Buffer: BufferLike }>('buffer');
}

export function encodeBase64(text: string): string {
  const mod = bufferMod();
  if (mod?.Buffer) return mod.Buffer.from(text, 'utf8').toString('base64');
  return btoa(unescape(encodeURIComponent(text)));
}

export function decodeBase64(text: string): string {
  const mod = bufferMod();
  if (mod?.Buffer) return mod.Buffer.from(text, 'base64').toString('utf8');

  const binary = atob(text);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
