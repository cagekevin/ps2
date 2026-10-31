/**
 * 重命名页命令层（`06` §3.6 的 13 条）
 *
 * 三条硬规则（`CONVENTIONS` §9）：不碰 DOM、不弹 toast / 对话框、只返回 `Result<T>`。
 * 路径由页面用 `core/dialog` 选完再传，命令层不弹对话框。
 *
 * 重读口径（`06` §3.8）：预设类与 `batchName` 成功后 `store.load()`；
 * `setLayerColor` **不重读**（只改 PS 画面，不动预设文件）。
 *
 * `batchName` 的顺序是**先写历史、再执行**（参考实现 `commands/rename.ts:48-50`）：
 * jsx 失败也留历史，与原版一致。历史写不进去就不执行——那时文件已经坏了，
 * 继续改图层只会让用户更困惑（失败可见，不静默）。
 */

import { savePref } from '../core/prefs';
import { batchName as batchNameJsx, setLayerColor as setLayerColorJsx } from '../core/ps/rename';
import {
  addGroupAt,
  addItemAt,
  changeItemAt,
  checkExpression,
  deleteGroupAt,
  deleteItemAt,
  isLayerColorIndex,
  parsePreset,
  pushHistory,
  renameGroupAt,
  serializePreset,
  toggleGroupAt,
  withGroupMoved,
  withItemMoved,
  type RenamePreset
} from '../domain/rename';
import type { DropPosition } from '../domain/reorder';
import { readArchive, readPreset, replacePreset, updatePreset, writeArchive } from '../repo/rename-repo';
import { RENAME_PREF_KEYS, useRenameStore, type RenameMode } from '../store/rename';
import { MSG } from '../types/messages';
import { fail, failWithDetail, ok, type Result } from '../types/result';

function reload(): void {
  useRenameStore.getState().load();
}

/** 写预设 + 成功后重读（失败原样上抛，不做乐观更新） */
async function commit(
  mutator: (preset: RenamePreset) => Result<RenamePreset | null>
): Promise<Result<void>> {
  const result = await updatePreset(mutator);
  if (result.status === 'ok') reload();
  return result;
}

/* ---------------- PS（2） ---------------- */

/** 批量重命名：先校验表达式，再写历史，最后才发 jsx */
export async function batchName(options: {
  expression: string;
  filterChildren: boolean;
}): Promise<Result<void>> {
  const invalid = checkExpression(options.expression);
  if (invalid) return fail('VALIDATION', invalid);

  const history = await commit((preset) => ok(pushHistory(preset, options.expression)));
  if (history.status === 'error') return history;

  return batchNameJsx(options.expression, options.filterChildren);
}

/** 图层颜色标记：`0` = 清除，`1..7` = 七色 */
export function setLayerColor(colorIndex: number): Promise<Result<void>> {
  if (!isLayerColorIndex(colorIndex)) {
    return Promise.resolve(failWithDetail('VALIDATION', MSG.stale, `color:${colorIndex}`));
  }
  return setLayerColorJsx(colorIndex);
}

/* ---------------- 预设：分组与项（9） ---------------- */

export function toggleGroup(index: number): Promise<Result<void>> {
  return commit((preset) => toggleGroupAt(preset, index));
}

export function addGroup(name: string, afterIndex?: number): Promise<Result<void>> {
  return commit((preset) => addGroupAt(preset, name, afterIndex));
}

export function renameGroup(index: number, name: string): Promise<Result<void>> {
  return commit((preset) => renameGroupAt(preset, index, name));
}

export function deleteGroup(index: number): Promise<Result<void>> {
  return commit((preset) => deleteGroupAt(preset, index));
}

export function addItem(groupIndex: number, text: string): Promise<Result<void>> {
  return commit((preset) => addItemAt(preset, groupIndex, text));
}

export function changeItem(groupIndex: number, itemIndex: number, text: string): Promise<Result<void>> {
  return commit((preset) => changeItemAt(preset, groupIndex, itemIndex, text));
}

export function deleteItem(groupIndex: number, itemIndex: number): Promise<Result<void>> {
  return commit((preset) => deleteItemAt(preset, groupIndex, itemIndex));
}

export function reorderGroup(from: number, to: number, position: DropPosition): Promise<Result<void>> {
  return commit((preset) => withGroupMoved(preset, from, to, position));
}

export function reorderItem(
  fromGroup: number,
  fromIndex: number,
  toGroup: number,
  toIndex: number,
  position: DropPosition
): Promise<Result<void>> {
  return commit((preset) =>
    withItemMoved(preset, {
      from: { group: fromGroup, index: fromIndex },
      to: { group: toGroup, index: toIndex },
      position
    })
  );
}

/* ---------------- 界面偏好（2）：本页偏好的唯一落盘入口 ---------------- */

/**
 * 换模式：本地状态 + `prefs.json`。
 *
 * 与 `commands/action.setListColumns` 同形——store 只改内存、命令负责落盘，
 * 页面**不碰 `core/prefs`**（页面零底层）。偏好丢了最多回到默认模式，不阻断业务。
 */
export async function setMode(mode: RenameMode): Promise<Result<void>> {
  useRenameStore.getState().setMode(mode);
  await savePref(RENAME_PREF_KEYS.mode, mode);
  return ok(undefined);
}

/** 展开 / 收起「图层颜色标记」区（同上） */
export async function setColorSignOpen(open: boolean): Promise<Result<void>> {
  useRenameStore.getState().setColorSignOpen(open);
  await savePref(RENAME_PREF_KEYS.colorSign, open);
  return ok(undefined);
}

/* ---------------- 导入导出（2） ---------------- */

/**
 * 导出 `.cmm`：内容取**磁盘真身**（`readPreset`），不是 store 投影——
 * 投影可能是上一次读的结果，导出一份过期预设比导出失败更难查。
 */
export async function exportPreset(path: string): Promise<Result<string>> {
  const current = readPreset();
  if (current.status === 'error') return current;

  const written = await writeArchive(path, serializePreset(current.value.preset));
  if (written.status === 'error') return written;
  return ok(path);
}

/**
 * 导入 `.cmm`：**整体替换**（不是追加，参考实现就是这么做的）。
 *
 * 任何一步失败都不写文件：读不出来 → `IO_ERROR`；不是合法预设 → `CORRUPT`；
 * 只有「解析 + 校验」都过了才覆盖（原版直接赋值，坏文件会白屏）。
 */
export async function importPreset(path: string): Promise<Result<void>> {
  const text = readArchive(path);
  if (text.status === 'error') return text;

  const parsed = parsePreset(text.value);
  if (parsed.status === 'error') return parsed;

  const replaced = await replacePreset(parsed.value.preset);
  if (replaced.status === 'error') return replaced;

  reload();
  return ok(undefined);
}
