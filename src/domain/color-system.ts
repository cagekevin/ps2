/**
 * 本地双色配色系统：一对「前景 + 背景」，零网络、零 IO、可单测。
 *
 * 为什么不联网取色：面板跑在 CEP 的 `file://` 环境里，第三方配色站点既没有 CORS 头，
 * 也没有稳定的数据契约与授权 —— 色值必须留在仓里。
 *
 * 为什么不在运行时现算色值：按色相环算出来的颜色「结构正确，好不好看没人担保」。
 * 好看这一条交给数据（`./color-pairs`，六类风格各 50 对的精选配色），
 * 本文件只做两件事：十六进制转 RGB、随机取一对。
 *
 * 前景是主色（填充 / 描边 / 文字），背景是陪衬色（擦除 / 蒙版 / 渐变底）。
 */

import type { ColorPair, RgbColor } from '../types/color';
import { COLOR_PAIRS_HEX } from './color-pairs';
import { hexToRgb } from './image-color';

/** 十六进制 → RGB：解析只有 `image-color.hexToRgb` 一处，不另写第二个 */
function toRgb(hex: string): RgbColor {
  const rgb = hexToRgb(hex);
  /* 表是常量数据，解析不出来只可能是表被改坏（编程错误，不降级成默认色） */
  if (!rgb) throw new Error(`配色表里的色值无法解析：${hex}`);
  return rgb;
}

/** 本地配色表（300 对，六类风格各 50），模块加载时转一次 RGB */
export const COLOR_PAIRS: readonly ColorPair[] = COLOR_PAIRS_HEX.map(
  ([, foreground, background]) => ({
    foreground: toRgb(foreground),
    background: toRgb(background)
  })
);

/**
 * 从本地配色表随机取一对。
 *
 * `random` 可注入（测试给固定序列），业务默认 `Math.random`。
 * 两次可能取到同一对——「这次别重复」由调用方比，本函数不记状态（纯函数）。
 */
export function randomColorPair(random: () => number = Math.random): ColorPair {
  const count = COLOR_PAIRS.length;
  const raw = Math.floor(random() * count);
  /* 注入的 random 可能给 1 / 负数 / NaN：夹到合法下标，不抛也不返回空 */
  const index = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), count - 1) : 0;

  const pair = COLOR_PAIRS[index];
  /* 表由常量数据算出，空表只可能是数据被改坏（编程错误，不降级） */
  if (!pair) throw new Error(`配色表为空：index=${index}`);
  return pair;
}
