/**
 * 批量文字（新建 / 改字）命令层：三条。
 *
 * 只做编排：读 → domain 解码；改 → domain 比对出 patch；建 → domain 算字号序列。
 * 三条硬规则同其它命令（`CONVENTIONS` §9）：不碰 DOM、不弹 toast、只返回 `Result<T>`。
 *
 * 「一行 = 一层」的换算、留空 = 不改、改动比对全在 `domain/text-batch`，
 * 这里不再判第二次 —— 判两处就是两套判据。
 */

import { readTextLayers, writeTextLayers, createTextLayers } from '../core/ps/text-batch';
import type { TextScope } from '../core/ps/text-batch';
import {
  buildPatches,
  createSizes,
  decodeLayers,
  DEFAULT_CREATE_ALIGN,
  DEFAULT_CREATE_FONT,
  encodeLayers,
  parseCreateLines,
  type TextLayerSnapshot
} from '../domain/text-batch';
import { MSG } from '../types/messages';
import { fail, ok, type Result } from '../types/result';

/**
 * 读的范围：`'all'` = 整个文档，`'selection'` = 点按钮那一刻 PS 的选中集合。
 *
 * 类型定义在 `core/ps/text-batch`，这里**只做 type-only 转出**：`features` 只许 import
 * commands / domain / components，页面零底层；命令层转一次，页面就不必去 import `core`。
 */
export type { TextScope } from '../core/ps/text-batch';

/** 读到的东西：图层快照 + 已经拼好的 textarea 内容（界面直接用） */
export interface TextBatchRead {
  layers: TextLayerSnapshot[];
  draft: string;
}

/** 写回结果：改了几层、几层没写成 */
export interface TextBatchWrite {
  changed: number;
  failed: number;
}

/** 新建结果：建了几层、字体有没有设上 */
export interface TextBatchCreate {
  created: number;
  fontMissing: boolean;
}

/**
 * 读文字层。
 *
 * `scope = 'selection'` 是**点按钮那一刻** PS 的选中集合，非文字层在 jsx 里就过滤掉了；
 * 没选中就是空表 —— 空表不是失败，界面显示空列表即可。
 */
export async function readTexts(scope: TextScope): Promise<Result<TextBatchRead>> {
  const read = await readTextLayers(scope);
  if (read.status === 'error') return read;

  const decoded = decodeLayers(read.value);
  if (decoded.status === 'error') return decoded;

  return ok({ layers: decoded.value, draft: encodeLayers(decoded.value) });
}

/** 写回：只写改动过的层；一层没改就直接成功，不调 jsx */
export async function writeDraft(
  layers: readonly TextLayerSnapshot[],
  draft: string
): Promise<Result<TextBatchWrite>> {
  const patches = buildPatches(layers, draft);
  if (patches.status === 'error') return patches;
  if (!patches.value.length) return ok({ changed: 0, failed: 0 });

  const written = await writeTextLayers(patches.value);
  if (written.status === 'error') return written;

  return ok({
    changed: patches.value.length - written.value.failed,
    failed: written.value.failed
  });
}

/**
 * 新建：每行一层。
 *
 * 字号序列由 `createSizes` 按「首行 = 层级第 1 档、末行 ×0.5」算好一起传下去，
 * jsx 只负责建层和摆放（不重复算第二份公式）。
 */
export async function createTexts(
  raw: string,
  baseSize: number
): Promise<Result<TextBatchCreate>> {
  const lines = parseCreateLines(raw);
  if (!lines.length) return fail('VALIDATION', MSG.textBatch.emptyDraft);

  const sizes = createSizes(lines.length, baseSize);
  if (!sizes.length) return fail('VALIDATION', MSG.textBatch.emptyDraft);

  const created = await createTextLayers({
    lines,
    sizes,
    font: { ...DEFAULT_CREATE_FONT },
    align: DEFAULT_CREATE_ALIGN
  });
  if (created.status === 'error') return created;

  return ok({ created: created.value.ok, fontMissing: created.value.fontMissing });
}
