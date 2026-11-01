/**
 * SVG `path` → Photoshop 路径点（纯函数，零 IO）。
 *
 * 为什么在 `domain`：这是「字符串 → 坐标」的纯换算，没有 IO、没有平台依赖，
 * 用单测就能钉死；jsx 只负责把点塞进 `PathItem`，不算任何公式。
 *
 * 输出形状对着 `PathPoint` 的三个属性：`anchor`（锚点）、`leftDirection`（进入本锚点
 * 的控制柄）、`rightDirection`（离开本锚点的控制柄）。直线段三个值相等。
 *
 * 支持的指令：`M/m L/l H/h V/v C/c S/s Q/q T/t Z/z`。
 * **不支持 `A/a`（椭圆弧）**：转贝塞尔要按弧长分四段，vtracer 的输出里没有弧线，
 * 真遇到就明确报错，不猜。
 */

import { failWithDetail, ok, type Result } from '../types/result';
import type { VectorPoint, VectorSubPath } from '../types/vectorize';

export type { VectorPoint, VectorSubPath } from '../types/vectorize';

/** 直线点：三个坐标相同 */
function corner(x: number, y: number): VectorPoint {
  return { anchor: [x, y], left: [x, y], right: [x, y], smooth: false };
}

/** 控制柄是否共线（叉积足够小 + 两侧都有长度） */
function isSmooth(point: VectorPoint): boolean {
  const [ax, ay] = point.anchor;
  const dxl = point.left[0] - ax;
  const dyl = point.left[1] - ay;
  const dxr = point.right[0] - ax;
  const dyr = point.right[1] - ay;

  if (Math.abs(dxl) + Math.abs(dyl) < 1e-6) return false;
  if (Math.abs(dxr) + Math.abs(dyr) < 1e-6) return false;

  const cross = dxl * dyr - dyl * dxr;
  const len = Math.hypot(dxl, dyl) * Math.hypot(dxr, dyr);
  return Math.abs(cross) / (len || 1) < 1e-3;
}

const NUMBER_RE = /[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g;

/** 把 `d` 切成「命令字母 + 该命令的参数」；`Z` 没有参数 */
function tokenize(d: string): { cmd: string; args: number[] }[] {
  const tokens: { cmd: string; args: number[] }[] = [];
  let current: { cmd: string; args: number[] } | null = null;
  let index = 0;

  while (index < d.length) {
    const char = d[index] ?? '';
    if (/[MmLlHhVvCcSsQqTtAaZz]/.test(char)) {
      current = { cmd: char, args: [] };
      tokens.push(current);
      index += 1;
      continue;
    }

    if (/[\s,]/.test(char)) {
      index += 1;
      continue;
    }

    NUMBER_RE.lastIndex = index;
    const match = NUMBER_RE.exec(d);
    if (!match || match.index !== index) {
      /* 认不出的字符：跳过，避免死循环（真实文件里偶尔有注释残留） */
      index += 1;
      continue;
    }
    if (current) current.args.push(Number(match[0]));
    index = NUMBER_RE.lastIndex;
  }

  return tokens;
}

/**
 * 解析 SVG 的 `path d`。
 *
 * 一段 `d` 可以有多条子路径（每个 `M` 开一条）；相对指令按当前点换算成绝对坐标。
 */
export function parseSvgPath(d: string): Result<VectorSubPath[]> {
  if (!d.trim()) return failWithDetail('VALIDATION', '路径数据是空的', 'd:empty');

  const subpaths: VectorSubPath[] = [];
  let points: VectorPoint[] = [];
  let closed = false;

  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  /** 上一条曲线命令的第二个控制点，供 `S` / `T` 反射 */
  let lastCubic: [number, number] | null = null;
  let lastQuad: [number, number] | null = null;

  const flush = (): void => {
    if (!points.length) return;
    subpaths.push({ closed, points });
    points = [];
    closed = false;
  };

  const push = (point: VectorPoint): void => {
    points.push(point);
  };

  const lastPoint = (): VectorPoint | undefined => points[points.length - 1];

  for (const token of tokenize(d)) {
    const { cmd, args } = token;
    const relative = cmd === cmd.toLowerCase();
    const upper = cmd.toUpperCase();

    if (upper === 'Z') {
      closed = true;
      flush();
      cx = startX;
      cy = startY;
      lastCubic = null;
      lastQuad = null;
      continue;
    }

    if (upper === 'A') {
      return failWithDetail('VALIDATION', '不支持 SVG 弧线指令 A', 'cmd:A');
    }

    /* 每条命令的参数个数；`M` 之后的重复组按 `L` 处理 */
    const arity: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2 };
    const step = arity[upper] ?? 0;
    if (!step || args.length < step) continue;

    for (let offset = 0; offset + step <= args.length; offset += step) {
      const a = args.slice(offset, offset + step);
      const n = (i: number): number => a[i] ?? 0;

      /* `M` 的后续组是隐式 `L` */
      const effective = upper === 'M' && offset > 0 ? 'L' : upper;

      if (effective === 'M') {
        flush();
        cx = relative ? cx + n(0) : n(0);
        cy = relative ? cy + n(1) : n(1);
        startX = cx;
        startY = cy;
        push(corner(cx, cy));
        lastCubic = null;
        lastQuad = null;
      } else if (effective === 'L') {
        cx = relative ? cx + n(0) : n(0);
        cy = relative ? cy + n(1) : n(1);
        push(corner(cx, cy));
        lastCubic = null;
        lastQuad = null;
      } else if (effective === 'H') {
        cx = relative ? cx + n(0) : n(0);
        push(corner(cx, cy));
        lastCubic = null;
        lastQuad = null;
      } else if (effective === 'V') {
        cy = relative ? cy + n(0) : n(0);
        push(corner(cx, cy));
        lastCubic = null;
        lastQuad = null;
      } else if (effective === 'C' || effective === 'S') {
        let c1x: number;
        let c1y: number;
        let c2x: number;
        let c2y: number;
        let ex: number;
        let ey: number;

        if (effective === 'C') {
          c1x = relative ? cx + n(0) : n(0);
          c1y = relative ? cy + n(1) : n(1);
          c2x = relative ? cx + n(2) : n(2);
          c2y = relative ? cy + n(3) : n(3);
          ex = relative ? cx + n(4) : n(4);
          ey = relative ? cy + n(5) : n(5);
        } else {
          /* `S`：第一控制点是上一条曲线第二控制点的反射；没有上一条就取当前点 */
          c1x = lastCubic ? 2 * cx - lastCubic[0] : cx;
          c1y = lastCubic ? 2 * cy - lastCubic[1] : cy;
          c2x = relative ? cx + n(0) : n(0);
          c2y = relative ? cy + n(1) : n(1);
          ex = relative ? cx + n(2) : n(2);
          ey = relative ? cy + n(3) : n(3);
        }

        /* 曲线是「上一点.right → 本点.left」：把上一点的控制柄补上 */
        const previous = lastPoint();
        if (previous) previous.right = [c1x, c1y];

        cx = ex;
        cy = ey;
        push({ anchor: [ex, ey], left: [c2x, c2y], right: [ex, ey], smooth: false });
        lastCubic = [c2x, c2y];
        lastQuad = null;
      } else if (effective === 'Q' || effective === 'T') {
        let qx: number;
        let qy: number;
        let ex: number;
        let ey: number;

        if (effective === 'Q') {
          qx = relative ? cx + n(0) : n(0);
          qy = relative ? cy + n(1) : n(1);
          ex = relative ? cx + n(2) : n(2);
          ey = relative ? cy + n(3) : n(3);
        } else {
          qx = lastQuad ? 2 * cx - lastQuad[0] : cx;
          qy = lastQuad ? 2 * cy - lastQuad[1] : cy;
          ex = relative ? cx + n(0) : n(0);
          ey = relative ? cy + n(1) : n(1);
        }

        /* 二次 → 三次：控制点按 2/3 抬升（PS 的 PathPoint 只认三次） */
        const c1x = cx + (2 / 3) * (qx - cx);
        const c1y = cy + (2 / 3) * (qy - cy);
        const c2x = ex + (2 / 3) * (qx - ex);
        const c2y = ey + (2 / 3) * (qy - ey);

        const previous = lastPoint();
        if (previous) previous.right = [c1x, c1y];

        cx = ex;
        cy = ey;
        push({ anchor: [ex, ey], left: [c2x, c2y], right: [ex, ey], smooth: false });
        lastCubic = [c2x, c2y];
        lastQuad = [qx, qy];
      }

    }
  }

  flush();

  /* 平滑标记放在最后统一算：控制柄可能在后面的指令里才被补上 */
  for (const subpath of subpaths) {
    for (const point of subpath.points) point.smooth = isSmooth(point);
  }

  if (!subpaths.length) return failWithDetail('VALIDATION', '路径数据里没有点', `d:${d.slice(0, 60)}`);
  return ok(subpaths);
}

/** SVG 里的一条 `<path>`：`d` 与填充色（vtracer 一定写 `fill="#rrggbb"`） */
export interface SvgPathEntry {
  d: string;
  fill: string | null;
}

/**
 * 从 SVG 文本里取出所有 `<path>` 的 `d` 与 `fill`。
 *
 * 只服务 vtracer 的输出（结构固定、没有嵌套 `<g transform>`），所以用正则而不是引 XML 解析器：
 * 引入解析器要多几十 KB，而这里只需两个属性。**遇到没有 `d` 的 path 直接跳过**。
 */
export function extractSvgPaths(svg: string): SvgPathEntry[] {
  const entries: SvgPathEntry[] = [];
  const tagRe = /<path\b[^>]*>/g;

  for (const match of svg.matchAll(tagRe)) {
    const tag = match[0];
    const d = /\bd="([^"]*)"/.exec(tag)?.[1];
    if (!d || !d.trim()) continue;

    const fill = /\bfill="([^"]*)"/.exec(tag)?.[1] ?? null;
    entries.push({ d, fill });
  }

  return entries;
}

/** `#rrggbb` → `{ r, g, b }`；认不出返回 null（调用方决定兜底色） */
export function hexToRgb(hex: string | null): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  const value = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}
