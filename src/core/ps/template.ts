/**
 * 模板库的 PS 能力（薄函数）。
 *
 * **这里没有一行 jsx**：五个动作全是 `jsx/vendor.jsx` 里原版面板天天在跑的函数，
 * 我们只往 `capabilities.ts` 加表行、按名字调（`callCapability`）。
 * 函数体在 `jsx/vendor.jsx`（官方 jsxbin 的解码源码）里，调用只看名字；名字错了 `funcMissing`
 * 会报 `PS_UNREADY` + `detail: fn:ps_mbAddPsd`，不会静默。
 *
 * 本文件只做一件事：给调用方一个**语义名字**，
 * 门 / 前置 / 超时 / 解析全在表里，不许在这里重写。
 */

import { callCapability } from './capability';
import { CAP } from './capabilities';
import type { Result } from '../../types/result';

/**
 * vendor `ps_mbAddPsd` 返回的条目（只留我们进索引的五个字段）。
 *
 * 类型放在这里而不是 `types/`：它是这条 PS 通道的载荷投影，不是全仓共用形状。
 * `capabilities.ts` 用 `import type` 反向引用它（只借类型）。
 */
export interface AddedTemplate {
  id: string;
  name: string;
  ext: string;
  width: number;
  height: number;
}

/**
 * 应用模板的载荷：条目字段 + 原版要求的三个附加字段。
 *
 * **`name` 必须是磁盘文件名主干**（我们的 `item.file`），不是显示名：
 * vendor `mb_useTemplate` 拿 `obj.name` 拼路径与新建文档名
 * （`jsx/vendor.jsx:404` / `:402`），拼不到就 `_A("打开错误,找不到PSD!")`。
 * 我们的索引把「磁盘主干 `file`」与「显示名 `name`」分开了，所以这里要把 `file` 填进 `name`。
 * `useTmeplatePadding` 的拼写是原版就错的（`Tmeplate`），照抄别改。
 */
export interface TemplateUsePayload {
  id: string;
  /** vendor 的字段名，值是**磁盘文件名主干** */
  name: string;
  ext: string;
  width: number;
  height: number;
  /** 库的 PSD 根目录（绝对路径） */
  path: string;
  useTmeplatePadding: string;
  /** 原版三支分支：1 = 有选中文档，2 / 0 见计划 §9.6 */
  status: number;
}

/**
 * 把当前选中图层存成一条模板。
 *
 * `psdDir` 是**库的 PSD 根目录**（绝对路径）；vendor 在里面建 `<id>.info/` 并写
 * 源文件与缩略图，返回条目的 id / 名称 / 扩展名 / 尺寸。
 * 写索引、插条目是 `commands/template.saveSelection` 的事，这里只管 PS 那一半。
 */
export function addTemplate(psdDir: string): Promise<Result<AddedTemplate>> {
  return callCapability(CAP.templateAdd, [psdDir]);
}

/** 重建某条模板的缩略图（覆盖同名 png）；调用方随后要破缓存才看得到新图 */
export function rebuildThumb(itemDir: string, file: string, ext: string): Promise<Result<void>> {
  return callCapability(CAP.templateThumb, [itemDir, file, ext]);
}

/** 把模板贴进当前文档（历史组由 dispatch 通道给，一句 `Ctrl+Z` 撤回整次） */
export function applyTemplate(payload: TemplateUsePayload): Promise<Result<void>> {
  return callCapability(CAP.templateUse, [encodeURIComponent(JSON.stringify(payload))]);
}

/** 把库里的源 PSD 当新文档打开，给用户直接改 */
export function openSource(file: string): Promise<Result<void>> {
  return callCapability(CAP.templateOpen, [file]);
}

/** 在系统文件管理器里打开库目录 */
export function openLibraryDir(path: string): Promise<Result<void>> {
  return callCapability(CAP.templateOpenDir, [path]);
}
