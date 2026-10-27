/**
 * 【范本】颜色横切
 * 全项目唯一的颜色编解码。PS 侧字符串格式固定为 'hex|c|m|y|k'。
 * 新增格式转换只能加在这里，禁止在 feature 里 split('|')。
 */

import type { Color } from '../../types/color';

const PS_COLOR = /^([0-9a-fA-F]{6})(?:\|(-?\d+))?(?:\|(-?\d+))?(?:\|(-?\d+))?(?:\|(-?\d+))?$/;

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** PS 返回的 'hex|c|m|y|k' → Color，非法输入返回 null */
export function fromPs(raw: string): Color | null {
  if (!raw) return null;
  const matched = PS_COLOR.exec(raw.trim());
  if (!matched) return null;

  const hex = matched[1];
  if (!hex) return null;

  return {
    hex: hex.toUpperCase(),
    c: clampPercent(Number(matched[2] ?? 0)),
    m: clampPercent(Number(matched[3] ?? 0)),
    y: clampPercent(Number(matched[4] ?? 0)),
    k: clampPercent(Number(matched[5] ?? 0))
  };
}

/** Color → PS 侧字符串 */
export function toPs(color: Color): string {
  return [
    normalizeHex(color.hex),
    clampPercent(color.c),
    clampPercent(color.m),
    clampPercent(color.y),
    clampPercent(color.k)
  ].join('|');
}

export function normalizeHex(hex: string): string {
  const value = hex.replace(/^#/, '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(value)) {
    throw new Error(`非法颜色值: ${hex}`);
  }
  return value;
}

export function toCss(color: Color): string {
  return `#${normalizeHex(color.hex)}`;
}

export function sameColor(a: Color, b: Color): boolean {
  return normalizeHex(a.hex) === normalizeHex(b.hex);
}
