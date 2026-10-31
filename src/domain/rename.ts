/**
 * 【范本】重命名预设（纯函数，零 IO）
 *
 * 是什么：`sj_cmmRename.ini` 的内容形状（**裸数组**，`JSON.stringify(preset)`）+ 全部编辑函数。
 * 唯一入口：`repo/rename-repo`（读写）、`commands/rename`（编排）；页面只拿 store 的投影。
 *
 * **四条硬规则**（都有单测钉住，写在 `rename.test.ts`）：
 *   1. 第 0 组是「最近使用」，由程序写：`isGroupEditable` 一处判，模型层守，不靠 UI 隐藏。
 *   2. 删标记按 `%%nn → %%n → %nn → %n= → %n` 顺序且**全删**（`split().join('')`）——
 *      `%%nn` 里含 `%nn`，顺序反了会残留半截；只删第一处时连点两次也会残留。
 *   3. 导入只替换不追加；结构不对就 `CORRUPT`，不猜别的格式（旧版 `<z>` / `<>` 格式不兼容，不做兜底）。
 *   4. 替换表达式两侧必 trim，任一侧为空 → `VALIDATION`（`a => b` 与 `a=>b` 等价）。
 *
 * **求值不在这里**：`%n` 怎么展开、`###` 拼哪儿全在 PS 侧（`cmm_batchName`），
 * 本文件只负责「删旧标记 + 拼新标记」。猜值的实现一旦写进来，改错名就查不出是谁改的。
 */

import { decodeList, type Dropped } from '../types/decode-list';
import { isRecord } from '../types/guards';
import { parseJson } from '../types/json';
import { MSG } from '../types/messages';
import { fail, failWithDetail, ok, type Result } from '../types/result';
import { applyItemDrop, applyListDrop, type DropMove, type DropPosition } from './reorder';

/** 一个分组：名字 + 展开态 + 预设项（每项就是一条表达式原文） */
export interface RenameGroup {
  name: string;
  show: boolean;
  list: string[];
}

/** 整份预设：裸数组，第 0 组恒为「最近使用」 */
export type RenamePreset = RenameGroup[];

/** 6 个表达式标记，字面量即协议值（原样交给 PS，不许改写） */
export type RenameMark = '%n' | '%nn' | '%%n' | '%%nn' | '%n=' | '###';

/** 第 0 组的固定名：历史由程序写，用户不可改名 / 删除 / 加项 */
export const RECENT_GROUP_NAME = '最近使用';

/** 历史最多留几条（插最前、去重、截断） */
export const HISTORY_LIMIT = 8;

/** 图层颜色标记的色板数量：序号 1..7，`0` = 清除（色值在 `styles/tokens.css`） */
export const LAYER_COLOR_COUNT = 7;

/** 6 个标记的菜单顺序（短的在前）；**删标记顺序另有一张表，别混用** */
export const RENAME_MARKS: readonly RenameMark[] = ['%n', '%nn', '%%n', '%%nn', '%n=', '###'];

/**
 * 删除顺序：**长的先删**。
 *
 * `%%nn` 里含 `%nn`、`%%n` 里含 `%n`，反过来先删短的会把长的删成半截（`%%nn` → `%n`）；
 * `%n=` 必须先于 `%n`，否则 `%n=` 被删成 `=`。
 */
const CLEAR_ORDER = ['%%nn', '%%n', '%nn', '%n=', '%n', '###'] as const;

/* ---------------- 表达式 ---------------- */

/** 删掉文本里**所有**旧标记（全删，不是只删第一处） */
export function clearMarks(text: string): string {
  return CLEAR_ORDER.reduce((current, mark) => current.split(mark).join(''), text);
}

/** 把标记拼进表达式：先清空旧标记，再追加新的（原版行为，连点两次不残留） */
export function insertMark(current: string, mark: RenameMark): string {
  return `${clearMarks(current)}${mark}`;
}

/** 表达式校验：空串 = 通过，否则返回提示文案（纯空白也算空） */
export function checkExpression(text: string): string {
  return text.trim() ? '' : MSG.rename.expressionEmpty;
}

/** 替换模式拼表达式：`原文=>新文字`，两侧 trim；任一侧为空 → `VALIDATION` */
export function buildReplaceExpression(replace: string, newtext: string): Result<string> {
  const from = replace.trim();
  const to = newtext.trim();
  if (!from || !to) return fail('VALIDATION', MSG.rename.needReplaceBoth);
  return ok(`${from}=>${to}`);
}

/** 图层颜色序号是否合法（`0` = 清除，`1..7` = 七色） */
export function isLayerColorIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index <= LAYER_COLOR_COUNT;
}

/* ---------------- 分组 / 预设项的编辑 ---------------- */

/** 第 0 组（最近使用）不可改名 / 删除 / 加项：**模型层唯一判据**，UI 隐藏入口只是礼貌 */
export function isGroupEditable(index: number, length: number): boolean {
  return index >= 1 && index < length;
}

function guardGroup(index: number, length: number): Result<never> | null {
  if (Number.isInteger(index) && index >= 0 && index < length) return null;
  return failWithDetail('VALIDATION', MSG.stale, `group:${index}/${length}`);
}

function guardEditable(index: number, length: number): Result<never> | null {
  if (isGroupEditable(index, length)) return null;
  if (Number.isInteger(index) && index >= 0 && index < length) {
    return failWithDetail('VALIDATION', MSG.rename.groupLocked, `group:${index}`);
  }
  return failWithDetail('VALIDATION', MSG.stale, `group:${index}/${length}`);
}

function replaceGroup(preset: RenamePreset, index: number, next: RenameGroup): RenamePreset {
  return preset.map((group, at) => (at === index ? next : group));
}

/** 折叠 / 展开一个分组（第 0 组也能折叠，只有改名 / 删除 / 加项被禁） */
export function toggleGroupAt(preset: RenamePreset, index: number): Result<RenamePreset> {
  const invalid = guardGroup(index, preset.length);
  if (invalid) return invalid;

  const group = preset[index];
  if (!group) return failWithDetail('VALIDATION', MSG.stale, `group:${index}`);
  return ok(replaceGroup(preset, index, { ...group, show: !group.show }));
}

/**
 * 在 `afterIndex` 之后插入新组（不传 = 追加到末尾）。
 *
 * 新组永远排在第 0 组之后：`afterIndex: 0` 时插到 1，不会抢走「最近使用」的位置。
 */
export function addGroupAt(
  preset: RenamePreset,
  name: string,
  afterIndex?: number
): Result<RenamePreset> {
  const text = name.trim();
  if (!text) return fail('VALIDATION', MSG.rename.needGroupName);

  const requested = afterIndex === undefined ? preset.length : afterIndex + 1;
  const at = Math.min(Math.max(requested, 1), preset.length);
  const next = preset.slice();
  next.splice(at, 0, { name: text, show: true, list: [] });
  return ok(next);
}

/** 重命名分组：**不查重**（原版也不查） */
export function renameGroupAt(
  preset: RenamePreset,
  index: number,
  name: string
): Result<RenamePreset> {
  const invalid = guardEditable(index, preset.length);
  if (invalid) return invalid;

  const text = name.trim();
  if (!text) return fail('VALIDATION', MSG.rename.needGroupName);

  const group = preset[index];
  if (!group) return failWithDetail('VALIDATION', MSG.stale, `group:${index}`);
  return ok(replaceGroup(preset, index, { ...group, name: text }));
}

/** 删除分组：第 0 组不可删，所以删完至少还剩一组 */
export function deleteGroupAt(preset: RenamePreset, index: number): Result<RenamePreset> {
  const invalid = guardEditable(index, preset.length);
  if (invalid) return invalid;

  return ok(preset.filter((_, at) => at !== index));
}

/** 组内追加一条预设；第 0 组（历史）由程序写，接口层就拦掉 */
export function addItemAt(
  preset: RenamePreset,
  groupIndex: number,
  text: string
): Result<RenamePreset> {
  const invalid = guardEditable(groupIndex, preset.length);
  if (invalid) return invalid;

  const value = text.trim();
  if (!value) return fail('VALIDATION', MSG.rename.needPresetText);

  const group = preset[groupIndex];
  if (!group) return failWithDetail('VALIDATION', MSG.stale, `group:${groupIndex}`);
  return ok(replaceGroup(preset, groupIndex, { ...group, list: [...group.list, value] }));
}

/** 改一条预设的文本 */
export function changeItemAt(
  preset: RenamePreset,
  groupIndex: number,
  itemIndex: number,
  text: string
): Result<RenamePreset> {
  const invalid = guardEditable(groupIndex, preset.length);
  if (invalid) return invalid;

  const value = text.trim();
  if (!value) return fail('VALIDATION', MSG.rename.needPresetText);

  const group = preset[groupIndex];
  if (!group || group.list[itemIndex] === undefined) {
    return failWithDetail('VALIDATION', MSG.stale, `group:${groupIndex} item:${itemIndex}`);
  }
  return ok(
    replaceGroup(preset, groupIndex, {
      ...group,
      list: group.list.map((item, at) => (at === itemIndex ? value : item))
    })
  );
}

/** 删一条预设 */
export function deleteItemAt(
  preset: RenamePreset,
  groupIndex: number,
  itemIndex: number
): Result<RenamePreset> {
  const invalid = guardEditable(groupIndex, preset.length);
  if (invalid) return invalid;

  const group = preset[groupIndex];
  if (!group || group.list[itemIndex] === undefined) {
    return failWithDetail('VALIDATION', MSG.stale, `group:${groupIndex} item:${itemIndex}`);
  }
  return ok(
    replaceGroup(preset, groupIndex, {
      ...group,
      list: group.list.filter((_, at) => at !== itemIndex)
    })
  );
}

/**
 * 把一条表达式写进「最近使用」：去重 → 插最前 → 截到 8 条。
 *
 * 空表达式不写（与「不调 jsx」同一判据：那一批什么都没发生）；
 * 第 0 组缺失时补一个，历史永远是组 0。
 */
export function pushHistory(preset: RenamePreset, expression: string): RenamePreset {
  const text = expression.trim();
  if (!text) return preset;

  const recent = preset[0];
  const list = [text, ...(recent?.list ?? []).filter((item) => item !== text)].slice(0, HISTORY_LIMIT);
  return [{ name: RECENT_GROUP_NAME, show: recent?.show ?? false, list }, ...preset.slice(1)];
}

/** 分组排序：落点计算交给 `domain/reorder`，这里只守「第 0 组不参与」 */
export function withGroupMoved(
  preset: RenamePreset,
  from: number,
  to: number,
  position: DropPosition
): Result<RenamePreset> {
  const invalid =
    guardEditable(from, preset.length) ?? guardEditable(to, preset.length);
  if (invalid) return invalid;

  const next = preset.slice();
  applyListDrop(next, from, to, position);
  return ok(next);
}

/**
 * 预设项排序（可跨组）：源组与目标组都必须是可编辑组。
 *
 * 历史（第 0 组）由程序按执行顺序写，拖它没有意义，所以两侧都拦。
 * 下标先判再调 `applyItemDrop`——它越界是抛错，那是代码 bug 的信号，不该被兜住。
 */
export function withItemMoved(preset: RenamePreset, move: DropMove): Result<RenamePreset> {
  const source = preset[move.from.group];
  const target = preset[move.to.group];
  if (!source || !target) {
    return failWithDetail('VALIDATION', MSG.stale, `move:${move.from.group}->${move.to.group}`);
  }

  const invalid =
    guardEditable(move.from.group, preset.length) ?? guardEditable(move.to.group, preset.length);
  if (invalid) return invalid;

  if (move.from.index >= source.list.length || move.to.index >= target.list.length) {
    return failWithDetail(
      'VALIDATION',
      MSG.stale,
      `move:${move.from.index}/${source.list.length} ${move.to.index}/${target.list.length}`
    );
  }

  const lists = preset.map((group) => group.list.slice());
  applyItemDrop(lists, move);
  return ok(preset.map((group, at) => ({ ...group, list: lists[at] ?? [] })));
}

/* ---------------- 文件边界 ---------------- */

/** 解码结果：预设本体 + 读的时候跳掉了哪些项（页面显示「N 项无法识别」） */
export interface RenamePresetRead {
  preset: RenamePreset;
  dropped: Dropped[];
}

function decodePresetItem(value: unknown, path: string): Result<string> {
  if (typeof value !== 'string' || !value.trim()) return failWithDetail('CORRUPT', MSG.corrupt, path);
  return ok(value);
}

function decodeGroup(value: unknown, path: string, dropped: Dropped[]): Result<RenameGroup> {
  if (!isRecord(value)) return failWithDetail('CORRUPT', MSG.corrupt, path);

  const { name, show, list } = value;
  if (typeof name !== 'string' || !name.trim()) {
    return failWithDetail('CORRUPT', MSG.corrupt, `${path}.name`);
  }
  if (typeof show !== 'boolean') return failWithDetail('CORRUPT', MSG.corrupt, `${path}.show`);

  /* 组里没有 `list` = 空组，不算坏；有但不是数组 = 这个组整体认不出（由 `decodeList` 折成该项的失败） */
  if (list === undefined || list === null) return ok({ name, show, list: [] });

  const items = decodeList(list, decodePresetItem, 'filter', `${path}.list`);
  if (items.status === 'error') return items;

  dropped.push(...items.value.dropped);
  return ok({ name, show, list: items.value.items });
}

/** 第 0 组恒为「最近使用」：文件里没有就补一个空的（历史靠组 0 写） */
function withRecentGroup(groups: RenameGroup[]): RenamePreset {
  if (groups[0]?.name === RECENT_GROUP_NAME) return groups;
  return [{ name: RECENT_GROUP_NAME, show: false, list: [] }, ...groups];
}

/**
 * 文件边界解码：顶层必须是数组，组坏跳过（`filter`），项坏也跳过并记账。
 *
 * 判据（`CONVENTIONS` §1.2）：跳过这一组，剩下的组还能各就各位 —— 组是有序的整体，
 * 少一组不影响其余组的名字与顺序，所以用 `filter` 而不是让一个坏组废掉整页。
 */
export function decodeRenamePreset(raw: unknown): Result<RenamePresetRead> {
  const dropped: Dropped[] = [];

  const groups = decodeList(raw, (value, path) => decodeGroup(value, path, dropped), 'filter', 'preset');
  if (groups.status === 'error') return groups;

  dropped.push(...groups.value.dropped);
  return ok({ preset: withRecentGroup(groups.value.items), dropped });
}

/** 文本 → 预设（`.cmm` 与库文件同一套：只有 JSON 一种格式，没有旧格式分支） */
export function parsePreset(text: string): Result<RenamePresetRead> {
  const parsed = parseJson(text, '重命名预设');
  if (parsed.status === 'error') return parsed;
  return decodeRenamePreset(parsed.value);
}

/** 预设 → 文件文本：**裸数组**，照原版 `JSON.stringify(preset)` */
export function serializePreset(preset: RenamePreset): string {
  return JSON.stringify(preset);
}

/**
 * 种子预设：两组（最近使用 7 条 / 序列 4 条，两组都展开）。
 *
 * **逐字取自原版截图** `docs/原版/Screenshot - 2026-10-30 11.33.43.png`（第一屏就是这个状态），
 * 不是编的：改文案前先看那张图，改完把图一起更新。
 */
export function seedPreset(): RenamePreset {
  return [
    {
      name: RECENT_GROUP_NAME,
      show: true,
      list: ['%n', '图片%nn', '演示%n=5', '%nn', '批量改名演示', '演示%n', '倒放演示%%n']
    },
    { name: '序列', show: true, list: ['%n', '%%n', '%n###', '%%n###'] }
  ];
}
