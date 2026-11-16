/**
 * 色环的画与取：绘制、路径投影、拖点命中。
 *
 * 为什么单独一个文件：canvas 绘制是「一屏像素」的事，塞进组件会把事件处理淹掉；
 * 反过来，它又依赖 `domain/gradient` 的换算，放 `domain` 会违反「domain 零 IO」
 * （`getContext` 是平台原语）。所以放在 feature 内、组件之外：**组件只负责绑定**。
 *
 * **画成两层**（`ColorWheel` 里两个叠放的 canvas）：
 * - 底层 `paintDisc`：环面。逐像素 LCH→sRGB 是这条链上最贵的一步，
 *   **只在画布尺寸变化时调用一次**；
 * - 上层 `paintOverlay`：参考圈、十字、过渡路径、两个端点。颜色一变就要重画，
 *   但只画线，成本是常数。
 * 不分层时每次拖动都要连环面一起重画，量程一旦跟着端点变就会卡死（2026-11-16 踩过）。
 *
 * 唯一的换算口径在 `domain/gradient`：环上看到的颜色、拖点取到的颜色、最后烘焙进 PS 的色标，
 * 三者都走 `lchOf` / `lchToHex` / `sampleStops`，这里不做任何色彩数学。
 *
 * 两个几何口径写死在这里、别处不许再算：
 * 1. **环切片亮度** `SLICE_L = 70`：与参照引擎一致，把 L 抽出去，环只表达色相与浓度。
 * 2. **环的量程** `DISC_DOMAIN = 140`：**常量，与参照引擎一致**。
 *    曾经按端点浓度浮动（端点落在环中段、拖得更准），但那样环面缓存会随端点浓度每次变化失效。
 *    量程只影响「画环 + 拖点换算」，不影响插值与烘焙结果，所以固定值不改变输出。
 */

import { lchOf, lchToHex, sampleStops, type GradientRoute } from '../../domain/gradient';

/** 环切片的亮度：LCH 的 L，与参照引擎同一档，环只表达色相（角度）与浓度（半径） */
const SLICE_L = 70;
/** 环的量程（常量）：半径 100% 处对应 LCH 浓度 140，与参照引擎一致 */
const DISC_DOMAIN = 140;
/** 路径采样点：够看出弧线形状，又不至于每次重绘几千个点 */
const PATH_SAMPLES = 65;

interface WheelPoint {
  x: number;
  y: number;
}

export interface WheelGeometry {
  center: WheelPoint;
  radius: number;
  /** dpr：命中半径与线宽都按它放大，逻辑像素才不会在高分屏上变细 */
  dpr: number;
  /** 两个端点（01 / 02）在画布坐标系里的位置 */
  dots: [WheelPoint, WheelPoint];
  /** 环的量程：半径 = 浓度 / domain */
  domain: number;
}

export interface WheelModel {
  first: string;
  second: string;
  route: GradientRoute;
  /** 明度条当前控的是哪个端点：被控的那个点画一圈高亮，用户才知道竖条改的是谁 */
  active: 0 | 1;
}

interface CanvasGeometry {
  pixels: number;
  dpr: number;
  center: WheelPoint;
  radius: number;
}

/** 两层画布必须用同一套几何：算错一层，端点就落在环外 */
function canvasGeometry(width: number, height: number): CanvasGeometry {
  const dpr = window.devicePixelRatio || 1;
  const diameter = Math.max(40, Math.floor(Math.min(width, height)));
  const pixels = Math.round(diameter * dpr);
  return { pixels, dpr, center: { x: pixels / 2, y: pixels / 2 }, radius: pixels / 2 - 1 };
}

/** 按几何分配像素缓冲并清空；尺寸没变时不动缓冲（重设 `width` 会连内容一起清掉） */
function prepare(canvas: HTMLCanvasElement, pixels: number): CanvasRenderingContext2D {
  if (canvas.width !== pixels || canvas.height !== pixels) {
    canvas.width = pixels;
    canvas.height = pixels;
  }
  const context = canvas.getContext('2d');
  if (!context) throw new Error('浏览器无法创建色环画布');
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, pixels, pixels);
  return context;
}

function project(hex: string, center: WheelPoint, radius: number, domain: number): WheelPoint {
  const { c, h } = lchOf(hex);
  if (c < 1e-6) return { x: center.x, y: center.y };
  const amount = Math.min(1, c / domain);
  const radians = (h * Math.PI) / 180;
  return { x: center.x + Math.cos(radians) * amount * radius, y: center.y - Math.sin(radians) * amount * radius };
}

/* 环面按像素尺寸缓存**离屏副本**：页面切走会卸载 canvas，重建后尺寸与内容都没变，
   命中缓存直接贴图。不缓存则每次进页都要重算几万像素的 LCH→sRGB
   （dpr=2 时约 144 万次换算），用户看到的是「环面先空白一会儿才出现」。
   不能缓存 canvas 自己 —— 那个随组件销毁。上限 3 档：面板 200–360 只会有少数几个尺寸。 */
const discCache = new Map<number, HTMLCanvasElement>();
const DISC_CACHE_LIMIT = 3;

/**
 * 底层：环面。**只在画布尺寸变化时调用**。
 *
 * 半径方向 = 浓度（0 在圆心、`DISC_DOMAIN` 在外缘），角度 = 色相；
 * 外缘一像素做透明羽化，靠 alpha 收边，不画成硬切的黑圈。
 */
export function paintDisc(canvas: HTMLCanvasElement, width: number, height: number): void {
  const { pixels, center, radius } = canvasGeometry(width, height);
  const context = prepare(canvas, pixels);

  const cached = discCache.get(pixels);
  if (cached) {
    context.drawImage(cached, 0, 0);
    return;
  }

  const image = context.createImageData(pixels, pixels);
  const data = image.data;

  for (let y = 0; y < pixels; y += 1) {
    for (let x = 0; x < pixels; x += 1) {
      const offset = (y * pixels + x) * 4;
      const dx = x + 0.5 - center.x;
      const dy = center.y - y - 0.5;
      const amount = Math.hypot(dx, dy) / radius;
      if (amount > 1) continue;

      const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
      const hex = lchToHex(SLICE_L, Math.min(1, amount) * DISC_DOMAIN, hue);
      const [r, g, b] = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));

      const coverage = Math.max(0, Math.min(1, (1 - amount) * radius + 0.5));
      data[offset] = r as number;
      data[offset + 1] = g as number;
      data[offset + 2] = b as number;
      data[offset + 3] = Math.round(coverage * 255);
    }
  }

  context.putImageData(image, 0, 0);

  /* 存一份离屏副本：下次挂载（或换回同一尺寸）直接贴图，不再逐像素算 */
  const copy = document.createElement('canvas');
  copy.width = pixels;
  copy.height = pixels;
  copy.getContext('2d')?.drawImage(canvas, 0, 0);
  discCache.set(pixels, copy);
  if (discCache.size > DISC_CACHE_LIMIT) {
    const oldest = discCache.keys().next();
    if (!oldest.done) discCache.delete(oldest.value);
  }
}

/**
 * 上层：参考圈 / 十字 / 过渡路径 / 两个端点，返回这次绘制的几何（拖点与命中都用它）。
 *
 * 画布像素缓冲按 `css 短边 × dpr` 分配，圆形永远居中：canvas 元素本身是矩形，
 * 由 CSS 撑满卡片，所以「短边」才是圆的有效直径。
 */
export function paintOverlay(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  model: WheelModel
): WheelGeometry {
  const { pixels, dpr, center, radius } = canvasGeometry(width, height);
  const context = prepare(canvas, pixels);
  const domain = DISC_DOMAIN;

  /* 参考圈与十字：只用来读「浓度 / 色相」的方位，不参与取色 */
  context.save();
  context.strokeStyle = 'rgba(255,255,255,.10)';
  context.lineWidth = dpr;
  for (const fraction of [0.5, 1]) {
    context.beginPath();
    context.arc(center.x, center.y, radius * fraction, 0, Math.PI * 2);
    context.stroke();
  }
  context.setLineDash([2 * dpr, 4 * dpr]);
  context.beginPath();
  context.moveTo(center.x - radius, center.y);
  context.lineTo(center.x + radius, center.y);
  context.moveTo(center.x, center.y - radius);
  context.lineTo(center.x, center.y + radius);
  context.stroke();
  context.setLineDash([]);
  context.restore();

  /* 路径：按当前过渡方式真实采样后投影，画出的是「这条渐变实际怎么走」，不是示意曲线 */
  const stops = sampleStops(model.first, model.second, model.route, PATH_SAMPLES);
  const path = stops.map((hex) => project(hex, center, radius, domain));
  context.save();
  context.lineJoin = 'round';
  context.lineCap = 'round';
  for (const [lineWidth, color] of [
    [5 * dpr, 'rgba(15,16,20,.65)'],
    [2.2 * dpr, '#ffffff']
  ] as const) {
    context.beginPath();
    path.forEach((point, index) => (index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y)));
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.stroke();
  }

  /* 中点箭头：告诉用户这条路是从 01 走向 02 的 */
  const tip = path[Math.floor(path.length * 0.55)];
  const before = path[Math.floor(path.length * 0.55) - 2];
  const after = path[Math.floor(path.length * 0.55) + 2];
  if (tip && before && after && Math.hypot(after.x - before.x, after.y - before.y) > 2 * dpr) {
    const direction = Math.atan2(after.y - before.y, after.x - before.x);
    const head = 5 * dpr;
    const wing = 3.5 * dpr;
    context.beginPath();
    context.moveTo(tip.x + Math.cos(direction) * head, tip.y + Math.sin(direction) * head);
    context.lineTo(
      tip.x - Math.cos(direction) * wing + Math.sin(direction) * head,
      tip.y - Math.sin(direction) * wing - Math.cos(direction) * head
    );
    context.lineTo(
      tip.x - Math.cos(direction) * wing - Math.sin(direction) * head,
      tip.y - Math.sin(direction) * wing + Math.cos(direction) * head
    );
    context.closePath();
    context.fillStyle = '#ffffff';
    context.fill();
  }
  context.restore();

  const dots: [WheelPoint, WheelPoint] = [
    project(model.first, center, radius, domain),
    project(model.second, center, radius, domain)
  ];

  /* 端点：实心圆 = 当前色，白描边保证在任何底色上都看得见；编号贴着点画，标出先后 */
  dots.forEach((point, index) => {
    /* 受明度条控制的端点：外面加一圈，让「竖条现在改的是谁」一眼可见 */
    if (index === model.active) {
      context.beginPath();
      context.arc(point.x, point.y, 10 * dpr, 0, Math.PI * 2);
      context.fillStyle = 'rgba(255,255,255,.16)';
      context.fill();
      context.strokeStyle = 'rgba(255,255,255,.85)';
      context.lineWidth = 1.2 * dpr;
      context.stroke();
    }
    context.beginPath();
    context.arc(point.x, point.y, 5.5 * dpr, 0, Math.PI * 2);
    context.fillStyle = index === 0 ? model.first : model.second;
    context.fill();
    context.strokeStyle = '#ffffff';
    context.lineWidth = 1.8 * dpr;
    context.stroke();

    const { h } = lchOf(index === 0 ? model.first : model.second);
    const radians = (h * Math.PI) / 180;
    const labelX = Math.min(pixels - 11 * dpr, Math.max(11 * dpr, point.x + Math.cos(radians) * 14 * dpr));
    const labelY = Math.min(pixels - 11 * dpr, Math.max(11 * dpr, point.y - Math.sin(radians) * 14 * dpr));
    context.font = `700 ${Math.round(9 * dpr)}px "Microsoft YaHei", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    context.strokeStyle = '#121419';
    context.lineWidth = 3 * dpr;
    context.strokeText(`0${index + 1}`, labelX, labelY);
    context.fillStyle = '#ffffff';
    context.fillText(`0${index + 1}`, labelX, labelY);
  });

  return { center, radius, dpr, dots, domain };
}

/**
 * 这次按下要动哪个端点：抓在某个点上就是它，点在空白处就是离得更近的那个（取色语义）。
 *
 * 调用方拿到的这个下标必须**整个拖拽过程固定**：每次移动重算的话，
 * 拖过两个点的中点时会被「另一个更近了」抢走，两个点来回跳。
 */
export function grabDot(geometry: WheelGeometry, point: WheelPoint): 0 | 1 {
  const [first, second] = geometry.dots;
  const toFirst = Math.hypot(first.x - point.x, first.y - point.y);
  const toSecond = Math.hypot(second.x - point.x, second.y - point.y);
  return toFirst <= toSecond ? 0 : 1;
}

/**
 * 取色：角度定色相、半径定浓度，**亮度保持该端点原值**。
 *
 * 保持 L 是参照引擎的语义（环是 L 切片，拖点只改 h/C）；不保持的话，
 * 拖一下就会把亮部拖暗，用户没法只调色相。
 */
export function pickColor(geometry: WheelGeometry, base: string, point: WheelPoint): string {
  const dx = point.x - geometry.center.x;
  const dy = geometry.center.y - point.y;
  const distance = Math.hypot(dx, dy);
  const { l, h: baseHue } = lchOf(base);
  const hue = distance < 1e-6 ? baseHue : ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  const chroma = Math.min(1, distance / geometry.radius) * geometry.domain;
  return lchToHex(l, chroma, hue);
}
