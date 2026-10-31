/**
 * 模板库命令：页面只调这里，不碰 `core/ps` / `repo`。
 *
 * 规则（与其它命令层一致）：
 *   1. 不吞错、不改码、不换文案 —— `reason` 由生产者给，这里只转发；
 *   2. 写命令成功后把**新索引**交给 store（不重读文件），页面据此直接显示；
 *   3. 失败臂原样上抛，UI 用 `useRunCommand` 提示。
 */

import { log } from '../core/logger';
import { addTemplate, applyTemplate, openLibraryDir as openLibraryDirJsx, openSource, rebuildThumb } from '../core/ps/template';
import {
  addFolder,
  addItem,
  moveItem as moveItemInIndex,
  removeFolder,
  removeItem,
  renameFolder as renameFolderInIndex,
  renameItem as renameItemInIndex,
  type TemplateIndex,
  type TemplateItem
} from '../domain/template-library';
import {
  ensureReadme,
  readIndex,
  removeItemDir,
  templateDir,
  templateLibraryAbsDir,
  templatePsdAbsDir,
  templateSource,
  updateIndex
} from '../repo/template-repo';
import { MSG } from '../types/messages';
import { failWithDetail, ok, type Result } from '../types/result';
import { newId } from '../types/id';

/** 从当前索引里取一条；不存在就是 `NOT_FOUND`（不做「找不到就静默跳过」） */
function findItem(id: string): Result<TemplateItem> {
  const read = readIndex();
  if (read.status === 'error') return read;

  const item = read.value.items.find((entry) => entry.id === id);
  if (!item) return failWithDetail('NOT_FOUND', MSG.codeReason.NOT_FOUND, `item:${id}`);
  return ok(item);
}

/**
 * 把当前选中图层存成一条模板，放进 `folderId`（`null` = 根）。
 *
 * 顺序：**先让 vendor 写完文件，再写索引**。
 * 反过来的话索引里会先有条目、文件还没有 —— 列表立刻是破图，而这里只是「孤儿目录」（无害）。
 */
export async function saveSelection(folderId: string | null): Promise<Result<TemplateIndex>> {
  const added = await addTemplate(templatePsdAbsDir());
  if (added.status === 'error') return added;

  const { id, name, ext, width, height } = added.value;

  const written = await updateIndex((current) =>
    addItem(current, {
      id,
      /* 文件名主干（vendor 写入时用的名字），**永不改**；显示名另行可改 */
      file: name,
      ext,
      name,
      folderId,
      width,
      height,
      createdAt: Date.now()
    })
  );
  if (written.status === 'error') return written;

  /* README 是给用户/外部 AI 的说明，不是业务数据：写失败只留痕，不影响本次存入 */
  await reportReadme();

  return ok(written.value);
}

/** README 落盘失败只留痕：它不是库的必需文件 */
async function reportReadme(): Promise<void> {
  const readme = await ensureReadme();
  if (readme.status === 'error') {
    log.warn('模板库 README 写入失败（不影响存取）', { code: readme.code, detail: readme.detail });
  }
}

/** 把模板贴进当前文档（历史组由 PS 调度器给，一句 Ctrl+Z 撤回整次） */
export async function placeTemplate(id: string): Promise<Result<void>> {
  const found = findItem(id);
  if (found.status === 'error') return found;

  const item = found.value;
  return applyTemplate({
    id: item.id,
    file: item.file,
    ext: item.ext,
    width: item.width,
    height: item.height,
    path: templatePsdAbsDir(),
    /* 原版的「按模板尺寸补边」，我们没有这个设置项，固定空串 */
    useTmeplatePadding: '',
    /* 1 = 当前有文档（`mb_useTemplate` 的三支分支里最常见那支） */
    status: 1
  });
}

/** 打开库内源 PSD 本身（改完保存即写回库文件） */
export function editSource(id: string): Promise<Result<void>> {
  const found = findItem(id);
  if (found.status === 'error') return Promise.resolve(found);

  const item = found.value;
  return openSource(templateSource(item.id, item.file, item.ext));
}

/**
 * 重建缩略图。**不写索引**：vendor 无返回值，宽高不变；
 * 改了画布要更新尺寸就重新存一条，不另开一条「刷新尺寸」的路。
 */
export function refreshThumb(id: string): Promise<Result<void>> {
  const found = findItem(id);
  if (found.status === 'error') return Promise.resolve(found);

  const item = found.value;
  return rebuildThumb(templateDir(item.id), item.file, item.ext);
}

/** 删条目：**先写索引、再删目录**（反序会破图；文件没删掉只是孤儿目录） */
export async function deleteItem(id: string): Promise<Result<TemplateIndex>> {
  const written = await updateIndex((current) => removeItem(current, id));
  if (written.status === 'error') return written;

  const removed = removeItemDir(id);
  if (removed.status === 'error') {
    log.warn('模板条目目录删除失败（索引已移除，目录成为孤儿）', { id, detail: removed.detail });
  }

  return written;
}

export function renameItem(id: string, name: string): Promise<Result<TemplateIndex>> {
  return updateIndex((current) => renameItemInIndex(current, id, name));
}

export function moveItem(id: string, folderId: string | null): Promise<Result<TemplateIndex>> {
  return updateIndex((current) => moveItemInIndex(current, id, folderId));
}

export async function createFolder(parentId: string | null, name: string): Promise<Result<TemplateIndex>> {
  const written = await updateIndex((current) => addFolder(current, { id: newId(), name, parentId }));
  if (written.status !== 'error') await reportReadme();
  return written;
}

export function renameFolder(id: string, name: string): Promise<Result<TemplateIndex>> {
  return updateIndex((current) => renameFolderInIndex(current, id, name));
}

export function deleteFolder(id: string): Promise<Result<TemplateIndex>> {
  return updateIndex((current) => removeFolder(current, id));
}

/** 在系统里打开库目录（用户备份 / 迁移的唯一入口） */
export async function openLibraryDir(): Promise<Result<void>> {
  const opened = await openLibraryDirJsx(templateLibraryAbsDir());
  if (opened.status !== 'error') await reportReadme();
  return opened;
}
