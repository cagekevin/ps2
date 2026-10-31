/**
 * 模板库：形状 + 解码 + 纯编辑（零 IO）
 *
 * 一个库一个索引文件（`template/index.json`），形状：
 *   `{ version: 1, folders: [{ id, name, parentId }], items: TemplateItem[] }`
 *
 * 三条铁律（改之前先读）：
 *   1. **索引里不存路径**。条目文件位置由 `id` + `file` + `ext` 推（`PSD/<id>.info/<file>.<ext>`），
 *      路径拼装只发生在 `repo/template-repo`。存绝对路径 = 换机器整库失效。
 *   2. **`file` 与 `name` 是两件事**：`file` 是磁盘文件名主干（存入时由 vendor 给，**永不改**），
 *      `name` 是显示名（右键可改）。改名只动 `name` —— 动了 `file` 路径就断。
 *   3. **文件夹同级重名禁止、条目重名允许**。前者让面包屑无法区分，后者只是显示重复，
 *      没必要为它多一套自动加序号的规则。
 *
 * 编辑函数全部**返回新对象、不改入参**（与 `domain/action-library` 同一约定）；
 * 失败一律 `Result` 的 error 臂，不抛、不返回空值。
 */

import { isRecord } from '../types/guards';
import { MSG } from '../types/messages';
import { failWithDetail, ok, type Result } from '../types/result';

export const TEMPLATE_VERSION = 1;

export interface TemplateFolder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface TemplateItem {
  /** 条目目录名：`PSD/<id>.info/`（vendor 生成，我们只存不改） */
  id: string;
  /** 磁盘文件名主干，**永不改**；路径只用它，不用 `name` */
  file: string;
  /** 源文件扩展名（`psd` / `psb`） */
  ext: string;
  /** 显示名，可改名 */
  name: string;
  folderId: string | null;
  width: number;
  height: number;
  /** epoch ms，列表按它倒序 */
  createdAt: number;
}

export interface TemplateIndex {
  version: 1;
  folders: TemplateFolder[];
  items: TemplateItem[];
}

export function emptyTemplateIndex(): TemplateIndex {
  return { version: TEMPLATE_VERSION, folders: [], items: [] };
}

/* ---------------- 解码 ---------------- */

/** 非空字符串（`id` / `file` / `ext` 这类不能空的） */
function nonEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** 可空字符串（`folderId` / `parentId`） */
function nullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === 'string' ? value : undefined;
}

function decodeFolder(value: unknown, path: string): Result<TemplateFolder> {
  if (!isRecord(value)) return failWithDetail('CORRUPT', MSG.corrupt, path);

  const id = nonEmpty(value.id);
  if (!id) return failWithDetail('CORRUPT', MSG.corrupt, `${path}.id`);

  const name = nonEmpty(value.name);
  if (!name) return failWithDetail('CORRUPT', MSG.corrupt, `${path}.name`);

  const parentId = nullableString(value.parentId);
  if (parentId === undefined) return failWithDetail('CORRUPT', MSG.corrupt, `${path}.parentId`);

  return ok({ id, name, parentId });
}

function decodeItem(value: unknown, path: string): Result<TemplateItem> {
  if (!isRecord(value)) return failWithDetail('CORRUPT', MSG.corrupt, path);

  const id = nonEmpty(value.id);
  if (!id) return failWithDetail('CORRUPT', MSG.corrupt, `${path}.id`);

  const file = nonEmpty(value.file);
  if (!file) return failWithDetail('CORRUPT', MSG.corrupt, `${path}.file`);

  const ext = nonEmpty(value.ext);
  if (!ext) return failWithDetail('CORRUPT', MSG.corrupt, `${path}.ext`);

  const name = nonEmpty(value.name);
  if (!name) return failWithDetail('CORRUPT', MSG.corrupt, `${path}.name`);

  const folderId = nullableString(value.folderId);
  if (folderId === undefined) return failWithDetail('CORRUPT', MSG.corrupt, `${path}.folderId`);

  const width = finiteNumber(value.width);
  if (width === null) return failWithDetail('CORRUPT', MSG.corrupt, `${path}.width`);

  const height = finiteNumber(value.height);
  if (height === null) return failWithDetail('CORRUPT', MSG.corrupt, `${path}.height`);

  const createdAt = finiteNumber(value.createdAt);
  if (createdAt === null) return failWithDetail('CORRUPT', MSG.corrupt, `${path}.createdAt`);

  return ok({ id, file, ext, name, folderId, width, height, createdAt });
}

/**
 * 结构解码：认不出就是 `CORRUPT`（`detail` 给字段路径），**不迁移版本**。
 * 只保留本文件认识的字段 —— 文件里多出来的键不进内存（写回时自然消失）。
 */
export function decodeTemplateIndex(raw: unknown): Result<TemplateIndex> {
  if (!isRecord(raw)) return failWithDetail('CORRUPT', MSG.corrupt, 'root');

  if (raw.version !== TEMPLATE_VERSION) {
    return failWithDetail('CORRUPT', MSG.corrupt, `root.version:${String(raw.version)}`);
  }
  if (!Array.isArray(raw.folders)) return failWithDetail('CORRUPT', MSG.corrupt, 'root.folders');
  if (!Array.isArray(raw.items)) return failWithDetail('CORRUPT', MSG.corrupt, 'root.items');

  const folders: TemplateFolder[] = [];
  for (let i = 0; i < raw.folders.length; i += 1) {
    const decoded = decodeFolder(raw.folders[i], `root.folders[${i}]`);
    if (decoded.status === 'error') return decoded;
    folders.push(decoded.value);
  }

  const items: TemplateItem[] = [];
  for (let i = 0; i < raw.items.length; i += 1) {
    const decoded = decodeItem(raw.items[i], `root.items[${i}]`);
    if (decoded.status === 'error') return decoded;
    items.push(decoded.value);
  }

  return ok({ version: TEMPLATE_VERSION, folders, items });
}

/* ---------------- 读（投影） ---------------- */

/** 根 → 当前那一路；id 不存在或链断了返回空数组（页面据此回到根，不报错） */
export function folderPath(index: TemplateIndex, id: string | null): TemplateFolder[] {
  if (id === null) return [];

  const byId = new Map(index.folders.map((folder) => [folder.id, folder]));
  const chain: TemplateFolder[] = [];
  let cursor: string | null = id;

  /* 上限 = 文件夹总数，防环（损坏文件里可能出现 a→b→a） */
  while (cursor !== null && chain.length <= index.folders.length) {
    const folder = byId.get(cursor);
    if (!folder) return [];
    chain.unshift(folder);
    cursor = folder.parentId;
  }

  return chain.length > index.folders.length ? [] : chain;
}

/** 同父级子文件夹，按 `name` 升序（中文按本地排序，稳定次序靠 id 兜底） */
export function childFolders(index: TemplateIndex, parentId: string | null): TemplateFolder[] {
  return index.folders
    .filter((folder) => folder.parentId === parentId)
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}

/** 本层条目，`createdAt` 倒序（最近存入在前），同毫秒靠 id 兜底 */
export function itemsOf(index: TemplateIndex, folderId: string | null): TemplateItem[] {
  return index.items
    .filter((item) => item.folderId === folderId)
    .sort((left, right) => right.createdAt - left.createdAt || left.id.localeCompare(right.id));
}

/** 文件夹是否还存在；指向不存在的一律归 `null`（README 里给 AI 的同一条规则） */
export function normalizeFolderId(index: TemplateIndex, id: string | null): string | null {
  if (id === null) return null;
  return index.folders.some((folder) => folder.id === id) ? id : null;
}

/* ---------------- 私有判别 ---------------- */

function findFolder(index: TemplateIndex, id: string): TemplateFolder | null {
  return index.folders.find((folder) => folder.id === id) ?? null;
}

function folderNameTaken(
  index: TemplateIndex,
  parentId: string | null,
  name: string,
  exceptId: string | null
): boolean {
  return index.folders.some(
    (folder) => folder.parentId === parentId && folder.name === name && folder.id !== exceptId
  );
}

/** 名字：去首尾空白后不能为空 */
function cleanName(raw: string): string | null {
  const name = raw.trim();
  return name.length > 0 ? name : null;
}

/* ---------------- 文件夹编辑 ---------------- */

export function addFolder(index: TemplateIndex, folder: TemplateFolder): Result<TemplateIndex> {
  const name = cleanName(folder.name);
  if (name === null) return failWithDetail('VALIDATION', MSG.template.badName, `folder:${folder.id}`);

  if (folder.parentId !== null && findFolder(index, folder.parentId) === null) {
    return failWithDetail('NOT_FOUND', MSG.codeReason.NOT_FOUND, `parent:${folder.parentId}`);
  }
  if (findFolder(index, folder.id) !== null) {
    return failWithDetail('VALIDATION', MSG.codeReason.VALIDATION, `folder:${folder.id}`);
  }
  if (folderNameTaken(index, folder.parentId, name, null)) {
    return failWithDetail(
      'VALIDATION',
      MSG.template.folderNameTaken,
      `parent:${folder.parentId ?? 'root'};name:${name}`
    );
  }

  return ok({
    ...index,
    folders: [...index.folders, { id: folder.id, name, parentId: folder.parentId }]
  });
}

export function renameFolder(index: TemplateIndex, id: string, name: string): Result<TemplateIndex> {
  const target = findFolder(index, id);
  if (!target) return failWithDetail('NOT_FOUND', MSG.codeReason.NOT_FOUND, `folder:${id}`);

  const next = cleanName(name);
  if (next === null) return failWithDetail('VALIDATION', MSG.template.badName, `folder:${id}`);

  if (folderNameTaken(index, target.parentId, next, id)) {
    return failWithDetail(
      'VALIDATION',
      MSG.template.folderNameTaken,
      `parent:${target.parentId ?? 'root'};name:${next}`
    );
  }

  return ok({
    ...index,
    folders: index.folders.map((folder) => (folder.id === id ? { ...folder, name: next } : folder))
  });
}

/** 只删**空**文件夹：有子文件夹或条目一律拒绝（不做递归删，一次误点删一片） */
export function removeFolder(index: TemplateIndex, id: string): Result<TemplateIndex> {
  const target = findFolder(index, id);
  if (!target) return failWithDetail('NOT_FOUND', MSG.codeReason.NOT_FOUND, `folder:${id}`);

  const children = index.folders.filter((folder) => folder.parentId === id).length;
  const items = index.items.filter((item) => item.folderId === id).length;
  if (children > 0 || items > 0) {
    return failWithDetail(
      'VALIDATION',
      MSG.template.folderNotEmpty,
      `folder:${id};folders:${children};items:${items}`
    );
  }

  return ok({ ...index, folders: index.folders.filter((folder) => folder.id !== id) });
}

/* ---------------- 条目编辑 ---------------- */

export function addItem(index: TemplateIndex, item: TemplateItem): Result<TemplateIndex> {
  if (index.items.some((existing) => existing.id === item.id)) {
    return failWithDetail('VALIDATION', MSG.codeReason.VALIDATION, `item:${item.id}`);
  }
  if (item.folderId !== null && findFolder(index, item.folderId) === null) {
    return failWithDetail('NOT_FOUND', MSG.codeReason.NOT_FOUND, `folder:${item.folderId}`);
  }

  const name = cleanName(item.name);
  if (name === null) return failWithDetail('VALIDATION', MSG.template.badName, `item:${item.id}`);

  return ok({ ...index, items: [...index.items, { ...item, name }] });
}

/** 只改显示名；`file` / `ext` / `folderId` 一律不动 */
export function renameItem(index: TemplateIndex, id: string, name: string): Result<TemplateIndex> {
  if (!index.items.some((item) => item.id === id)) {
    return failWithDetail('NOT_FOUND', MSG.codeReason.NOT_FOUND, `item:${id}`);
  }

  const next = cleanName(name);
  if (next === null) return failWithDetail('VALIDATION', MSG.template.badName, `item:${id}`);

  return ok({
    ...index,
    items: index.items.map((item) => (item.id === id ? { ...item, name: next } : item))
  });
}

export function moveItem(
  index: TemplateIndex,
  id: string,
  folderId: string | null
): Result<TemplateIndex> {
  if (!index.items.some((item) => item.id === id)) {
    return failWithDetail('NOT_FOUND', MSG.codeReason.NOT_FOUND, `item:${id}`);
  }
  if (folderId !== null && findFolder(index, folderId) === null) {
    return failWithDetail('NOT_FOUND', MSG.codeReason.NOT_FOUND, `folder:${folderId}`);
  }

  return ok({
    ...index,
    items: index.items.map((item) => (item.id === id ? { ...item, folderId } : item))
  });
}

export function removeItem(index: TemplateIndex, id: string): Result<TemplateIndex> {
  if (!index.items.some((item) => item.id === id)) {
    return failWithDetail('NOT_FOUND', MSG.codeReason.NOT_FOUND, `item:${id}`);
  }
  return ok({ ...index, items: index.items.filter((item) => item.id !== id) });
}
