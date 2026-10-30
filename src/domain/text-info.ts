/**
 * 当前文字图层的属性快照。
 *
 * 唯一真相是 PS 文档：`store/text.info` 只是投影，写成功后由页面本地 patch，
 * 切图层后必须重新 `refresh()`。
 *
 * 归一化是**宽松**的：`zt_getFontSimpleInfo` 的返回结构没有真机验证过，
 * 字段缺失用面板默认值补；但**一个可识别字段都没有**时返回 `CORRUPT`，
 * 让面板显示「读取失败」——把一坨看不懂的返回渲染成「12 点 / 白色」等于骗用户。
 */

import { MSG } from '../types/messages';
import { failWithDetail, ok, type Result } from '../types/result';
import { isRecord } from '../types/guards';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/** 把通道值拼成 css 颜色串（`--mm-swatch` 这类变量的唯一出处） */
export function rgbCss(color: RgbColor): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export type Justification = 'left' | 'center' | 'right';

export interface TextInfo {
  /** 字号是文本：面板允许「(自动)」「12.5」这类展示值 */
  size: string;
  weight: string;
  fauxBold: boolean;
  fauxItalic: boolean;
  useAutoLeading: boolean;
  leading: number;
  tracking: number;
  autoKerning: 'manual' | 'opticalKern' | string;
  capitalization: string;
  color: RgbColor;
  family: string;
  justification: Justification;
}

/** 面板默认值（原版 `app.v4.js:42262-42281`）：12 点 / 行距 0 / 字距 0 / 左对齐 / 白 */
export const DEFAULT_TEXT_INFO: TextInfo = {
  size: '12',
  weight: '选择字重',
  fauxBold: false,
  fauxItalic: false,
  useAutoLeading: false,
  leading: 0,
  tracking: 0,
  autoKerning: 'manual',
  capitalization: 'Nrml',
  color: { r: 255, g: 255, b: 255 },
  family: '请选择字体',
  justification: 'left'
};

const WHITE: RgbColor = { r: 255, g: 255, b: 255 };

function clampChannel(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(255, Math.max(0, Math.round(value)));
}

/**
 * 颜色归一：接受 `{ rgb: { r, g, b } }`（`zt_setFontColor` 的返回）或裸 `{ r, g, b }`。
 * 取不到就用白色——这是面板默认色，不是「猜一个用户可能喜欢的颜色」。
 */
export function normalizeTextColor(raw: unknown): RgbColor {
  if (!isRecord(raw)) return { ...WHITE };

  const source = isRecord(raw.rgb) ? raw.rgb : raw;
  return {
    r: clampChannel(source.r, WHITE.r),
    g: clampChannel(source.g, WHITE.g),
    b: clampChannel(source.b, WHITE.b)
  };
}

function readJustification(value: unknown): Justification {
  if (value === 'center' || value === 'right') return value;
  return 'left';
}

/** 认得的键；一个都没有说明返回结构与预期完全不同，不能当默认值渲染 */
const KNOWN_KEYS = [
  'size',
  'weight',
  'fauxBold',
  'fauxItalic',
  'useAutoLeading',
  'leading',
  'tracking',
  'autoKerning',
  'capitalization',
  'color',
  'family',
  'justification'
];

export function decodeTextInfo(raw: unknown): Result<TextInfo> {
  if (!isRecord(raw)) {
    return failWithDetail('CORRUPT', MSG.badPayload, `root:${typeof raw}`);
  }
  if (!KNOWN_KEYS.some((key) => key in raw)) {
    return failWithDetail('CORRUPT', MSG.badPayload, 'root:known-keys=0');
  }

  const base = DEFAULT_TEXT_INFO;
  const size = raw.size;

  return ok({
    size:
      typeof size === 'string'
        ? size
        : typeof size === 'number' && Number.isFinite(size)
          ? String(size)
          : base.size,
    weight: typeof raw.weight === 'string' && raw.weight ? raw.weight : base.weight,
    fauxBold: typeof raw.fauxBold === 'boolean' ? raw.fauxBold : base.fauxBold,
    fauxItalic: typeof raw.fauxItalic === 'boolean' ? raw.fauxItalic : base.fauxItalic,
    useAutoLeading:
      typeof raw.useAutoLeading === 'boolean' ? raw.useAutoLeading : base.useAutoLeading,
    leading:
      typeof raw.leading === 'number' && Number.isFinite(raw.leading) ? raw.leading : base.leading,
    tracking:
      typeof raw.tracking === 'number' && Number.isFinite(raw.tracking)
        ? raw.tracking
        : base.tracking,
    autoKerning: typeof raw.autoKerning === 'string' ? raw.autoKerning : base.autoKerning,
    capitalization:
      typeof raw.capitalization === 'string' && raw.capitalization
        ? raw.capitalization
        : base.capitalization,
    color: raw.color === undefined ? { ...base.color } : normalizeTextColor(raw.color),
    family: typeof raw.family === 'string' && raw.family ? raw.family : base.family,
    justification: readJustification(raw.justification)
  });
}

/**
 * 乐观更新：写成功后先改本地快照，不回读整个属性。
 * `base` 为 `null`（还没读到过）时从默认值起算——面板上必须能看见用户刚填的值。
 */
export function applyTextPatch(base: TextInfo | null, patch: Partial<TextInfo>): TextInfo {
  const current = base ?? DEFAULT_TEXT_INFO;

  return {
    ...current,
    ...patch,
    color: patch.color ? { ...patch.color } : { ...current.color }
  };
}
