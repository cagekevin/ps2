/**
 * 【范本】样式库模型（纯函数，零 IO、零 UI）
 *
 * 抄自 psz-panel-v4 / app 项目的 domain/style-library.ts，
 * 关键换算来自实测，不能猜：
 *   - 渐变 location 是 0–4096 刻度，必须 /4096*100
 *   - 渐变角度是 90 + angle，不是 angle 本身
 *   - 字体取 fonts[0]，color 可能是 null，拿不到就不画色点
 *   - 样式项缩略图是 <id>.png，没有 id 就不给 thumb
 */

import { isRecord } from '../types/guards';
import { parseJson } from '../types/json';
import { MSG } from '../types/messages';
import { failWithDetail, ok, type Result } from '../types/result';
import { resolveKuGroups } from './ku-format';

/** 四类库，顺序 = tab 顺序（原版 switchval，app.v4.js:54590） */
export type KuKind = 'color' | 'gradient' | 'font' | 'style';

export const KU_KINDS = ['color', 'gradient', 'font', 'style'] as const satisfies readonly KuKind[];

export const KU_TAB_LABELS = ['颜色', '渐变', '字体', '样式'] as const;

export interface StyleWarehouse {
  name: string;
  show?: Partial<Record<KuKind, boolean>>;
  color?: string;
  gradient?: string;
  font?: string;
  style?: string;
  /** 保留原版未知键 */
  [key: string]: unknown;
}

export interface StyleWarehouseIndex {
  index: number;
  list: StyleWarehouse[];
}

export interface KuFontPreview {
  count: number;
  /** `parseInt(size) + "点"`，size 不是数字时为空串 */
  size: string;
  /** `rgb(r,g,b)`，color 缺失时为空串 */
  color: string;
  family: string;
  weight: string;
  scriptFamily: string;
}

/**
 * 生成分组 GUID。
 * 格式照库文件里已有的 id：大写十六进制，8-4-4-4-12 带连字符。
 */
export function kuGuid(): string {
  const hex = '0123456789ABCDEF';
  let out = '';

  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += '-';
      continue;
    }
    if (i === 14) {
      out += '4';
      continue;
    }
    const r = Math.floor(Math.random() * 16);
    out += i === 19 ? hex[(r & 0x3) | 0x8] : hex[r];
  }

  return out;
}

export interface KuItem {
  name: string;
  /** 可直接塞进 background 的 CSS 值（颜色 / 渐变） */
  swatch?: string;
  /** 图片型渐变的文件名，页面自己拼路径 */
  image?: string;
  fontPreview?: KuFontPreview;
  /** 样式项缩略图文件名 `<id>.png` */
  thumb?: string;
}

/**
 * hover 浮层的详情行（照 app `pages/style/index.vue:112-124`）。
 *
 * 按库给不同信息：颜色显 HEX、字体显「族 · 字重 · N点 · 数量」、图片型渐变标注。
 * 空串表示这个项没有额外信息，浮层少渲染一行。
 */
export function describeDetail(kind: KuKind, item: KuItem): string {
  if (kind === 'color' && item.swatch) return `色值 ${item.swatch.toUpperCase()}`;

  if (kind === 'font' && item.fontPreview) {
    const preview = item.fontPreview;
    const parts = [preview.family, preview.weight, preview.size].filter(Boolean);
    if (preview.count > 1) parts.push(`${preview.count} 个字体`);
    return parts.join(' · ');
  }

  if (kind === 'gradient' && item.image) return '图片型渐变';
  return '';
}

export interface KuGroup {
  name: string;
  show: boolean;
  items: KuItem[];
}

const HEX_RE = /^[0-9a-fA-F]{3,8}$/;

/** 索引里登记的库文件名；空串表示没登记，不猜路径 */
export function fileNameOf(warehouse: StyleWarehouse | undefined, kind: KuKind): string {
  const value = warehouse?.[kind];
  return typeof value === 'string' ? value : '';
}

export function defaultStyleIndex(): StyleWarehouseIndex {
  return { index: 0, list: [{ name: '默认仓库' }] };
}

/**
 * 取一个原始分组的项列表。
 * `list` 不是数组时返回 undefined——**建空列表还是跳过由调用方决定**，
 * 这里只收敛「是不是数组」这一个判断（写路径上两种语义都合法）。
 */
export function kuListOf(group: Record<string, unknown> | undefined): unknown[] | undefined {
  const list = group?.list;
  return Array.isArray(list) ? list : undefined;
}

/**
 * 取一个原始分组的项列表，**没有就补空数组**（写回时语义：这个组必须有 list）。
 * 与 `kuListOf` 的区别：读/跳过用 kuListOf，写前补齐用本函数。
 */
export function kuEnsureListOf(group: Record<string, unknown>): unknown[] {
  if (!Array.isArray(group.list)) group.list = [];
  return group.list as unknown[];
}

/** 纯转换，不做判断：缺字段不补假值，index 越界夹到合法范围 */
export function normalizeStyleIndex(raw: unknown): StyleWarehouseIndex {
  if (!isRecord(raw) || !Array.isArray(raw.list)) return defaultStyleIndex();

  const list = raw.list.filter(isRecord) as StyleWarehouse[];
  if (!list.length) return { index: 0, list: [] };

  const index = typeof raw.index === 'number' && Number.isFinite(raw.index) ? raw.index : 0;
  const safe = Math.min(Math.max(Math.trunc(index), 0), list.length - 1);
  return { index: safe, list };
}

/** 结构判断在归一化之前，结构不认识就是 corrupt，不折成「新用户」 */
export function decodeStyleIndex(raw: unknown): Result<StyleWarehouseIndex> {
  if (!isRecord(raw)) return failWithDetail('CORRUPT', MSG.corrupt, 'root');
  if (!Array.isArray(raw.list)) return failWithDetail('CORRUPT', MSG.corrupt, 'root.list');
  return ok(normalizeStyleIndex(raw));
}

function itemName(raw: Record<string, unknown>): string {
  return typeof raw.name === 'string' && raw.name ? raw.name : '未命名';
}

function colorItem(raw: Record<string, unknown>): KuItem {
  const color = raw.color;
  if (isRecord(color) && typeof color.hex === 'string' && HEX_RE.test(color.hex)) {
    return { name: itemName(raw), swatch: `#${color.hex}` };
  }
  return { name: itemName(raw) };
}

/**
 * 渐变 → CSS linear-gradient。
 * location 是 0–4096 刻度，必须 /4096*100；角度是 90 + angle。
 */
function gradientSwatch(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  const inner = value.gradient;
  if (!isRecord(inner) || !Array.isArray(inner.colors)) return undefined;

  const stops: string[] = [];
  for (const stop of inner.colors) {
    if (!isRecord(stop)) continue;
    const color = stop.color;
    if (!isRecord(color) || typeof color.hexValue !== 'string') continue;
    if (!HEX_RE.test(color.hexValue)) continue;

    const at = typeof stop.location === 'number' ? ` ${(stop.location / 4096) * 100}%` : '';
    stops.push(`#${color.hexValue}${at}`);
  }
  if (stops.length < 2) return undefined;
  if (typeof value.angle !== 'number') return undefined;

  return `linear-gradient(${90 + value.angle}deg, ${stops.join(', ')})`;
}

function gradientItem(raw: Record<string, unknown>): KuItem {
  const item: KuItem = { name: itemName(raw) };

  const gradient = raw.gradient;
  if (isRecord(gradient) && typeof gradient.fileName === 'string' && gradient.fileName) {
    item.image = gradient.fileName;
  }

  const swatch = gradientSwatch(gradient);
  if (swatch) item.swatch = swatch;
  return item;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function fontColor(value: unknown): string {
  if (!isRecord(value) || !isRecord(value.rgb)) return '';
  const { r, g, b } = value.rgb;
  if (![r, g, b].every((channel) => typeof channel === 'number' && Number.isFinite(channel))) {
    return '';
  }
  return `rgb(${r as number}, ${g as number}, ${b as number})`;
}

function fontItem(raw: Record<string, unknown>): KuItem {
  const item: KuItem = { name: itemName(raw) };
  const fonts = raw.fonts;
  if (!Array.isArray(fonts) || !fonts.length || !isRecord(fonts[0])) return item;

  const first = fonts[0];
  const size = parseInt(String(first.size), 10);

  item.fontPreview = {
    count: fonts.length,
    size: Number.isFinite(size) ? `${size}点` : '',
    color: fontColor(first.color),
    family: text(first.family),
    weight: text(first.weight),
    scriptFamily: text(first.scriptFamily)
  };
  return item;
}

function styleItem(raw: Record<string, unknown>): KuItem {
  const item: KuItem = { name: itemName(raw) };
  const id = raw.id;
  if (typeof id === 'string' && id) item.thumb = `${id}.png`;
  return item;
}

const ITEM_READERS: Record<KuKind, (raw: Record<string, unknown>) => KuItem> = {
  color: colorItem,
  gradient: gradientItem,
  font: fontItem,
  style: styleItem
};

/**
 * 库文件文本 → 组列表。
 *
 * 三种形态都支持（groups 明文 / flat / container）。
 * `decode` 不传时只适用于 groups 形态——flat/container 里的 data 是 base64，
 * 必须由 repo 层注入真实解码器，否则会报「内层不是合法 JSON」。
 */
export function readKuGroups(
  kind: KuKind,
  text: string,
  decode: (base64: string) => string = (base64) => base64
): Result<KuGroup[]> {
  const parsed = parseJson(text, '库文件');
  if (parsed.status === 'error') return parsed;

  const source = resolveKuGroups(parsed.value, decode);
  if (source.status === 'error') return source;

  const reader = ITEM_READERS[kind];
  const groups: KuGroup[] = [];

  for (const raw of source.value) {
    const list = Array.isArray(raw.list) ? raw.list : [];
    groups.push({
      name: typeof raw.name === 'string' && raw.name ? raw.name : '未命名分组',
      show: typeof raw.show === 'boolean' ? raw.show : true,
      items: list.filter(isRecord).map(reader)
    });
  }

  return ok(groups);
}
