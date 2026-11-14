/**
 * 木东东东 · 渐变实验室 — deterministic, local-only colour engine.
 * Conversion: Culori 4.0.2 (MIT), vendored in ./vendor/.
 * LCH / LCHuv use D50; OKLCH / OKHSL / OKHSV use D65.
 * Out-of-gamut display colours use Culori's OKLCH local-MINDE mapping. The
 * chosen space/hue route still defines interpolation, while display mapping
 * permits imperceptible hue/lightness differences to avoid excessive CIE LCH
 * chroma loss near bright yellow/cyan. Exact user stops are preserved.
 */
import { converter, toGamut } from './vendor/culori-4.0.2.min.mjs';

export const SPACES = Object.freeze([
  { id: 'lch', label: 'LCH · 经典色相过渡', description: '按亮度、颜色浓度和色相过渡，适合先试。使用 D50 白点。', available: true },
  { id: 'oklch', label: 'OKLCH · 视觉更均匀', description: '让颜色变化更接近眼睛的感觉。使用 D65 白点。', available: true },
  { id: 'hsv', label: 'HSB / HSV · 按色相与明暗', description: '和常见取色器的 HSB 一样，分别调整色相、饱和度和明暗。', available: true },
  { id: 'hsl', label: 'HSL · 按色相与亮度', description: '沿色相变化，同时过渡饱和度和亮度。', available: true },
  { id: 'lchuv', label: 'LCHuv · 另一种色相过渡', description: '使用 CIELUV 的亮度、颜色浓度和色相。使用 D50 白点。', available: true },
  { id: 'okhsv', label: 'OKHSV · 视觉均匀的 HSB', description: '基于 OKLab 的取色模型，改善普通 HSV 的视觉不均匀。', available: true },
  { id: 'okhsl', label: 'OKHSL · 视觉均匀的 HSL', description: '基于 OKLab 的取色模型，改善普通 HSL 的视觉不均匀。', available: true },
  { id: 'srgb', label: 'sRGB · 直接过渡', description: '直接过渡红、绿、蓝三个数值，用来比较颜色路径的差异。', available: true },
  { id: 'jch', label: 'JCh · 暂未提供', description: '参考工具使用的 JCh 尚未核实实现，当前不提供，避免混用其他模型。', available: false }
]);

const CONVERTERS = Object.fromEntries(['rgb', 'lrgb', 'lch', 'oklch', 'hsl', 'hsv', 'lchuv', 'okhsv', 'okhsl'].map(mode => [mode, converter(mode)]));
const DISPLAY_GAMUT = toGamut('rgb', 'oklch');
const CHANNELS = {
  lch: ['l', 'c'], oklch: ['l', 'c'], lchuv: ['l', 'c'],
  hsv: ['s', 'v'], hsl: ['s', 'l'], okhsv: ['s', 'v'], okhsl: ['s', 'l']
};
const clamp01 = value => Math.max(0, Math.min(1, value));
const mod360 = value => ((value % 360) + 360) % 360;
const lerp = (a, b, t) => a + (b - a) * t;
// Avoid e.g. 196.49999999999997 from a mathematically exact 196.5 midpoint.
const byte = value => Math.round(clamp01(value) * 255 + 1e-9);
const decodeSrgb = value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
const encodeSrgb = value => value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
const linearY = rgb => 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
// CIE L* referred to D65 white (Y=1). A straight L* ramp is perceptually
// smoother than a straight encoded-RGB or physical-luminance ramp.
const lightnessFromY = y => y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : y * (24389 / 27);
const yFromLightness = l => l > 8 ? ((l + 16) / 116) ** 3 : l * (27 / 24389);

/** Accept a 3- or 6-digit HEX code, with or without #. Alpha is not supported. */
export function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  let text = value.trim().replace(/^#/, '');
  if (/^[\da-f]{3}$/i.test(text)) text = [...text].map(c => c + c).join('');
  return /^[\da-f]{6}$/i.test(text) ? `#${text.toUpperCase()}` : null;
}

/** Return integer sRGB channels. Throw on invalid input instead of hiding it. */
export function toRgb(value) {
  const hex = normalizeHex(value);
  if (!hex) throw new TypeError('请输入有效的 3 位或 6 位 HEX 颜色。');
  return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
}

export function rgbToHex(channels) {
  if (!Array.isArray(channels) || channels.length < 3 || !channels.slice(0, 3).every(Number.isFinite)) {
    throw new TypeError('RGB 必须包含三个有效数字。');
  }
  return '#' + channels.slice(0, 3).map(value => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Linear-light sRGB relative Y (0..1), using the WCAG D65 coefficients.
 * Accepts HEX, or RGB arrays in the same 0..255 convention as toRgb().
 */
export function relativeLuminance(hexOrRgb) {
  const rgb = typeof hexOrRgb === 'string' ? toRgb(hexOrRgb) : hexOrRgb;
  if (!Array.isArray(rgb) || rgb.length < 3 || !rgb.slice(0, 3).every(value => Number.isFinite(value) && value >= 0 && value <= 255)) {
    throw new TypeError('亮度计算需要 HEX 颜色或三个 0 到 255 的 RGB 数值。');
  }
  return linearY({ r: decodeSrgb(rgb[0] / 255), g: decodeSrgb(rgb[1] / 255), b: decodeSrgb(rgb[2] / 255) });
}

/** A real luminance-preserving grayscale conversion, not a CSS filter. */
export function grayscaleHex(hexOrRgb) {
  const gray = byte(encodeSrgb(relativeLuminance(hexOrRgb)));
  return rgbToHex([gray, gray, gray]);
}

function normalizeOptions(options = {}) {
  const space = options.space === 'hsb' ? 'hsv' : (options.space || 'lch');
  if (!SPACES.some(item => item.id === space && item.available)) throw new RangeError(`尚不支持颜色算法：${space}`);
  const route = options.route || 'short';
  if (!['short', 'long', 'increasing', 'decreasing'].includes(route)) throw new RangeError(`未知颜色路线：${route}`);
  const easing = options.easing || 'none';
  if (!['none', 'cubic', 'smooth', 'smoothstep'].includes(easing)) throw new RangeError(`未知过渡节奏：${easing}`);
  return { space, route, easing, uniformLightness: options.uniformLightness === true };
}

function normalizeStops(stops) {
  if (!Array.isArray(stops) || !stops.length) throw new TypeError('渐变至少需要一个颜色。');
  const normalized = stops.map((stop, index) => {
    const color = normalizeHex(stop.color);
    if (!color || !Number.isFinite(stop.pos) || stop.pos < 0 || stop.pos > 1) {
      throw new TypeError(`第 ${index + 1} 个色标的颜色或位置无效。`);
    }
    return { pos: stop.pos, color, rgb: toRgb(color) };
  }).sort((a, b) => a.pos - b.pos);
  if (normalized[0].pos > 0) normalized.unshift({ ...normalized[0], pos: 0 });
  if (normalized.at(-1).pos < 1) normalized.push({ ...normalized.at(-1), pos: 1 });
  return normalized;
}

function convertStop(stop, space) {
  if (space === 'srgb') return { mode: 'rgb', r: stop.rgb[0] / 255, g: stop.rgb[1] / 255, b: stop.rgb[2] / 255 };
  const converted = CONVERTERS[space](stop.color);
  // An exactly neutral user colour has no meaningful hue. Round-off in Lab,
  // OKLab and XYZ conversions must never turn gray into a full colour wheel.
  if (stop.rgb[0] === stop.rgb[1] && stop.rgb[1] === stop.rgb[2]) {
    converted.h = undefined;
    if ('c' in converted) converted.c = 0;
    if ('s' in converted) converted.s = 0;
  }
  return converted;
}

/** Signed angular distance; achromatic endpoints borrow the other hue. */
function huePath(first, second, route) {
  const missingFirst = !Number.isFinite(first);
  const missingSecond = !Number.isFinite(second);
  const start = missingFirst ? (missingSecond ? 0 : second) : first;
  const end = missingSecond ? start : second;
  if (missingFirst || missingSecond) return [start, 0];
  let delta = mod360(end - start);
  if (route === 'increasing') return [start, delta];
  if (route === 'decreasing') return [start, delta === 0 ? 0 : delta - 360];
  // Keep exactly opposite colours deterministic; reverse endpoints reverse path.
  if (delta > 180 || (delta === 180 && end - start < 0)) delta -= 360;
  if (route === 'long') delta = delta > 0 ? delta - 360 : delta + 360;
  return [start, delta];
}

function isInGamut(rgb) {
  return rgb && ['r', 'g', 'b'].every(key => Number.isFinite(rgb[key]) && rgb[key] >= -1e-7 && rgb[key] <= 1 + 1e-7);
}

/**
 * One display mapping for gradient samples and interactive colour-wheel picks.
 * Culori's local-MINDE implementation uses OKLCH only for gamut mapping; it
 * does not change the interpolation model or its short/long hue direction.
 * An optional targetY preserves the lightness ramp after display mapping.
 */
export function gamutMapSrgb(color, { targetY } = {}) {
  const raw = CONVERTERS.rgb(color);
  if (!raw || !['r', 'g', 'b'].every(key => Number.isFinite(raw[key]))) throw new RangeError('颜色计算产生了无效结果。');
  const mapped = !isInGamut(raw);
  let rgb = mapped ? DISPLAY_GAMUT(color) : raw;
  if (!rgb || !['r', 'g', 'b'].every(key => Number.isFinite(rgb[key]))) throw new RangeError('颜色无法映射到显示色域。');
  // Local-MINDE deliberately includes a tiny local clip. Clamp residual float
  // round-off too; broad, independent RGB clipping is not the mapping policy.
  rgb = { mode: 'rgb', r: clamp01(rgb.r), g: clamp01(rgb.g), b: clamp01(rgb.b) };
  if (targetY !== undefined) {
    if (!Number.isFinite(targetY) || targetY < 0 || targetY > 1) throw new RangeError('目标相对亮度须在 0 到 1 之间。');
    const linear = { r: decodeSrgb(rgb.r), g: decodeSrgb(rgb.g), b: decodeSrgb(rgb.b) };
    const y = linearY(linear);
    // A neutral mixture stays inside the RGB cube and preserves exact target Y.
    // It avoids adding a brightness bump after a perceptual gamut correction.
    for (const key of ['r', 'g', 'b']) {
      const value = targetY <= y
        ? (y > 0 ? linear[key] * targetY / y : 0)
        : (y < 1 ? 1 - (1 - linear[key]) * (1 - targetY) / (1 - y) : 1);
      rgb[key] = encodeSrgb(clamp01(value));
    }
  }
  return { ...rgb, mapped };
}

function displaySample(color, t) {
  const rgb = gamutMapSrgb(color);
  const channels = [byte(rgb.r), byte(rgb.g), byte(rgb.b)];
  return { t, hex: rgbToHex(channels), rgb: channels, clipped: rgb.mapped, gamutMapped: rgb.mapped };
}

/**
 * Keep the interpolation hue fixed while solving its lightness channel for
 * D65 Y. Only the final display map may make local-MINDE hue corrections.
 * Display mapping is followed by a target-Y correction, so it cannot add a
 * brightness dip. sRGB uses its current sample's OKLCH hue for this option.
 */
function uniformLightnessSample(color, t, targetY) {
  const mode = color.mode === 'rgb' ? 'oklch' : color.mode;
  const base = color.mode === 'rgb' ? CONVERTERS.oklch(color) : color;
  const chromaKey = ['lch', 'lchuv', 'oklch'].includes(mode) ? 'c' : 's';
  const lightKey = ['hsv', 'okhsv'].includes(mode) ? 'v' : 'l';
  const maxLightness = ['lch', 'lchuv'].includes(mode) ? 100 : 1;
  const originalChroma = Math.max(0, base[chromaKey] || 0);

  let bestColor = null;
  let reduced = false;
  const solve = chroma => {
    const candidate = { ...base, [chromaKey]: chroma };
    let low = 0;
    let high = maxLightness;
    candidate[lightKey] = low;
    const lowY = linearY(CONVERTERS.lrgb(candidate));
    candidate[lightKey] = high;
    const highY = linearY(CONVERTERS.lrgb(candidate));
    // HSV's maximum value at a saturated hue may be too dark for this target.
    // Reject it, reduce saturation and solve again rather than clipping to V=1.
    if (targetY < lowY - 1e-8 || targetY > highY + 1e-8) return null;
    let linear;
    for (let index = 0; index < 18; index++) {
      candidate[lightKey] = (low + high) / 2;
      linear = CONVERTERS.lrgb(candidate);
      if (linearY(linear) < targetY) low = candidate[lightKey];
      else high = candidate[lightKey];
    }
    candidate[lightKey] = (low + high) / 2;
    linear = CONVERTERS.lrgb(candidate);
    return candidate;
  };

  // All exact grays should stay gray, including the black/white endpoints.
  if (originalChroma > 1e-10 && targetY > 0 && targetY < 1) {
    const full = solve(originalChroma);
    if (full) bestColor = full;
    else {
      // Some HSV colours cannot reach the target Y even at V=1. Reduce only
      // enough saturation to make the brightness target attainable.
      reduced = true;
      let low = 0;
      let high = originalChroma;
      for (let index = 0; index < 14; index++) {
        const mid = (low + high) / 2;
        const candidate = solve(mid);
        if (candidate) {
          low = mid;
          bestColor = candidate;
        } else high = mid;
      }
    }
  }
  const gray = encodeSrgb(targetY);
  const displayed = gamutMapSrgb(bestColor || { mode: 'rgb', r: gray, g: gray, b: gray }, { targetY });
  const rgb = [byte(displayed.r), byte(displayed.g), byte(displayed.b)];
  const mapped = displayed.mapped || reduced;
  return { t, hex: rgbToHex(rgb), rgb, clipped: mapped, gamutMapped: mapped, uniformLightness: true };
}

function exactSample(stop, t) {
  return { t, hex: stop.color, rgb: [...stop.rgb], clipped: false, gamutMapped: false };
}

/** Compile once when sampling many pixels. Returned function accepts t in [0,1]. */
export function createSampler(stops, options = {}) {
  const normalized = normalizeStops(stops);
  const settings = normalizeOptions(options);
  const colors = normalized.map(stop => convertStop(stop, settings.space));
  const segments = normalized.slice(0, -1).map((stop, index) => ({
    first: stop, second: normalized[index + 1],
    a: colors[index], b: colors[index + 1],
    hue: huePath(colors[index].h, colors[index + 1].h, settings.route),
    lightnessA: settings.uniformLightness ? lightnessFromY(relativeLuminance(stop.rgb)) : 0,
    lightnessB: settings.uniformLightness ? lightnessFromY(relativeLuminance(normalized[index + 1].rgb)) : 0
  }));
  return value => {
    if (!Number.isFinite(value)) throw new TypeError('采样位置必须是有效数字。');
    const t = clamp01(value);
    // Choose the last colour at a repeated position: an intentional hard stop.
    let left = 0;
    for (let index = 1; index < normalized.length && normalized[index].pos <= t; index++) left = index;
    if (normalized[left].pos === t || left === normalized.length - 1) return exactSample(normalized[left], t);
    const segment = segments[left];
    if (segment.first.color === segment.second.color) return exactSample(segment.first, t);
    let local = (t - segment.first.pos) / (segment.second.pos - segment.first.pos);
    if (settings.easing !== 'none') local = local * local * (3 - 2 * local);
    const result = { mode: settings.space === 'srgb' ? 'rgb' : settings.space };
    if (settings.space === 'srgb') {
      for (const key of ['r', 'g', 'b']) result[key] = lerp(segment.a[key], segment.b[key], local);
    } else {
      for (const key of CHANNELS[settings.space]) result[key] = lerp(segment.a[key] ?? 0, segment.b[key] ?? 0, local);
      result.h = mod360(segment.hue[0] + segment.hue[1] * local);
    }
    return settings.uniformLightness
      ? uniformLightnessSample(result, t, yFromLightness(lerp(segment.lightnessA, segment.lightnessB, local)))
      : displaySample(result, t, settings.space);
  };
}

export function sampleAt(stops, options = {}, t = 0) {
  return createSampler(stops, options)(t);
}

export function sampleGradient(stops, options = {}, count = 257) {
  if (!Number.isInteger(count) || count < 2 || count > 16385) throw new RangeError('采样数量必须是 2 到 16385 之间的整数。');
  const sample = createSampler(stops, options);
  return Array.from({ length: count }, (_, index) => sample(index / (count - 1)));
}

/** Useful for an educational route diagram; values are not display RGB. */
export function colorCoordinates(hex, space = 'lch') {
  const normalized = normalizeHex(hex);
  if (!normalized) throw new TypeError('请输入有效的 HEX 颜色。');
  normalizeOptions({ space });
  return { ...convertStop({ color: normalized, rgb: toRgb(normalized) }, space) };
}
