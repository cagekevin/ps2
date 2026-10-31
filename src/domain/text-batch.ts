/**
 * 批量文字（新建 / 改字）的纯逻辑：一行 = 一层的转义、改动比对、新建字号序列。
 *
 * 是什么：`jsx/main.jsx` 三个 `mm_text_*` 的数据形状，以及全部不碰 PS 的计算。
 * 谁在用：`commands/text-batch`（编排）、`features/font-panel` 的弹窗（渲染）。
 * 禁止：不碰 PS、不碰 IO、不碰 React；**也不猜语义**（哪个层是标题由用户认，不由行号推）。
 *
 * 三条硬规则（都有单测钉住）：
 *   1. 层内换行一律用 `⏎`(U+23CE) 承载，层与层之间才是 `\n`。少了这条，段落层会被拆成多层，
 *      写回时把字写到别的层上 —— 这类错改不回来。
 *   2. 行数必须等于层数（逐行对应断了就不知道该写哪层），但**空行合法**：留空 = 不改。
 *   3. 只把真的改过的层交出去；没改的一个字节都不传，否则 PS 会把没动的层也重排一遍。
 */

import { decodeList } from '../types/decode-list';
import { isRecord } from '../types/guards';
import { MSG } from '../types/messages';
import { failWithDetail, ok, type Result } from '../types/result';

/** 层内换行的占位符。不用 `↵`(U+21B5)：两者字形接近，混用会出现「看着一样但比对不上」 */
export const LAYER_BREAK = '\u23CE';

/** 首末字号比：新建排版只有这一个常量（要更平改 0.6、更陡改 0.4），不再引第二套层级表 */
export const SIZE_RATIO = 0.5;

/** 字号下限：字号再小 PS 里就看不见了，兜住 */
export const MIN_SIZE = 6;

/**
 * 新建文字的默认字体：思源黑体 CN / Regular。
 *
 * 三个字段是 `zt_setFontName(hjm, mz, zz)` 的入参形状，值取官方快捷字体默认列表的第一项
 * （`app.v4.js:40154` 的 `family: '思源黑体 CN'` 与它 `hjm` / `mz` 里的 Regular 那一档）。
 */
export const DEFAULT_CREATE_FONT = {
  hjm: 'SourceHanSansCN-Regular',
  mz: 'Source Han Sans CN Regular',
  zz: 'Regular'
} as const;

/** 新建文字的段落对齐：0 左 / 1 中 / 2 右。默认左，与官方智能排版的 `align=0` 一致 */
export const DEFAULT_CREATE_ALIGN = 0 as const;

/** 一个文字层的只读快照。`id` 是唯一身份，`name` 只用来让人认层 */
export interface TextLayerSnapshot {
  id: string;
  name: string;
  text: string;
  locked: boolean;
}

/** 写回的一条：只带真的改过的层 */
export interface Patch {
  id: string;
  text: string;
}

/** PS 的换行是 `\r`，统一成 `\n` 再谈别的 */
function normalize(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

/** 层列表 → 一个 textarea 的内容：层内换行变 `⏎`，层与层之间是 `\n` */
export function encodeLayers(layers: readonly TextLayerSnapshot[]): string {
  return layers.map((layer) => normalize(layer.text).split('\n').join(LAYER_BREAK)).join('\n');
}

/**
 * jsx 回来的 `layers` 数组 → 快照。
 *
 * 用 `reject` 而不是 `filter`：层与行**按下标一一对应**，跳一项就整份错位，
 * 那比整份读不出来更糟（`CONVENTIONS` §1.2 的判据）。
 */
export function decodeLayers(value: unknown): Result<TextLayerSnapshot[]> {
  const decoded = decodeList(value, layerOf, 'reject', 'layers');
  if (decoded.status === 'error') return decoded;
  return ok(decoded.value.items);
}

function layerOf(value: unknown, path: string): Result<TextLayerSnapshot> {
  if (!isRecord(value)) return failWithDetail('CORRUPT', MSG.corrupt, path);
  const { id, name, text, locked } = value;
  if (typeof id !== 'string' || !id) return failWithDetail('CORRUPT', MSG.corrupt, `${path}.id`);
  if (typeof name !== 'string') return failWithDetail('CORRUPT', MSG.corrupt, `${path}.name`);
  if (typeof text !== 'string') return failWithDetail('CORRUPT', MSG.corrupt, `${path}.text`);
  return ok({ id, name, text, locked: locked === true });
}

/**
 * textarea 的每一行 → 真实文本（`⏎` 还原成 `\n`）。
 *
 * 只有一种失败：行数与层数不等。**空行不是失败**（留空 = 不改），
 * 所以这里不再有「第 N 行是空的」这种校验。
 */
export function decodeDraft(draft: string, layerCount: number): Result<string[]> {
  const lines = draft === '' ? (layerCount === 1 ? [''] : []) : draft.split('\n');
  if (lines.length !== layerCount) {
    return failWithDetail(
      'VALIDATION',
      MSG.textBatch.lineCountMismatch,
      `lines:${lines.length} layers:${layerCount}`
    );
  }
  return ok(lines.map((line) => line.split(LAYER_BREAK).join('\n')));
}

/** 行 → 要写回的层：空行跳过、与原文相同的跳过，剩下的才是一条 patch */
export function buildPatches(
  layers: readonly TextLayerSnapshot[],
  draft: string
): Result<Patch[]> {
  const decoded = decodeDraft(draft, layers.length);
  if (decoded.status === 'error') return decoded;

  const patches: Patch[] = [];
  layers.forEach((layer, index) => {
    const line = decoded.value[index];
    if (line === undefined) return;
    if (line.trim() === '') return;
    if (line === normalize(layer.text)) return;
    patches.push({ id: layer.id, text: line });
  });
  return ok(patches);
}

/** 新建：每行一层，空行忽略（内容不做 trim —— 行首空格可能是用户要的） */
export function parseCreateLines(raw: string): string[] {
  return raw.split('\n').filter((line) => line.trim() !== '');
}

/**
 * 新建的字号序列：首行 `base`，末行 `base × SIZE_RATIO`，中间等比。
 *
 * 行数只决定步长，落差恒为 2:1 —— 所以 3 行和 20 行都成立，不会出现「第 7 行开始全是同一个字号」。
 */
export function createSizes(count: number, base: number): number[] {
  if (count <= 0 || !Number.isFinite(base) || base <= 0) return [];
  const first = Math.max(MIN_SIZE, round1(base));
  if (count === 1) return [first];

  const step = Math.pow(SIZE_RATIO, 1 / (count - 1));
  const sizes: number[] = [];
  for (let index = 0; index < count; index += 1) {
    sizes.push(Math.max(MIN_SIZE, round1(base * Math.pow(step, index))));
  }
  return sizes;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
