/**
 * 行级框 → 文字块：字号推断 + 段落合并。
 *
 * **逐字移植** `docs/参考/ocr-image-to-text.py`（RapidOCR 原型脚本）的两个函数，
 * 因为换了识别引擎后这两步没人替我们做了：
 *   `:95-100` 字号推断   → `inferFontSize`
 *   `:45-75`  段落合并   → `mergeBlocks`
 *
 * 系数都在 `src/config.ts`（想调排版只改那一个文件），本文件只放算法。
 *
 * 与原脚本的两处差异（都是刻意改的）：
 *   1. **空内容的行在合并前就被丢掉**。原脚本遇不到空行；云 OCR 会返回空串，
 *      留着会让 `charCount` 落到 1、算出天文数字的字号。
 *   2. **字号相差太多的两块不合并**（`SIZE_TOLERANCE_RATIO`）。原脚本只判间距与左边界，
 *      结果「大标题 + 紧跟的正文」被并成一段、整段按标题字号放大。
 */

import {
  MIN_FONT_SIZE,
  SIZE_BY_HEIGHT,
  SIZE_BY_WIDTH,
  SIZE_TOLERANCE_RATIO,
  X_TOLERANCE,
  Y_TOLERANCE_RATIO
} from '../../config';
import type { OcrBlock, OcrLine } from '../../types/ocr';

/**
 * 按「平均字宽 0.7 + 框高 0.3」估字号，向上取偶数、最小 12（py `:95-100`）。
 *
 * 取偶数是原脚本的做法：字号步进按 2 走，PS 里视觉上更稳。
 */
export function inferFontSize(width: number, height: number, charCount: number): number {
  const count = Math.max(charCount, 1);
  const byWidth = width / count;
  const raw = Math.trunc(byWidth * SIZE_BY_WIDTH + height * SIZE_BY_HEIGHT);
  return Math.max(Math.ceil(raw / 2) * 2, MIN_FONT_SIZE);
}

/**
 * 按 `top` 升序把相邻行并成段（py `:45-75` + 一条字号接近判据）。
 *
 * 三个条件同时满足才合并：垂直间距够小、左边界对齐、**两块字号接近**。
 * 合并后：`content` 用 `\r` 连接、`rect` 取并集（`left` 取 min、`top` 保持第一行、
 * 右边界取 max、底边取最后一行底），**字号沿用第一行不重算**（重算会把整段当一行，字号偏大）。
 */
export function mergeBlocks(lines: readonly OcrLine[]): OcrBlock[] {
  const blocks: OcrBlock[] = [];
  for (const line of lines) {
    if (!line.content.trim()) continue;
    blocks.push({
      content: line.content,
      rect: { left: line.left, top: line.top, width: line.width, height: line.height },
      fontSize: inferFontSize(line.width, line.height, line.content.replace(/ /g, '').length)
    });
  }

  blocks.sort((a, b) => a.rect.top - b.rect.top);

  const merged: OcrBlock[] = [];
  let current: OcrBlock | null = null;

  for (const next of blocks) {
    if (!current) {
      current = next;
      continue;
    }

    const verticalGap = next.rect.top - (current.rect.top + current.rect.height);
    const aligned = Math.abs(current.rect.left - next.rect.left) < X_TOLERANCE;
    /* 字号相对差：42 vs 24 = 0.43 > 0.3 → 标题与正文不合并 */
    const sizeClose =
      Math.abs(current.fontSize - next.fontSize) / Math.max(current.fontSize, next.fontSize) <
      SIZE_TOLERANCE_RATIO;

    if (verticalGap < current.fontSize * Y_TOLERANCE_RATIO && aligned && sizeClose) {
      const left = Math.min(current.rect.left, next.rect.left);
      const right = Math.max(
        current.rect.left + current.rect.width,
        next.rect.left + next.rect.width
      );
      const bottom = next.rect.top + next.rect.height;
      current = {
        content: `${current.content}\r${next.content}`,
        rect: {
          left,
          top: current.rect.top,
          width: right - left,
          height: bottom - current.rect.top
        },
        fontSize: current.fontSize
      };
    } else {
      merged.push(current);
      current = next;
    }
  }

  if (current) merged.push(current);
  return merged;
}
