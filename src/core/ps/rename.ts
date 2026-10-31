/**
 * 【范本】PS 重命名（重命名页 `06` 用）
 *
 * 两条 jsx，都**直调**、都**只发不读**（返回结构未实测）：
 *   - `batchName`    → `cmm_batchName([表达式, 是否过滤子图层])`
 *   - `setLayerColor` → `cmm_setLayerColor([0..7])`，0 = 清除
 *
 * **求值不在这里、也不在 `domain`**：`%n` 变什么、`###` 拼哪儿由 PS 侧决定，
 * 我们只负责「删旧标记 + 拼新标记」（`domain/rename.ts`）。猜错一个字符就是整批图层改错名。
 *
 * 两条都作用于**当前选中图层**；「没选中时到底返回 `-1`、抛错还是静默 no-op」未知，
 * 所以能力表里先不写 `require`。真机看到静默 no-op 再补（与文字属性那批同一判据）。
 */

import { callCapability } from './capability';
import { CAP } from './capabilities';
import type { Result } from '../../types/result';

/** 批量重命名：表达式原文交给 jsx，是否连带处理子图层由调用方给 */
export function batchName(expression: string, filterChildren: boolean): Promise<Result<void>> {
  return callCapability(CAP.batchName, [expression, filterChildren]);
}

/** 给选中图层打颜色标记；`0` = 清除 */
export function setLayerColor(index: number): Promise<Result<void>> {
  return callCapability(CAP.setLayerColor, [index]);
}
