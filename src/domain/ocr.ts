/**
 * OCR 结果 → 建层指令（画布布局）。零 IO、零异常，全部可单测。
 *
 * 公式出处是原 jsx（`/Users/kevin/Documents/Obsidian vault/Tools/ps_ocr.jsx`）：
 *   `:135` 字号 = 推断字号 × 1.3
 *   `:168` 位置 = `[left, top + 推断字号]`（加的是**未乘 1.3** 的原值，照抄）
 *   `:156` 图层名 = 内容去换行后前 15 字
 *   `:130` 空内容跳过
 *
 * **唯一改动**：`:144` 的 `floor(top / 1500) + 1` 废弃，改按内容空白分段（`GROUP_GAP_RATIO`）。
 * 理由：1500 是「一屏」的假设，与文档实际高度无关 —— 短图里它不起作用，长图最后一组可能只剩一行。
 */

import { GROUP_GAP_RATIO, GROUP_PREFIX, NAME_MAX, SIZE_MULTIPLIER } from '../config';
import type { OcrBlock, OcrGroupSpec, OcrLayerSpec, OcrOffset } from '../types/ocr';

/**
 * 块 → 建层指令。
 *
 * **故意丢 `rect.width` / `rect.height`**：建层只用得到左上角与字号
 * （位置 `top + fontSize`、字号 `fontSize × 1.3`），框宽高在 PS 里由文字自己撑开。
 * 这两个字段在 `OcrBlock` 里仍有用（分组要 `height` 算间距），所以不能在上一步就删。
 *
 * `offset` 是**坐标偏移的唯一加法处**：识别坐标是导出图内的坐标，有选区导出时
 * 图左上角不在文档原点，不加回来整批层会整体错位（jsx 只产出偏移，不做加法）。
 */
function toLayer(block: OcrBlock, offset: OcrOffset): OcrLayerSpec {
  return {
    name: block.content.replace(/[\r\n]/g, ' ').substring(0, NAME_MAX),
    content: block.content,
    left: block.rect.left + offset.left,
    top: block.rect.top + block.fontSize + offset.top,
    size: block.fontSize * SIZE_MULTIPLIER
  };
}

/**
 * 块 → 分组 + 建层指令。
 *
 * 按 `top` 升序扫描；与上一块的垂直间距 `> GROUP_GAP_RATIO × 上一块字号` 时开新组。
 *
 * **这里不判空块**：`core/ocr/blocks.mergeBlocks` 是唯一的过滤点（空行在那里就丢了），
 * 两处都判就是两个判据、且这里的计数永远收不到东西。
 *
 * `offset` **必填不给默认值**：只有 OCR 一个调用方，给默认值等于允许漏传而不报错
 *（`CONVENTIONS` §4.3「必填 → 可选」是放宽，plan 18 §5）。
 */
export function toOcrGroups(
  blocks: readonly OcrBlock[],
  offset: OcrOffset
): { groups: OcrGroupSpec[] } {
  const sorted = [...blocks].sort((a, b) => a.rect.top - b.rect.top);
  const groups: OcrGroupSpec[] = [];
  let layers: OcrLayerSpec[] = [];
  let last: OcrBlock | null = null;

  const flush = (): void => {
    if (!layers.length) return;
    groups.push({ name: `${GROUP_PREFIX}${groups.length + 1}`, layers });
    layers = [];
  };

  for (const block of sorted) {
    if (last) {
      const gap = block.rect.top - (last.rect.top + last.rect.height);
      if (gap > GROUP_GAP_RATIO * last.fontSize) flush();
    }

    layers.push(toLayer(block, offset));
    last = block;
  }

  flush();
  return { groups };
}
