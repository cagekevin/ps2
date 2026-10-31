/**
 * 模板库仓储：索引读写 + 路径拼装 + 库内 README。
 *
 * 唯一写入口：`updateIndex`（内部走 `repo/json-file` 的读改写，`.bak` 与同文件排队由它保证）。
 * **本文件之外不许出现** `'template'` / `'PSD'` / `'.info'` 字面量 —— 路径只有下面三个函数能给。
 *
 * 目录形状（vendor 的 `ps_mbAddPsd` 建条目目录，我们只写 `index.json` 与 `README.md`）：
 *
 *   template/index.json          ← 我们写，唯一索引
 *   template/PSD/<id>.info/      ← vendor 建：<file>.<ext> 源文件 + <file>.png 缩略图
 *   template/README.md           ← 给用户 / 外部 AI 的修复说明（非必需文件，删了不影响读写）
 *
 * 为什么索引里不存路径：换机器 / 换用户名后绝对路径全失效（`docs/plan/15` §0.6.1）。
 */

import { userAssetUrl, userSubPath } from '../core/paths';
import { ROOTS, exists, removeDir, writeTextAtomic } from '../core/storage';
import { decodeTemplateIndex, emptyTemplateIndex, type TemplateIndex } from '../domain/template-library';
import { ok, type Result } from '../types/result';
import { readJsonFile, updateOrCreateJsonFile, type JsonMutator } from './json-file';

/* 路径常量**不导出**：只有本文件的函数需要它们。要库根路径的调用方（M3 的「打开库目录」）
   到时候加一行导出，而不是在别处重写一遍 'template'。 */
const TEMPLATE_DIR = 'template';
const TEMPLATE_INDEX = `${TEMPLATE_DIR}/index.json`;
const TEMPLATE_README = `${TEMPLATE_DIR}/README.md`;

const ROOT = 'data' as const;

/** 条目目录：`template/PSD/<id>.info` */
export function templateDir(id: string): string {
  return `${TEMPLATE_DIR}/PSD/${id}.info`;
}

/** 条目源文件：`<id>.info/<file>.<ext>`（传 `file`，**不传 `name`**） */
export function templateSource(id: string, file: string, ext: string): string {
  return `${templateDir(id)}/${file}.${ext}`;
}

/** 条目缩略图：`<id>.info/<file>.png`（vendor 按源文件名生成） */
export function templateThumbFile(id: string, file: string): string {
  return `${templateDir(id)}/${file}.png`;
}

/**
 * 库根目录**绝对路径**（「打开库目录」/ 备份 / 迁移用）。
 *
 * 绝对路径只在这一处出现（`core/paths` + `core/storage` 的 ROOTS）；索引里永远不存路径。
 */
export function templateLibraryAbsDir(): string {
  return userSubPath(ROOTS.data.replace(/^\//, ''), TEMPLATE_DIR);
}

/** 库的 PSD 根目录绝对路径：vendor `ps_mbAddPsd` 只要这一个参数，它在里面自己建 `<id>.info/` */
export function templatePsdAbsDir(): string {
  return `${templateLibraryAbsDir()}/PSD`;
}

/**
 * 缩略图的 `<img src>`。
 *
 * 路径只有 `templateThumbFile` 能给；`userAssetUrl` 要求**逐段**给（它逐段 encode），
 * 所以这里把路径拆成段再交出去 —— 页面上拿到的永远是完整可用的 URL，
 * 不会因为「谁少 encode 一段」而在中文文件名上破图。
 */
export function templateThumbUrl(id: string, file: string): string {
  return userAssetUrl('data', ...templateThumbFile(id, file).split('/'));
}

/** 读索引；文件不存在 = 空库（**不写盘**，首次创建只发生在用户动作里）。label 就用文件名，不另取名 */
export function readIndex(): Result<TemplateIndex> {
  const read = readJsonFile(TEMPLATE_INDEX, ROOT, TEMPLATE_INDEX, decodeTemplateIndex);
  if (read.status === 'error' && read.code === 'NOT_FOUND') return ok(emptyTemplateIndex());
  return read;
}

/**
 * 读 → 改 → 写，并把**写后的索引**交给调用方（store 直接回填，不再重读一次文件）。
 *
 * mutator 返回 `null` ⇒ 不写盘，返回当前索引（`json-file` 已有此语义）。
 * **不在入口先 `readIndex()`**：那会让每次写多读一次文件，而 `json-file` 内部本来就读了。
 */
export async function updateIndex(mutator: JsonMutator<TemplateIndex>): Promise<Result<TemplateIndex>> {
  /* mutator 由 json-file 在读完（或确认不存在）之后调用，这里把结果留住，避免「写完再读一次」 */
  let next: TemplateIndex | null = null;

  const written = await updateOrCreateJsonFile(
    TEMPLATE_INDEX,
    ROOT,
    TEMPLATE_INDEX,
    decodeTemplateIndex,
    (current) => {
      const result = mutator(current);
      next = result.status === 'ok' && result.value !== null ? result.value : current;
      return result;
    },
    { missing: emptyTemplateIndex }
  );
  if (written.status === 'error') return written;

  /* 走到这里 json-file 必然调用过 mutator，`??` 只是让类型收窄，不是业务默认值 */
  return ok(next ?? emptyTemplateIndex());
}

/** 删条目目录（整个 `<id>.info/`）；目录不存在也算成功 */
export function removeItemDir(id: string): Result<void> {
  return removeDir(templateDir(id), ROOT);
}

/**
 * 库内 README：不存在才写（幂等，一次 `exists` 的成本）。
 *
 * 它不是库的必需文件 —— 删了不影响读写；写失败也不影响业务（命令层只 `log.warn`）。
 */
export async function ensureReadme(): Promise<Result<void>> {
  if (exists(TEMPLATE_README, ROOT)) return ok(undefined);
  return writeTextAtomic(TEMPLATE_README, README_TEXT, ROOT);
}

/**
 * 索引坏了怎么办：这份说明就是全部答案（我们**不做**修复功能，代码只负责把它写一次）。
 * 内容改动要同步 `docs/plan/15` §3.5 的「README 内容规格」。
 */
const README_TEXT = `# 模板库数据目录

这个目录是 PS 面板「模板库」的数据目录。**PSD 文件是真相，index.json 只是列表索引** ——
索引可以重建，PSD 不会因为索引坏了而丢。

## 目录结构

    template/
      index.json              列表索引（可以重建，不影响 PSD）
      PSD/<id>.info/          一条模板一个目录
        <file>.<ext>          源 PSD（文件名主干就是索引里的 file 字段）
        <file>.png            缩略图（同名）
      README.md               本文件

## 备份 / 迁移

**复制整个 template 文件夹**就是完整备份；换机器再粘回来就是恢复。
不要只拷 PSD/（会和索引对不上），也不要只拷 index.json。

## 索引坏了会看到什么

- 面板列表空白，但 PSD/ 下有条目目录
- 缩略图破图
- 点开提示「文件不存在」
- 面板提示内容无法识别

## 怎么修

把下面这段原文交给 AI：

> 读 template/index.json，把它与 PSD/ 下实际的条目目录对齐，重写索引。

重写规则（照做即可）：

1. 条目单位是 **PSD/ 下的目录**，不是文件。
2. 目录在 + 索引里有 → 保留原条目（分组、名字、时间都不动）。
3. 目录在 + 索引里没有 → **新增**一条：id = 目录名去掉 .info；file = 目录里源文件的主干；
   ext = 源文件扩展名；name = 同 file（显示名，之后可单独改）；folderId = null；
   width / height = 源文件像素尺寸；createdAt = 源文件修改时间的毫秒数。
4. 索引里有 + 目录没有 → **删掉该条**。
5. 目录里没有源文件（只剩 png）→ 跳过，并在回复里列出来。
6. 非 .psd / .psb 的源文件 → 跳过，并列出。

索引格式：

    { "version": 1,
      "folders": [{ "id": "…", "name": "…", "parentId": null }],
      "items":   [{ "id": "…", "file": "…", "ext": "psd", "name": "…",
                    "folderId": null, "width": 800, "height": 600, "createdAt": 0 }] }

## 不许做什么

- 不要重命名 PSD/ 下的条目目录（**目录名就是条目 id**）
- 不要改条目目录里源文件的文件名（**文件主干就是 file 字段**）
- 不要删 PSD（那才是真数据）
- name 是显示名，随便改，与路径无关
- folderId 指向不存在的文件夹时改成 null

## 兜底

实在修不好：PSD/ 下的源文件都是完整的，拷出来重新「存入」即可。
`;
