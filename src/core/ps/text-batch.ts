/**
 * 批量文字（新建 / 改字）的 PS 能力：三个自写 jsx（`jsx/main.jsx` 的 `mm_text_*`）。
 *
 * 通道：全部直调（`gate: 'core'` 只允许 `direct`），撤销组在 jsx 里用 `suspendHistory` 自己包
 * —— `core/ps` 的 TS 侧不写它（`docs/JSX-通道与自写指南.md` §7.5）。
 *
 * 三条边界：
 *   1. **不 import `domain`**：这里只把 jsx 的返回拆到「结构可信」为止，业务形状（快照、patch）
 *      由 `domain/text-batch` 解码。
 *   2. 解析器在同目录的 `text-batch-raw.ts`（**不能写进本文件**：本文件 import 能力表，
 *      能力表要用解析器，放一起就是运行时环）。
 *   3. 批量在 jsx 内循环，一次 `evalScript`；前端不许按层循环调用。
 *
 * **待核实**：三个 `mm_text_*` 的运行时行为没有真机验证过（写代码的机器上没装 PS），
 * 清单与判据在 `docs/plan/04-批量改字-2026-10-27.md` §6.2。验证之前不要在任何地方
 * 声称它们「已验证」。
 */

import type { Result } from '../../types/result';
import { ok } from '../../types/result';
import { callCapability } from './capability';
import { CAP } from './capabilities';
import type { TextCreateReport, TextWriteReport } from './text-batch-raw';
import type { OcrGroupSpec } from '../../types/ocr';

/** 读的范围：整个文档 / 点击那一刻的选中集合 */
export type TextScope = 'all' | 'selection';

/** 写回的一条（与 `domain/text-batch` 的 `Patch` 同形，跨层靠结构兼容，不互相 import） */
export interface TextPatch {
  id: string;
  text: string;
}

/** 新建一层的入参；`sizes` 由 `domain/text-batch.createSizes` 算好，jsx 不再算第二份公式 */
export interface TextCreateConfig {
  /** 缺省 = 纵向堆叠（写不写都行）；`'absolute'` 是另一支，见 `OcrCreateConfig` */
  mode?: 'stack';
  lines: string[];
  sizes: number[];
  /* 只有 `hjm`：jsx 的 `mm_text_newLayer` 只读这一个（`cfg.font && cfg.font.hjm`），
     另两个字段从没有消费者 —— 同一件事不留两种形状 */
  font: { hjm: string };
  align: 0 | 1 | 2;
}

/**
 * OCR 那一支的入参：位置与分组由 `domain/ocr` 算好，画布绝对坐标（px）。
 *
 * 与 `TextCreateConfig` 是**同一个入口的两种形状**（判别位 `mode`），不是两个函数：
 * 建层动作（add / kind / contents / font / fontMissing）在 jsx 的 `mm_text_newLayer` 一处。
 */
export interface OcrCreateConfig {
  mode: 'absolute';
  /** 承载全部层的组名 */
  master: string;
  /** 与「新建」同一个字体来源（`DEFAULT_CREATE_FONT`），jsx 不写字体名 */
  font: { hjm: string };
  groups: OcrGroupSpec[];
}

/** 读全部 / 选中文字层：返回**还没解码**的数组，逐项形状交给 domain */
export function readTextLayers(scope: TextScope): Promise<Result<unknown[]>> {
  return callCapability(CAP.textReadAll, [scope]);
}

/** 批量写回：只传改动过的层；空数组在前端就拦掉，这里再兜一次（不调 jsx） */
export function writeTextLayers(patches: readonly TextPatch[]): Promise<Result<TextWriteReport>> {
  if (!patches.length) return Promise.resolve(ok({ ok: 0, failed: 0 }));
  return callCapability(CAP.textWriteAll, [patches]);
}

/**
 * 建文字层的**唯一入口**（批量文字新建 / OCR 共用）。
 *
 * 两种入参靠 `mode` 分（缺省 = 纵向堆叠）；空入参在前端就拦掉，不白跑一次 jsx。
 */
export function createTextLayers(
  config: TextCreateConfig | OcrCreateConfig
): Promise<Result<TextCreateReport>> {
  if (config.mode === 'absolute') {
    if (!config.groups.length) return Promise.resolve(ok({ ok: 0, fontMissing: false }));
    return callCapability(CAP.textCreateAll, [config]);
  }
  if (!config.lines.length) return Promise.resolve(ok({ ok: 0, fontMissing: false }));
  return callCapability(CAP.textCreateAll, [config]);
}
