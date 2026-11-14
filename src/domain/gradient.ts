/**
 * 渐变过渡：两个颜色 + 过渡方式 → N 个色标（含两端）。
 *
 * 唯一入口：`sampleStops`（算整条渐变）与 `lchToHex`（色环取色 / 画环底色）。
 * 谁在用：`features/gradient`（页面）、`commands/style` 经 `domain/image-color.createGradientItem`
 * 把结果变成 PS 渐变载荷。
 *
 * 数值口径对齐 `mudong-gradient.pages.dev` 的引擎（源码见 `docs/参考/gradient-lab/color-core.js`），
 * 15 组端点×路线固定值在 `gradient.test.ts` 里逐点钉住。**改这里的任何常数都会让那批用例红**，
 * 那不是测试过时，是口径被改了。
 *
 * 禁止：
 * - 本模块之外再写一份 sRGB↔LCH / 色域收色 / 色相路径；
 * - 在这里碰文件、PS、React —— 纯函数，零 IO。
 *
 * 三件事的出处（别凭直觉改）：
 * 1. **LCH 用 D50 白点**：站点 LCH/LCHuv 走 D50，OKLCH 系列走 D65。本模块只做 LCH。
 * 2. **色域收色用 CSS Color 4 §13.2（OKLCH local-MINDE）**：不是「保 L/h 二分降 C」。
 *    后者是另一套策略，高饱和过渡会明显不同（红→绿长路线中点应为 `#FF37E6`，
 *    换成二分降 C 会得 `#FF00EF`）。站点经 Culori 的 `toGamut('rgb','oklch')` 走的正是 §13.2。
 * 3. **中性色没有色相**：RGB 三通道相等时色相必须清空，否则 Lab 换算的舍入会把灰染成彩；
 *    两个中性端点之间插值，`short` 与 `long` 必须给出同一条渐变。
 */

import { hexToRgb } from './image-color';

/** 过渡方式：直接（sRGB 直插）/ 短弧 / 长弧（都在 LCH 里走色相） */
export type GradientRoute = 'direct' | 'short' | 'long';

/* ─────────────── 色彩换算：sRGB ↔ LCH(D50)，色域收色走 CSS Color 4 ─────────────── */

/*
 * 矩阵与白点取 **CSS Color 4 的规范值**（不是 Lindbloom 的 7 位截断版）：
 * 截断版在灰度上会让 L 差到小数点后第 6 位，与参照引擎对不上；
 * 规范值是同一份规范里色域映射算法的配套常量，两边口径才对得齐。
 */
const D50 = { x: 0.9642956764295677, y: 1, z: 0.8251046025104602 };
const M_RGB_XYZ = [
  0.41239079926595934, 0.357584339383878, 0.1804807884018343,
  0.21263900587151027, 0.715168678767756, 0.07219231536073371,
  0.01933081871559182, 0.11919477979462598, 0.9505321522496607
];
const M_XYZ_RGB = [
  3.2409699419045226, -1.537383177570094, -0.4986107602930034,
  -0.9692436362808796, 1.8759675015077202, 0.04155505740717559,
  0.05563007969699366, -0.20397695888897652, 1.0569715142428786
];
/** Bradford 适应 D65→D50 / D50→D65 */
const M_D65_D50 = [
  1.0479298208405488, 0.022946793341019088, -0.05019222954313557,
  0.029627815688159344, 0.990434484573249, -0.01707382502938514,
  -0.009243058152591178, 0.015055144896577895, 0.7518742899580008
];
const M_D50_D65 = [
  0.9554734527042182, -0.023098536874261423, 0.0632593086610217,
  -0.028369706963208136, 1.0099954580058226, 0.021041398966943008,
  0.012314001688319899, -0.020507696433477912, 1.3303659366080753
];
/** OKLab 正反矩阵（D65，Björn Ottosson 原式） */
const M_OK = [
  0.4122214708, 0.5363325363, 0.0514459929,
  0.2119034982, 0.6806995451, 0.1073969566,
  0.0883024619, 0.2817188376, 0.6299787005
];
const M_OK_INV = [
  0.2104542553, 0.793617785, -0.0040720468,
  1.9779984951, -2.428592205, 0.4505937099,
  0.0259040371, 0.7827717662, -0.808675766
];

/** §13.2 的两个阈值：刚可辨差与收敛精度，规范原文就是这个量级 */
const JND = 0.02;
const GAMUT_EPSILON = 0.0001;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const mod360 = (value: number): number => ((value % 360) + 360) % 360;

function mul(matrix: readonly number[], vector: readonly number[]): [number, number, number] {
  return [
    (matrix[0] as number) * (vector[0] as number) +
      (matrix[1] as number) * (vector[1] as number) +
      (matrix[2] as number) * (vector[2] as number),
    (matrix[3] as number) * (vector[0] as number) +
      (matrix[4] as number) * (vector[1] as number) +
      (matrix[5] as number) * (vector[2] as number),
    (matrix[6] as number) * (vector[0] as number) +
      (matrix[7] as number) * (vector[1] as number) +
      (matrix[8] as number) * (vector[2] as number)
  ];
}

/** 非线性 sRGB（0..1）→ 线性光 */
function decode(value: number): number {
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

/** 线性光 → 非线性 sRGB（0..1）。出界不夹取 —— 夹取会抹掉「这个颜色在色域外」这个事实 */
function encode(value: number): number {
  return value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
}

/** 认不出的 HEX 是上游的编程错误：直接抛，不悄悄给一个看起来正常的颜色 */
function rgbOf(hex: string): [number, number, number] {
  const rgb = hexToRgb(hex);
  if (!rgb) throw new TypeError(`渐变色值无法解析：${hex}`);
  return [rgb.r, rgb.g, rgb.b];
}

interface Lch {
  L: number;
  C: number;
  /** 中性色没有色相：`undefined` 不是 0，别拿 0 顶上 */
  h: number | undefined;
}

function toLch(rgb: readonly number[]): Lch {
  const linear = rgb.map((channel) => decode(channel / 255));
  const d50 = mul(M_D65_D50, mul(M_RGB_XYZ, linear));
  /* Lab 的 f(t)：κ=24389/27，ε=216/24389，写成标准式不合并，免得后人认不出 */
  const epsilon = 216 / 24389;
  const kappa = 24389 / 27;
  const f = (t: number): number => (t > epsilon ? Math.cbrt(t) : (kappa * t + 16) / 116);
  const fx = f((d50[0] as number) / D50.x);
  const fy = f((d50[1] as number) / D50.y);
  const fz = f((d50[2] as number) / D50.z);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  const achromatic = rgb[0] === rgb[1] && rgb[1] === rgb[2];
  return {
    L,
    C: achromatic ? 0 : Math.sqrt(a * a + b * b),
    h: achromatic ? undefined : mod360((Math.atan2(b, a) * 180) / Math.PI)
  };
}

/** LCH → 线性 sRGB，**不夹取**：出界值原样带出来，交给色域收色判断 */
function toLinear(lch: Lch): [number, number, number] {
  const radians = ((Number.isFinite(lch.h) ? lch.h : 0) as number) * Math.PI / 180;
  const a = Math.cos(radians) * lch.C;
  const b = Math.sin(radians) * lch.C;
  const fy = (lch.L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const inverse = (t: number): number => (t * t * t > 216 / 24389 ? t * t * t : ((116 * t - 16) * 27) / 24389);
  const xyz = mul(M_D50_D65, [inverse(fx) * D50.x, inverse(fy) * D50.y, inverse(fz) * D50.z]);
  return mul(M_XYZ_RGB, xyz);
}

const inGamut = (linear: readonly number[]): boolean =>
  linear.every((value) => value >= -1e-7 && value <= 1 + 1e-7);

/** 线性 sRGB → OKLab（§13.2 用 OKLab 的欧氏距离判「差多少才可辨」） */
function toOklab(linear: readonly number[]): { L: number; a: number; b: number } {
  const lms = mul(M_OK, linear).map((value) => Math.cbrt(value));
  const [L, a, b] = mul(M_OK_INV, lms);
  return { L: L as number, a: a as number, b: b as number };
}

/** OKLab 的色差值；§13.2 用它判「这次裁剪是否已经肉眼无差」 */
function deltaEOk(first: readonly number[], second: readonly number[]): number {
  const a = toOklab(first);
  const b = toOklab(second);
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b);
}

/**
 * CSS Color 4 §13.2 色域映射：在 OKLCH 里二分降浓度，允许在 JND 内做局部裁剪。
 *
 * 输入输出都是**线性 sRGB**；出入参都不夹取以外的加工 —— 这个函数是唯一的收色判据，
 * 别在调用点再夹一次（那就成了两套判据）。
 */
function gamutMap(linear: readonly number[]): [number, number, number] {
  if (inGamut(linear)) return [clamp01(linear[0] as number), clamp01(linear[1] as number), clamp01(linear[2] as number)];

  const lab = toOklab(linear);
  const chroma0 = Math.hypot(lab.a, lab.b);
  const hue = Math.atan2(lab.b, lab.a);
  const at = (chroma: number): [number, number, number] => {
    const a = Math.cos(hue) * chroma;
    const b = Math.sin(hue) * chroma;
    const l = lab.L + 0.3963377774 * a + 0.2158037573 * b;
    const m = lab.L - 0.1055613458 * a - 0.0638541728 * b;
    const s = lab.L - 0.0894841775 * a - 1.291485548 * b;
    const l3 = l * l * l;
    const m3 = m * m * m;
    const s3 = s * s * s;
    return [
      4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
      -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
      -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3
    ];
  };

  let min = 0;
  let max = chroma0;
  let minInGamut = true;
  let clipped: [number, number, number] = [clamp01(linear[0] as number), clamp01(linear[1] as number), clamp01(linear[2] as number)];

  while (max - min > GAMUT_EPSILON) {
    const chroma = (min + max) / 2;
    const current = at(chroma);
    if (minInGamut && inGamut(current)) {
      min = chroma;
      continue;
    }
    clipped = [clamp01(current[0]), clamp01(current[1]), clamp01(current[2])];
    const difference = deltaEOk(clipped, current);
    if (difference < JND) {
      if (JND - difference < GAMUT_EPSILON) return clipped;
      minInGamut = false;
      min = chroma;
    } else {
      max = chroma;
    }
  }
  return clipped;
}

const toByte = (value: number): number => Math.round(clamp01(value) * 255 + 1e-9);
const toHex = (nonLinear: readonly number[]): string =>
  `#${nonLinear.map((value) => toByte(value).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/**
 * `#RRGGBB` → LCH(D50) 坐标，**给色环定位用**（把 01 / 02 画在环上、算环的量程）。
 *
 * 与插值内部用的 `toLch` 的差别只有一处：中性色在这里给 `h = 0`，因为画点需要一个数字；
 * 插值侧必须知道「没有色相」这件事，所以那边保留 `undefined`。**别把它当插值输入**。
 */
export function lchOf(hex: string): { l: number; c: number; h: number } {
  const lch = toLch(rgbOf(hex));
  return { l: lch.L, c: lch.C, h: lch.h ?? 0 };
}

/**
 * 配对角：保持亮度与浓度，色相转 **150°**。
 *
 * 用途只有一个：渐变面板拿不到「PS 背景色」（vendor 没有读背景色的函数），
 * 结束色初值由起始色推出来。这条产品决定放在这里而不是页面里 ——
 * 页面里写 `lchToHex(lchOf(x).l, ..., h + 150)` 等于把「初值怎么来的」散在 UI 代码中。
 *
 * **为什么是 150° 而不是 180°**：正好对立时短路线与长路线都走 180°，两条路一模一样，
 * 用户一进页面点「长路线」看不出任何变化，会以为功能没生效。150° 既保留强对比，
 * 又让两条路一定分得开（`gradient.test.ts` 钉着这一条）。
 */
export function partnerOf(hex: string): string {
  const { l, c, h } = lchOf(hex);
  return lchToHex(l, c, mod360(h + 150));
}

/**
 * LCH → `#RRGGBB`，出界颜色走 §13.2 收色。
 *
 * 色环画底色与拖动取色都用它，所以环上看到的颜色和烘焙进 PS 的色标是同一套换算。
 * `l` 是 L\*（0–100），`c` 是浓度，`h` 是色相角（度）。
 */
export function lchToHex(l: number, c: number, h: number): string {
  const linear = toLinear({ L: l, C: Math.max(0, c), h });
  return toHex(gamutMap(linear).map((value) => encode(value)));
}

/**
 * 色相路径：返回 `[起点色相, 增量]`，增量带符号，插值时 `h = 起点 + 增量 × t`。
 *
 * 三条判据都来自站点引擎，改之前先看 `docs/参考/gradient-lab/color-core.js` 的 `huePath`：
 * 中性端点借用另一端的色相（增量为 0）；正对立时按端点先后定方向，保证「反过来染」得到镜像结果。
 */
function huePath(first: number | undefined, second: number | undefined, route: Exclude<GradientRoute, 'direct'>): [number, number] {
  const missingFirst = !Number.isFinite(first);
  const missingSecond = !Number.isFinite(second);
  const start = missingFirst ? (missingSecond ? 0 : (second as number)) : (first as number);
  const end = missingSecond ? start : (second as number);
  if (missingFirst || missingSecond) return [start, 0];

  let delta = mod360(end - start);
  if (delta > 180 || (delta === 180 && end - start < 0)) delta -= 360;
  if (route === 'long') delta = delta > 0 ? delta - 360 : delta + 360;
  return [start, delta];
}

/**
 * 沿过渡方式取 N 个色标（含两端），返回 `#RRGGBB` 数组。
 *
 * `count` 下限保 2（两端就是一条直线，再少没有意义）；上限交给页面（`4..32`），
 * 本函数不设上限，因为「多密才算够」是界面决定的事。
 *
 * `direct` 在 sRGB 里直插（就是 PS 自己会做的事，用来做对照项）；
 * `short` / `long` 在 LCH(D50) 里插亮度、浓度与色相。
 */
export function sampleStops(from: string, to: string, route: GradientRoute, count: number): string[] {
  if (!Number.isFinite(count)) throw new TypeError(`色标数量必须是数字：${count}`);
  const total = Math.max(2, Math.round(count));
  const startRgb = rgbOf(from);
  const endRgb = rgbOf(to);

  if (route === 'direct') {
    return Array.from({ length: total }, (_, index) => {
      const t = index / (total - 1);
      return toHex([0, 1, 2].map((channel) => ((startRgb[channel] as number) + ((endRgb[channel] as number) - (startRgb[channel] as number)) * t) / 255));
    });
  }

  const first = toLch(startRgb);
  const second = toLch(endRgb);
  const [hueStart, hueDelta] = huePath(first.h, second.h, route);
  const hasHue = Number.isFinite(first.h) || Number.isFinite(second.h);

  return Array.from({ length: total }, (_, index) => {
    const t = index / (total - 1);
    const lch: Lch = {
      L: first.L + (second.L - first.L) * t,
      C: Math.max(0, first.C + (second.C - first.C) * t),
      h: hasHue ? mod360(hueStart + hueDelta * t) : undefined
    };
    return toHex(gamutMap(toLinear(lch)).map((value) => encode(value)));
  });
}
