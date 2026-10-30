/**
 * 动作页命令层（`05` §3.6 的 19 条 + 1 条计划漏写的读取命令）
 *
 * 三条硬规则（`CONVENTIONS` §9）：不碰 DOM、不弹 toast / 对话框、只返回 `Result<T>`。
 * 写盘成功一律重读 store（数据类）；`call` 不重读（改的是 PS 画面，不是库）。
 *
 * **计划外的第 20 条**：`listPsActions()`。§3.6 只列了 `addFromPs(groupIndex, items)`，
 * 但「从 PS 添加」弹窗必须先拿到 PS 的动作列表，而计划没给这条读命令 ——
 * 缺了它页面就只能自己 import `core/ps`（违反页面零底层）。故补一条只读命令，
 * 并已写进 `05` §3.6 的变更记录。
 */

import { getPref, savePref } from '../core/prefs';
import { decodeBase64, encodeBase64 } from '../core/cep/base64';
import { callAction as callActionJsx, getActionList } from '../core/ps/action';
import { decodeDzx, encodeDzx, planImportFiles } from '../domain/action-dzx';
import {
  mapPsActions,
  withGroupAdded,
  withGroupRemoved,
  withGroupRenamed,
  withGroupToggled,
  withItemAdded,
  withItemAlias,
  withItemAliasRemoved,
  withItemRemoved,
  withGroupsMoved,
  withItemsMoved,
  type ActionGroup,
  type ActionItem
} from '../domain/action-library';
import { MSG } from '../types/messages';
import type { DropPosition } from '../domain/reorder';
import {
  createWarehouse,
  deleteWarehouse as deleteWarehouseFile,
  readArchive,
  readIndex,
  readPreset,
  readWarehouseText,
  updateIndex,
  writeWarehouseFile,
  updateLibrary,
  writeArchive
} from '../repo/action-repo';
import { useActionStore, type ActionColumns } from '../store/action';
import { parseJson } from '../types/json';
import { fail, failWithDetail, ok, type Result } from '../types/result';

/* ---------------- 内部 ---------------- */

function reload(): void {
  useActionStore.getState().load();
}

/** 写仓库文件 + 成功后重读（失败原样上抛，不做乐观更新） */
async function commit(mutator: (groups: ActionGroup[]) => Result<ActionGroup[] | null>) {
  const result = await updateLibrary(mutator);
  if (result.status === 'ok') reload();
  return result;
}

/** 写索引 + 成功后重读（索引与仓库文件是两个来源，两个都要重读） */
async function commitIndex(mutator: Parameters<typeof updateIndex>[0]) {
  const result = await updateIndex(mutator);
  if (result.status === 'ok') reload();
  return result;
}

/* ---------------- 执行 / 读取（2） ---------------- */

/** 执行一个动作：传**整个 item**（`group` 决定执行哪个组，`alias` 只在显示用） */
export function call(item: ActionItem): Promise<Result<void>> {
  return callActionJsx(item);
}

/** 读 PS 动作面板的分组与动作（给「从 PS 添加」弹窗用）；形状归一在 domain */
export async function listPsActions(): Promise<Result<ActionItem[]>> {
  const raw = await getActionList();
  if (raw.status === 'error') return raw;
  return mapPsActions(raw.value);
}

/* ---------------- 首次引导（2） ---------------- */

/**
 * 是否该问「导入自带预设」。
 *
 * 判据放命令层而不是页面：这是**偏好 + 业务判断**（`action.guideDone` 与「库是不是空的」），
 * 页面只拿布尔，不 import `core/prefs`（`05` §3.10 F2 / `CONVENTIONS` §3.1.8 页面零底层）。
 */
export function canAskGuide(): boolean {
  const done = getPref<unknown>('action.guideDone', false);
  if (done === true) return false;

  const groups = useActionStore.getState().groups;
  return !groups.some((group) => group.list.length > 0);
}

/**
 * 记「问过了」——**点取消也算**（否则每次进页面都弹，`05` §3.10 F2）。
 * 写失败只记日志：偏好丢了最多再弹一次，不影响业务。
 */
export async function markGuideDone(): Promise<Result<void>> {
  await savePref('action.guideDone', true);
  return ok(undefined);
}

/* ---------------- 分组（5） ---------------- */

export function toggleGroup(index: number, show: boolean): Promise<Result<void>> {
  return commit((groups) => withGroupToggled(groups, index, show));
}

/** 新增分组：**不查重**（官方也不查） */
export function addGroup(name: string, afterIndex?: number): Promise<Result<void>> {
  const text = name.trim();
  if (!text) return Promise.resolve(fail('VALIDATION', MSG.action.needGroupName));
  return commit((groups) => ok(withGroupAdded(groups, text, afterIndex)));
}

/** 重命名分组：**不查重**（`05` §4.8 第 1 条） */
export function renameGroup(index: number, name: string): Promise<Result<void>> {
  const text = name.trim();
  if (!text) return Promise.resolve(fail('VALIDATION', MSG.action.needGroupName));
  return commit((groups) => withGroupRenamed(groups, index, text));
}

/** 删分组：删到空自动补「默认分组」（官方 bug 修正，偏离 A-2） */
export function deleteGroup(index: number): Promise<Result<void>> {
  return commit((groups) => withGroupRemoved(groups, index));
}

/* ---------------- 动作（3） ---------------- */

export function deleteItem(groupIndex: number, itemIndex: number): Promise<Result<void>> {
  return commit((groups) => withItemRemoved(groups, groupIndex, itemIndex));
}

/** 设别名：空串 = 删别名（`05` §3.10 F1） */
export function setAlias(groupIndex: number, itemIndex: number, alias: string): Promise<Result<void>> {
  return commit((groups) => withItemAlias(groups, groupIndex, itemIndex, alias));
}

export function deleteAlias(groupIndex: number, itemIndex: number): Promise<Result<void>> {
  return commit((groups) => withItemAliasRemoved(groups, groupIndex, itemIndex));
}

/** 从 PS 添加：**不去重**（官方直接 push）；返回本次新增条数供页面拼「成功添加 N 个」 */
export async function addFromPs(
  groupIndex: number,
  items: ActionItem[]
): Promise<Result<number>> {
  if (!items.length) return fail('VALIDATION', MSG.action.emptyGroup);
  const result = await commit((groups) => withItemAdded(groups, groupIndex, items));
  if (result.status === 'error') return result;
  return ok(items.length);
}

/* ---------------- 排序（2） ---------------- */

export function reorderGroup(
  from: number,
  to: number,
  position: DropPosition
): Promise<Result<void>> {
  return commit((groups) => withGroupsMoved(groups, from, to, position));
}

/** 组内与跨组同一个命令（组内 `fromGroup === toGroup`） */
export function reorderItem(
  fromGroup: number,
  fromIndex: number,
  toGroup: number,
  toIndex: number,
  position: DropPosition
): Promise<Result<void>> {
  return commit((groups) =>
    withItemsMoved(groups, fromGroup, fromIndex, toGroup, toIndex, position)
  );
}

/* ---------------- 仓库（4） ---------------- */

/** 新建仓库：**不切换**当前仓库（官方同款） */
export async function addWarehouse(): Promise<Result<void>> {
  const result = await createWarehouse();
  if (result.status === 'ok') reload();
  return result;
}

/** 重命名仓库：只改 `name`，**不动 `fileName`** */
export function renameWarehouse(index: number, name: string): Promise<Result<void>> {
  const text = name.trim();
  /* 官方这句是「请输入新组名」，与新建分组的「请输入组名」不是同一句（`05` §4.6） */
  if (!text) return Promise.resolve(fail('VALIDATION', MSG.action.needNewGroupName));

  return commitIndex((current) => {
    if (!current.list[index]) return failWithDetail('VALIDATION', MSG.stale, `at:${index}`);
    return ok({
      index: current.index,
      list: current.list.map((entry, at) => (at === index ? { ...entry, name: text } : entry))
    });
  });
}

/** 删仓库：至少留一个；删当前项回 0（提示文案「最少保留一个分组哦」照抄官方） */
export async function deleteWarehouse(index: number): Promise<Result<void>> {
  const result = await deleteWarehouseFile(index);
  if (result.status === 'ok') reload();
  return result;
}

/** 切仓库：越界归 0 **不报错**（官方同款）；先改索引再读文件 */
export function selectWarehouse(index: number): Promise<Result<void>> {
  return commitIndex((current) => {
    if (!current.list.length) return failWithDetail('VALIDATION', MSG.corrupt, 'index:empty');
    const next = index >= 0 && index < current.list.length ? index : 0;
    if (next === current.index) return ok(null);
    return ok({ index: next, list: current.list });
  });
}

/* ---------------- 参数（1） ---------------- */

/** 列数：只写本地偏好，**不重读文件**（`05` §3.10 D） */
export async function setListColumns(columns: ActionColumns): Promise<Result<void>> {
  useActionStore.getState().setColumns(columns);
  /* 偏好丢了不影响业务：记日志、不抛（与折叠态同一策略） */
  await savePref('action.listColumns', columns);
  return ok(undefined);
}

/* ---------------- 导入导出（3） ---------------- */

/**
 * 导出 `.dzx`：`current` 只导当前仓库，否则导全部。
 *
 * 内容取**原文**（`readWarehouseText`），不 `JSON.stringify` 重排——否则回导时与用户原文件不一致。
 * 返回落盘路径，页面拿去拼「导出成功」（`05` §3.10 B）。
 */
export async function exportLibrary(options: {
  current: boolean;
  path: string;
}): Promise<Result<string>> {
  const index = readIndex();
  if (index.status === 'error') return index;

  const entries = options.current
    ? index.value.list.slice(index.value.index, index.value.index + 1)
    : index.value.list;
  if (!entries.length) return failWithDetail('VALIDATION', MSG.stale, 'index:no-entry');

  const files: { name: string; data: string }[] = [];
  for (const entry of entries) {
    const text = readWarehouseText(entry.fileName);
    if (text.status === 'error') return text;
    files.push({ name: entry.fileName, data: encodeBase64(text.value) });
  }

  const payload = encodeDzx(index.value, files);
  const written = await writeArchive(options.path, JSON.stringify(payload));
  if (written.status === 'error') return written;
  return ok(options.path);
}

/**
 * 导入 `.dzx`。
 *
 * 写序：**先写仓库文件、最后写索引**（索引是入口，不能先指向不存在的文件）；
 * 失败即停、不回滚、不删旧文件（`05` §3.3）。
 */
export async function importLibrary(options: {
  append: boolean;
  path: string;
}): Promise<Result<void>> {
  const text = readArchive(options.path);
  if (text.status === 'error') return text;

  /* `JSON.parse` 只许在 `types/json`（`CONVENTIONS` §4.3）；这里用它的 `label` 带出文件名 */
  const parsed = parseJson(text.value, `预设文件 ${options.path}`);
  if (parsed.status === 'error') return parsed;

  const payload = decodeDzx(parsed.value);
  if (payload.status === 'error') return payload;

  return applyImport(payload.value, options.append);
}

/** 导入自带预设：等价于「追加」官方那份 `.dzx` */
export async function importPreset(): Promise<Result<void>> {
  const text = readPreset();
  if (text.status === 'error') return text;

  const parsed = parseJson(text.value, '自带预设');
  if (parsed.status === 'error') return parsed;

  const payload = decodeDzx(parsed.value);
  if (payload.status === 'error') return payload;

  return applyImport(payload.value, true);
}

/** 导入的两条命令共用这一段：算计划 → 写文件 → 写索引 → 重读 */
async function applyImport(
  payload: Parameters<typeof planImportFiles>[1],
  append: boolean
): Promise<Result<void>> {
  const current = readIndex();
  if (current.status === 'error') return current;

  const plan = planImportFiles(current.value, payload, append);
  if (plan.status === 'error') return plan;

  /* 先写文件：内容 base64 → 文本，写进库目录（`writeWarehouseFile`），失败即停 */
  for (const write of plan.value.writes) {
    let text: string;
    try {
      text = decodeBase64(write.base64);
    } catch {
      return failWithDetail('CORRUPT', MSG.corrupt, `base64:${write.name}`);
    }

    const written = await writeWarehouseFile(write.name, text);
    if (written.status === 'error') {
      return failWithDetail(written.code, written.reason, `${written.detail} file:${write.name}`);
    }
  }

  /* 最后写索引：写失败等于「没导入」（库仍是原来那份，孤儿文件不可见） */
  const index = await commitIndex(() => ok(plan.value.nextIndex));
  if (index.status === 'error') return index;

  reload();
  return ok(undefined);
}
