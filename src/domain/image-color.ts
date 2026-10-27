// 是什么：图片取色 + 颜色量化的纯算法（原版 `nS` 整条链的可读移植：计数 → 分箱 → 容差合并 → 截断 → 百分比）
// 替代了什么：原版 app.v4.js:54498 `nS` 把「建 canvas、画图、取像素、量化、算百分比」耦成一坨挂在 Style 页 methods 上；
//             这里拆成「纯算法（本文件主体）」+「可注入的 canvas 缝（readPixelsFromImage）」
// 谁在用：`/style` 页图片取色（原版 `getImgHex`，app.v4.js:54682-54693 → `nS(t, 350, 10, cb)`）
// 关于 throw：本文件的 `throw new Error(...)` 全是**开发者断言**（注入缺失 / 尺寸非法），
//   读者是写代码的人，不上 UI —— 不是失败表达，别改成 `DecodeFail`。
// 禁止：本文件不碰 document / window / new Image；像素来源必须由调用方注入，
//       因为 jsdom 没有真实 canvas 像素能力（见文件末「jsdom 边界」）

/** 原版 `nS` 的默认目标宽度（app.v4.js:54498 `e = 350`；`e <= 1` 时按比例缩放） */
export const DEFAULT_TARGET_WIDTH = 350

/** 原版 `getImgHex` 固定取 10 色（app.v4.js:54684 `var n = 10`） */
export const DEFAULT_COLOR_COUNT = 10

/** 原版占比下限：四舍五入后不足 8% 的一律抬到 8（app.v4.js:54550-54552） */
export const MIN_COLOR_PERCENT = 8

/** 原版 `eS` 的常见/稀有分界：像素数 ≤ 50 进稀有组（app.v4.js:54462 `e = 50`） */
const RARE_PIXEL_THRESHOLD = 50

/** 原版 `Y_(c, 50)`：常见组的合并容差（app.v4.js:54482） */
const COMMON_MERGE_TOLERANCE = 50

/** 原版 `Y_(o, 100)`：稀有组的合并容差（app.v4.js:54483） */
const RARE_MERGE_TOLERANCE = 100

/** 整幅像素。结构上真实的 `ImageData` 直接满足它（只用到 data，宽高给上层缩放用） */
export interface RgbaImage {
  data: Uint8ClampedArray
  width: number
  height: number
}

export interface ImageColor {
  /** `#rrggbb` 小写。透明像素（alpha=0）在原版 `Z_` 里被写成 `#ffffff`，照抄不"修" */
  hex: string
  /**
   * `quantizeColors` 返回占比小数（0..1，合计 1，同原版 eS:54490-54495）；
   * `extractPalette` / `extractImageColors` 返回整数百分比（同原版 nS:54549）。
   */
  num: number
}

/** 原版 `nS` 里 `drawImage` 的目标：只要 width/height。真实的 `HTMLImageElement` 结构上满足它 */
export interface SizedImage {
  width: number
  height: number
}

/** 注入的 2D 上下文：只声明本模块真正调用的三个方法，不引 DOM 的 `CanvasRenderingContext2D` 全量类型 */
export interface CanvasContext2DLike {
  clearRect(x: number, y: number, w: number, h: number): void
  drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void
  getImageData(sx: number, sy: number, sw: number, sh: number): RgbaImage
}

export interface CanvasLike {
  width: number
  height: number
  getContext(contextId: '2d'): CanvasContext2DLike | null
}

/** 由调用方（宿主层）提供：造一个已按目标尺寸设好宽高的 canvas */
export type CanvasFactory = (width: number, height: number) => CanvasLike

export type ImageColorSource =
  | { kind: 'pixels'; pixels: RgbaImage }
  | { kind: 'image'; image: SizedImage }
  | { kind: 'dataUrl'; dataUrl: string }

export interface ExtractImageColorsOptions {
  targetWidth?: number
  /** 不传 = 不截断（原版 `h.length > n` 对 undefined 恒 false，app.v4.js:54532） */
  count?: number
  createCanvas?: CanvasFactory
  /** dataUrl 源的解码器；真机上就是 `new Image()` + onload，这里由宿主注入 */
  decode?: (dataUrl: string) => Promise<SizedImage> | SizedImage
}

function pixelKey(data: Uint8ClampedArray, offset: number): string {
  return `${data[offset]},${data[offset + 1]},${data[offset + 2]},${data[offset + 3]}`
}

/**
 * 原版 eS:54440-54457 的计数。原版用一个 `filter` 当循环用的 `s()` 辅助函数，行为等价于这里的 Map 计数；
 * Map 的插入序 = 像素首次出现顺序，后面的分箱顺序依赖它。
 *
 * 与原版的差异：循环上界取 `floor(len/4)*4`。真实 `getImageData` 的 data 长度必为 4 的倍数，
 * 这一句只是让"长度不齐"的输入把余下字节忽略掉，而不是拼出 `1,2,3,` 这种残缺键。
 */
function countPixels(data: Uint8ClampedArray): Map<string, number> {
  const counts = new Map<string, number>()
  const pixelCount = Math.floor(data.length / 4)
  for (let i = 0; i < pixelCount; i++) {
    const key = pixelKey(data, i * 4)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/** 原版 `Z_`（app.v4.js:54412-54426）。alpha 为 0 → 白；否则三通道转 hex 补零 */
function toHex(r: number, g: number, b: number, alpha: number): string {
  if (alpha === 0) return '#ffffff'
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`
}

/**
 * 原版 `tS`（app.v4.js:54427-54437）：三通道差都在容忍度内算"相近"。
 *
 * 原版 `if (a > 255) a -= 256` 是个怪分支：容忍度 >255 时阈值变负，于是任何颜色都不相近。
 * 本文件用到的容忍度只有 50/100，永不触发；逐字保留只为对齐，不为它写分支。
 */
function channelTolerance(tolerance: number): number {
  const abs = Math.abs(tolerance)
  return abs > 255 ? abs - 256 : abs
}

function isSimilarHex(a: string, b: string, tolerance: number): boolean {
  const limit = channelTolerance(tolerance)
  const ar = parseInt(a.slice(1, 3), 16)
  const ag = parseInt(a.slice(3, 5), 16)
  const ab = parseInt(a.slice(5, 7), 16)
  const br = parseInt(b.slice(1, 3), 16)
  const bg = parseInt(b.slice(3, 5), 16)
  const bb = parseInt(b.slice(5, 7), 16)
  return Math.abs(ar - br) <= limit && Math.abs(ag - bg) <= limit && Math.abs(ab - bb) <= limit
}

/**
 * 原版 `Q_`（app.v4.js:54392-54410）的可读移植：贪心聚类。
 * 每轮取剩余列表第一个当种子并收入结果，吸收所有与它相近的颜色（num 累加到种子上）、移出剩余列表；
 * 剩余为空即结束（原版用固定轮数上界 + `break`，每轮必移除种子，两者等价）。
 *
 * 原版 `a.indexOf(n[0]) != -1` 的自增分支不可达：种子在上一轮已被移出工作列表，工作列表只减不增，
 * 同一个对象不会再次当种子 —— 所以这里不复制那个分支。
 */
function mergeSimilar(colors: ImageColor[], tolerance: number): ImageColor[] {
  const merged: ImageColor[] = []
  let remaining = colors.slice()
  while (remaining.length > 0) {
    const seed = remaining[0]
    if (!seed) break
    merged.push(seed)
    const kept: ImageColor[] = []
    for (const color of remaining.slice(1)) {
      if (isSimilarHex(seed.hex, color.hex, tolerance)) seed.num += color.num
      else kept.push(color)
    }
    remaining = kept
  }
  return merged
}

/**
 * 原版 `Y_`（app.v4.js:54375-54390）：按像素数降序排 → 转成 `{hex, num}` → 按容差合并。
 *
 * ES2019 起 `Array#sort` 要求稳定，所以并列像素数保持 Map 的首次出现顺序 —— 这条是"原版顺序"可复现的前提。
 */
function groupBySimilarity(pairs: Array<[string, number]>, tolerance: number): ImageColor[] {
  const sorted = pairs.slice().sort((a, b) => b[1] - a[1])
  const colors = sorted.map(([key, num]) => {
    const [r = 0, g = 0, b = 0, a = 0] = key.split(',').map(Number)
    return { hex: toHex(r, g, b, a), num }
  })
  return mergeSimilar(colors, tolerance)
}

/**
 * 原版 `eS`（app.v4.js:54439-54496）的量化主体：整幅像素 → `[{hex, num}]`，num 为占比小数（合计 1）。
 *
 * 顺序 = 常见组（合并后）接稀有组（合并后）再全量合并一次的结果序。
 * 注意原版 `nS` 调用处写的 `eS(u, 50)`（:54528）第二个参数被 `eS` 忽略，稀有分界恒为 50，不是调用方可配的。
 */
export function quantizeColors(image: RgbaImage): ImageColor[] {
  const counts = countPixels(image.data)
  const common: Array<[string, number]> = []
  const rare: Array<[string, number]> = []
  for (const [key, num] of counts) {
    if (num <= RARE_PIXEL_THRESHOLD) rare.push([key, num])
    else common.push([key, num])
  }
  const merged = [
    ...groupBySimilarity(common, COMMON_MERGE_TOLERANCE),
    ...groupBySimilarity(rare, RARE_MERGE_TOLERANCE),
  ]
  const total = merged.reduce((sum, color) => sum + color.num, 0)
  return merged.map((color) => ({ hex: color.hex, num: color.num / total }))
}

/**
 * 原版 `nS` 量化之后的那半段（app.v4.js:54532-54557）：
 * 截断到 count → 按截断后的合计归一成整数百分比 → 不足 8% 抬到 8% → 按 num 降序。
 *
 * 百分比是在**截断后**的列表上算的，所以合计可以不是 100（原版同样如此，照抄）。
 *
 * 与原版的差异：原版排序比较器 `function (t, e) { return t.num < e.num }` 只返回布尔值，
 * 不是合法比较器（对 a≠b 会同时给出 1 和 1），不同引擎对这类比较器的结果不保证一致；
 * 这里写成 `b.num - a.num`（降序 + 稳定）。语义意图一致，但**未与真机输出逐条比对**。
 */
export function extractPalette(image: RgbaImage, options: { count?: number } = {}): ImageColor[] {
  const { count } = options
  const colors = quantizeColors(image)
  const kept = count === undefined || colors.length <= count ? colors : colors.slice(0, count)
  const total = kept.reduce((sum, color) => sum + color.num, 0)
  const palette = kept.map((color) => ({
    hex: color.hex,
    num: Math.max(MIN_COLOR_PERCENT, Math.round((color.num / total) * 100)),
  }))
  return palette.sort((a, b) => b.num - a.num)
}

/**
 * 原版 `nS:54510-54520` 的目标尺寸数学（纯函数，不画图）：
 * `targetWidth <= 1` 按比例缩放，否则定宽（高度按原比例换算），最后各自取整。
 *
 * 与原版的差异：原版不校验输入，源图宽为 0 时会算出 `Infinity` 高度、再拿 0×0 去 getImageData。
 * 这里对非正的源图尺寸 / 非正的目标宽度直接抛错 —— 不静默产出坏尺寸。
 */
export function resolveTargetSize(
  width: number,
  height: number,
  targetWidth: number = DEFAULT_TARGET_WIDTH,
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0) || !(targetWidth > 0)) {
    throw new Error(`resolveTargetSize: 尺寸非法（源 ${width}x${height}，目标宽 ${targetWidth}）`)
  }
  if (targetWidth <= 1) {
    return { width: Math.round(width * targetWidth), height: Math.round(height * targetWidth) }
  }
  return { width: Math.round(targetWidth), height: Math.round(height / (width / targetWidth)) }
}

/**
 * canvas 缝：把已解码的图画到注入的 canvas 上取回像素。对应原版 `nS:54498-54525`。
 *
 * 原版把 canvas 挂到 `document.body` 再移除（:54499-54500 / :54573），取像素并不需要挂载，
 * 这里不复制该副作用，由注入方决定。原版 :54526 的 `i.toDataURL("image/jpeg", 0.6)` 返回值被丢弃、
 * 无观测效果，未移植。
 */
export function readPixelsFromImage(
  image: SizedImage,
  createCanvas: CanvasFactory,
  targetWidth: number = DEFAULT_TARGET_WIDTH,
): RgbaImage {
  const size = resolveTargetSize(image.width, image.height, targetWidth)
  const canvas = createCanvas(size.width, size.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('readPixelsFromImage: 拿不到 2d 上下文（jsdom 未装 canvas 包时即为 null）')
  }
  ctx.clearRect(0, 0, size.width, size.height)
  ctx.drawImage(image, 0, 0, size.width, size.height)
  return ctx.getImageData(0, 0, size.width, size.height)
}

/**
 * 顶层入口：三种图片来源 → 颜色列表。
 *
 * - `pixels`：纯路径，单测全走这条，不碰任何 DOM；
 * - `image`：需要注入 `createCanvas`（`readPixelsFromImage`）；
 * - `dataUrl`：需要注入 `decode` + `createCanvas`。
 *
 * 缺注入就抛错，不做静默回退（回退会产出假色板，比报错更难查）。
 */
export async function extractImageColors(
  source: ImageColorSource,
  options: ExtractImageColorsOptions = {},
): Promise<ImageColor[]> {
  const { targetWidth = DEFAULT_TARGET_WIDTH, count, createCanvas, decode } = options
  if (source.kind === 'pixels') return extractPalette(source.pixels, { count })
  if (source.kind === 'image') {
    if (!createCanvas) throw new Error('extractImageColors: image 源需要注入 createCanvas')
    return extractPalette(readPixelsFromImage(source.image, createCanvas, targetWidth), { count })
  }
  if (!decode) throw new Error('extractImageColors: dataUrl 源需要注入 decode')
  if (!createCanvas) throw new Error('extractImageColors: dataUrl 源需要注入 createCanvas')
  const image = await decode(source.dataUrl)
  return extractPalette(readPixelsFromImage(image, createCanvas, targetWidth), { count })
}

/**
 * ── jsdom 边界（实测，vitest 5 + jsdom 30，`environment: 'jsdom'`）──
 *
 * 实测输出（探针已删，结论留档）：
 * - `document.createElement('canvas').getContext('2d')` → **返回 null**，
 *   同时 jsdom 往 console 打 `Not implemented: HTMLCanvasElement's getContext() method:
 *   without installing the canvas npm package`；
 * - `getImageData` 因此不可用（ctx 为 null，调用即 TypeError）；
 * - `typeof OffscreenCanvas === 'undefined'`、`typeof createImageBitmap === 'undefined'`；
 * - `new Image()` + `img.src = dataURL`：**既不触发 onload 也不触发 onerror**，
 *   `complete` 恒 false、`naturalWidth` 恒 0 —— jsdom 完全不解码图片。
 *
 * 结论：`readPixelsFromImage` / `extractImageColors` 的 image 与 dataUrl 两条路
 * **只能在装了 canvas 包的真机 / 浏览器里验证**，本仓库的 `npm test` 覆盖不到，
 *   已在上方对应函数标注 UNVERIFIED。
 * 单测因此只覆盖 `quantizeColors` / `extractPalette` / `resolveTargetSize`
 * （用构造的 `Uint8ClampedArray` 喂像素），以及"缺注入时必须抛错"这条缝的行为。
 *
 * UNVERIFIED: `readPixelsFromImage` 用真实 canvas 跑出来的像素与缩放结果，未在真机比对。
 * UNVERIFIED: `extractPalette` 的排序结果与原版布尔比较器在不同引擎下的输出，未逐条比对。
 */

/* ─────────────── 以下为「提取结果 → 库项 / 应用载荷」的构造（原版移植） ─────────────── */

/**
 * 前端 RGB→CMYK 快速公式。
 *
 * 原版颜色类（`app.v4.js` 的 `w_` / `y_`）同样是前端 JS 计算，不是 PS 的 ICC 转换，
 * 所以库项里的 c/m/y/k 与 PS 内部值本就有偏差——这不是我们引入的误差。
 * 数值口径与 `mm_style_getForegroundColor` 一致：0-100 整数。
 */
export function hexToCmyk(hex: string): { c: number; m: number; y: number; k: number } {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  const black = 1 - Math.max(r, g, b);
  if (black >= 1) return { c: 0, m: 0, y: 0, k: 100 };

  return {
    c: Math.round(((1 - r - black) / (1 - black)) * 100),
    m: Math.round(((1 - g - black) / (1 - black)) * 100),
    y: Math.round(((1 - b - black) / (1 - black)) * 100),
    k: Math.round(black * 100)
  };
}

/** 原版 `createGradientItem` 里的色标形状（`app.v4.js:52771-52785`） */
export interface GradientColorStop {
  type: '1433629267';
  location: number;
  midpoint: number;
  color: {
    red: number;
    grain: number;
    blue: number;
    hexValue: string;
    cyan: number;
    magenta: number;
    yellow: number;
    black: number;
  };
}

/** 渐变库项的 `gradient` 载荷（渐变应用已验证的形状） */
export interface GradientPayload {
  angle: number;
  type: string;
  reverse: boolean;
  align: boolean;
  gradient: {
    name: string;
    smoothness: number;
    colors: GradientColorStop[];
    transparency: { opacity: number; location: number; midpoint: number }[];
  };
}

/** 渐变库项：`{ name, gradient }`。index signature 是为了能直接塞进库项数组（Record 形状） */
export interface GradientLibraryItem {
  name: string;
  gradient: GradientPayload;
  [key: string]: unknown;
}

/**
 * 由一个 HEX 颜色对构造渐变库项（原版 `createGradientItem` `:52746-52796`）。
 *
 * 参数是 `['#aabbcc', '#ddeeff']` 形式（弹层里每条渐变 = 两色）。
 * type `1282306592` = 线性、`1433629267` = 颜色色标，照抄原版魔数。
 */
export function createGradientItem(name: string, pair: [string, string]): GradientLibraryItem {
  const hexes = pair.map((hex) => hex.replace('#', ''));
  const smoothness = 4096;
  const step = smoothness / (hexes.length - 1);

  const colors: GradientColorStop[] = hexes.map((hex, index) => {
    const cmyk = hexToCmyk(`#${hex}`);
    return {
      type: '1433629267',
      location: index * step,
      midpoint: 50,
      color: {
        red: parseInt(hex.slice(0, 2), 16),
        grain: parseInt(hex.slice(2, 4), 16),
        blue: parseInt(hex.slice(4, 6), 16),
        hexValue: hex,
        cyan: cmyk.c,
        magenta: cmyk.m,
        yellow: cmyk.y,
        black: cmyk.k
      }
    };
  });

  const transparency = hexes.map((_, index) => ({
    opacity: 100,
    location: index * step,
    midpoint: 50
  }));

  return {
    name,
    gradient: {
      angle: 180,
      type: '1282306592',
      reverse: true,
      align: true,
      gradient: { name: '未命名', smoothness, colors, transparency }
    }
  };
}

/**
 * 由提取的颜色列表生成两两渐变对（原版 imgColor 的 `watch colors` `:52838-52873`）：
 * 取前 6 色，任意两色（含先后两个方向）各成一条，6 色最多 30 条。
 * 弹层预览用 `linear-gradient(98deg, a 0%, b 100%)`。
 */
export function buildColorPairGradients(hexes: string[]): { pair: [string, string]; css: string }[] {
  const head = hexes.slice(0, 6);
  const result: { pair: [string, string]; css: string }[] = [];
  for (const a of head) {
    for (const b of head) {
      if (a === b) continue;
      result.push({ pair: [a, b], css: `linear-gradient(98deg,${a} 0%,${b} 100%)` });
    }
  }
  return result;
}
