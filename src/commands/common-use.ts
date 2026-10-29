/**
 * 本域（常用页命令）以此为准：`src/commands/common-use.ts` 的「设置值走 domain 默认表 + 执行走 `core/ps` 薄函数 + 失败原样上抛」三段式。新增命令照抄最近的那一条。
 *
 * 常用页命令层（v1 17 条 + v2 15 条）
 *
 * **父子重叠一律走这里**：父网格的格子与子面板的按钮调用同一个函数名，
 * 子面板退化为纯 UI（`docs/plan/03-常用-2026-10-27.md` §9 第 1 条 C-1 = A）。
 *
 * 写盘之后的三条规则（同计划 §3.7）：
 *   数据类（setShow / reorder / resetAll）成功 → `store.load()` 重读
 *   参数类（setOption）成功 → 同样重读，**不做本地 patch**（避免面板显示与文件不一致）
 * 失败一律原样透传，不把 `IO_ERROR` 说成「读取失败」。
 *
 * 三条硬规则（`CONVENTIONS` §9）：不碰 DOM、不弹 toast、只返回 `Result<T>`。
 *
 * **v2 的两处例外（都登记过，别扩散）**：
 *   - 批量进度用 `core/feedback/loading` 的 `show/hide`（跨文档循环，进度只能在命令层给，
 *     `13-常用-V2` §8 第 14 条）；
 *   - 批量循环在前端（跨文档，一次 evalScript 只能作用于当前文档，`CONVENTIONS` §8 例外）。
 */

import { nodeRequire } from '../core/cep/node';
import { loading } from '../core/feedback/loading';
import {
  batchOptimizeDoc as batchOptimizeDocJsx,
  clearGuide as clearGuideJsx,
  correctBlur as correctBlurJsx,
  customBuildTransform as customBuildTransformJsx,
  distribute as distributeJsx,
  embedImage as embedImageJsx,
  embedMultipleImage as embedMultipleImageJsx,
  exchangeLayerColor as exchangeLayerColorJsx,
  exportImage as exportImageJsx,
  exportLayers as exportLayersJsx,
  exportPsdImage as exportPsdImageJsx,
  flip as flipJsx,
  getImagePath,
  getPsdList,
  importMultipleImage as importMultipleImageJsx,
  layerReplace as layerReplaceJsx,
  linkSmartObjectToSmartObject as linkSmartObjectToSmartObjectJsx,
  locationTrade as locationTradeJsx,
  openDirectory as openDirectoryJsx,
  optimizeDoc as optimizeDocJsx,
  referenceWidth as referenceWidthJsx,
  relinkPlacedLayer as relinkPlacedLayerJsx,
  sliceByGuide as sliceByGuideJsx,
  smartFill as smartFillJsx,
  smartReferenceLine as smartReferenceLineJsx,
  swapWireframeFill as swapWireframeFillJsx,
  toLinkSmartObject as toLinkSmartObjectJsx,
  zoom as zoomJsx,
  type CustomTransformParams,
  type FlipDirection,
  type OptimizeOptions
} from '../core/ps/common-use';
import { setTool } from '../core/ps/style';
import { COMMON_USE_SEED, decodePsdList } from '../domain/common-use';
import { MSG } from '../domain/messages';
import {
  booleanOptionOf,
  exportConfigOf,
  linkObjectOf,
  optionPatchOf,
  type CommonUseOptions
} from '../domain/common-use-options';
import { applyListDrop, type DropPosition } from '../domain/reorder';
import { updateCommonUseFile, updateCommonUseOptions } from '../repo/common-use-repo';
import type { RawRecords } from '../repo/settings-object';
import { useCommonUseStore } from '../store/common-use';
import { fail, failWithDetail, ok, type Result } from '../types/result';

/**
 * 翻转方向的字面量类型从命令层转出去。
 *
 * 页面不许 import `core/ps`（`CONVENTIONS` §4.8「页面零底层」），但按钮配置需要这个联合类型，
 * 所以由 commands 转一道；**不要**在页面里另抄一份 `'左右' | ...`——两份迟早不同步。
 */
export type { FlipDirection } from '../core/ps/common-use';

/* ---------------- 执行类（8） ---------------- */

/** 放大 / 缩小：倍数来自预设档位或输入框，非法值在这里拦住，不进 jsx */
export function zoom(scale: number): Promise<Result<void>> {
  if (!Number.isFinite(scale) || scale <= 0) {
    return Promise.resolve(fail('VALIDATION', MSG.common.needZoom));
  }
  return zoomJsx(scale);
}

/** 翻转：方向文本是官方 `eventTransformPosition` 表的键，页面只传六个字面量之一 */
export function flip(direction: FlipDirection): Promise<Result<void>> {
  return flipJsx(direction);
}

export function locationTrade(): Promise<Result<void>> {
  return locationTradeJsx();
}

export function layerReplace(): Promise<Result<void>> {
  return layerReplaceJsx();
}

export function exchangeLayerColor(): Promise<Result<void>> {
  return exchangeLayerColorJsx();
}

export function correctBlur(): Promise<Result<void>> {
  return correctBlurJsx();
}

export function swapWireframeFill(): Promise<Result<void>> {
  return swapWireframeFillJsx();
}

export function openDirectory(): Promise<Result<void>> {
  return openDirectoryJsx();
}

/* ---------------- 子面板（4） ---------------- */

/**
 * 按间距分布：`[axis, gap, sortMode]`，`gap` 是输入框原文（可能带单位）。
 * 空值拦在这里（原版也是前端先判空再发 jsx）。
 */
export function distribute(axis: 1 | 2, gap: string, sortMode: 1 | 2): Promise<Result<void>> {
  const text = gap.trim();
  if (!text) return Promise.resolve(fail('VALIDATION', MSG.common.needGap));
  return distributeJsx(axis, text, sortMode);
}

/** 生成安全区参考线：宽度为空提示「请输入宽度」（原版 `useGuide` 同款判据） */
export function referenceWidth(width: string): Promise<Result<void>> {
  const text = width.trim();
  if (!text) return Promise.resolve(fail('VALIDATION', MSG.common.needWidth));
  return referenceWidthJsx(text);
}

export function clearGuide(): Promise<Result<void>> {
  return clearGuideJsx();
}

export function sliceByGuide(): Promise<Result<void>> {
  return sliceByGuideJsx();
}

/* ---------------- v2：嵌入 / 导入 / 智能对象（6） ---------------- */

/**
 * 生效设置的唯一取法：`sj_set.json` → store → `domain` 的官方默认值表。
 *
 * **默认值不在这里兜**（`?? false` / `?? -1` 会在这里长出第 2、3 份）：
 * 缺键 → domain 的 `COMMON_USE_BOOLEAN_DEFAULTS` / `LINK_OBJECT_DEFAULT`；
 * 缺键本身由 `store.common-use.missingOptions` 报出（缺失可见，不是静默当默认）。
 */
function options(): CommonUseOptions {
  return useCommonUseStore.getState().options;
}

/**
 * 导出配置块：**官方默认 + 文件里已有的值**（`domain.exportConfigOf`）。
 *
 * 传整块是官方语义（`getKey("cyExport")`）；补齐的默认值**不写回文件**。
 * 不许按面板字段重建——重建会把用户在别的客户端里设过的字段洗掉。
 */
function exportConfig(): Record<string, unknown> {
  return exportConfigOf(options());
}

/** 优化三开关：`optimizeDoc` 与 `optimizeFolder` 共用一处拼装 */
function optimizeOptions(): OptimizeOptions {
  const current = options();
  return {
    cyOptimizeAll: booleanOptionOf(current, 'cyOptimizeAll'),
    cyOptimizeDeleteAllEmpty: booleanOptionOf(current, 'cyOptimizeDeleteAllEmpty'),
    cyOptimizeDeleteAllHide: booleanOptionOf(current, 'cyOptimizeDeleteAllHide')
  };
}

/**
 * 导出目录守卫（三个导出入口共用的**唯一一处**）。
 *
 * 只在 `path` 非空时校验：空串在官方语义里是「用默认目录」，不是失败。
 * 目录存在性走 `core/cep/node` 的 `fs`（`core/storage.exists` 只认库内相对路径）。
 */
function assertExportPath(): Result<void> {
  const raw = exportConfig().path;
  if (typeof raw !== 'string' || !raw.trim()) return ok(undefined);

  const fs = nodeRequire<{ existsSync: (path: string) => boolean }>('fs');
  if (!fs) return ok(undefined);
  if (fs.existsSync(raw)) return ok(undefined);
  return fail('VALIDATION', MSG.common.badExportPath);
}

/** 嵌入图片：`bLink2` / `bDelete` 从设置取，`path` 恒空（官方不弹选图） */
export function embedImage(): Promise<Result<void>> {
  const current = options();
  return embedImageJsx(linkObjectOf(current), booleanOptionOf(current, 'cyDeleteNext'));
}

export async function embedMultipleImage(): Promise<Result<void>> {
  loading.show(MSG.common.progressEmbedMulti);
  const embedded = await embedMultipleImageJsx();
  loading.hide();
  return embedded;
}

/**
 * 导入多图片：先让 jsx 弹选图，`-1` = 用户取消 → **静默成功**（不是失败，不该弹错）。
 *
 * 返回结构未实测（`Result<unknown>`），这里只接受「非空字符串路径」；
 * 其它形状原样进 `detail` 报 `VALIDATION`，不猜。
 */
export async function importMultipleImage(): Promise<Result<void>> {
  loading.show(MSG.common.pickImage);
  const picked = await getImagePath();
  loading.hide();
  if (picked.status === 'error') return picked;
  if (typeof picked.value !== 'string') {
    return failWithDetail('VALIDATION', MSG.badPayload, String(picked.value));
  }

  const path = picked.value.trim();
  if (!path || path === '-1') return ok(undefined);

  loading.show(MSG.common.progressImportMulti);
  const imported = await importMultipleImageJsx(path, booleanOptionOf(options(), 'cyImportToLinkObject'));
  loading.hide();
  return imported;
}

export function toLinkSmartObject(): Promise<Result<void>> {
  return toLinkSmartObjectJsx();
}

export function linkSmartObjectToSmartObject(): Promise<Result<void>> {
  return linkSmartObjectToSmartObjectJsx();
}

/** 事件用：拖入转链接。空路径直接拒——否则 jsx 会拿空串去改链接路径 */
export function relinkPlacedLayer(path: string): Promise<Result<void>> {
  const text = path.trim();
  if (!text) return Promise.resolve(failWithDetail('VALIDATION', MSG.stale, 'path:empty'));
  return relinkPlacedLayerJsx(text);
}

/**
 * 网格第 4 项「自动填充颜色」：**切开关**，不是执行一次（官方 `clickFunction` 的 case）。
 *
 * 返回切换后的值，好让页面出官方那两句提示（「开启智能填色」/「已关闭」）——
 * 提示文案属 UI，留在页面；命令层只回答「现在是什么」。
 */
export async function toggleAutoFill(): Promise<Result<boolean>> {
  const next = !booleanOptionOf(options(), 'cyAutoFillColor');
  const written = await setOption('cyAutoFillColor', next);
  if (written.status === 'error') return written;
  return ok(next);
}

/* ---------------- v2：优化（2） ---------------- */

/** 优化当前文档：三个开关从设置取（面板只负责改设置，不传参数） */
export function optimizeDoc(): Promise<Result<void>> {
  return optimizeDocJsx(optimizeOptions());
}

/**
 * 选目录并列出 PSD —— **唯一的 PSD 列表入口**（优化与两个批量导出都走它）。
 *
 * 分工：调 jsx 拿 raw（本层）→ `domain.decodePsdList` 判形状（纯解析）→ 本层只判业务空。
 * 页面在批量导出前先调它拿数量，`>30` 再由页面问确认 —— 确认不进命令层，
 * 因此 `detail` 只放观测（`files:31`），不用装控制信号。
 */
export async function listPsdFiles(): Promise<Result<string[]>> {
  const listed = await getPsdList();
  if (listed.status === 'error') return listed;

  const decoded = decodePsdList(listed.value);
  if (decoded.status === 'error') return decoded;
  if (!decoded.value.length) return fail('NOT_FOUND', MSG.common.noPsd);
  return decoded;
}

/**
 * 批量优化：选目录 → 逐个开文档优化。
 *
 * **跨文档批量，循环只能在前端**（一次 `evalScript` 只作用于当前文档），
 * 这是 `CONVENTIONS` §8 的登记例外，不是「图省事」。
 */
export async function optimizeFolder(): Promise<Result<void>> {
  const listed = await listPsdFiles();
  if (listed.status === 'error') return listed;

  const current = optimizeOptions();
  const files = listed.value;
  for (const [index, file] of files.entries()) {
    /* 进度文案是栈，批量的每一份各开一层再关，不新造进度通道 */
    loading.show(`正在优化文档：${index + 1}/${files.length}`);
    const result = await batchOptimizeDocJsx(current, file);
    loading.hide();
    if (result.status === 'error') return result;
  }
  return ok(undefined);
}

/* ---------------- v2：变换（1） ---------------- */

/** 自定义变换：参数校验（4 条 + 空值兜底）在面板内做，这里只转一手 */
export function customBuildTransform(params: CustomTransformParams): Promise<Result<void>> {
  if (!Number.isInteger(params.number) || params.number < 1) {
    return Promise.resolve(fail('VALIDATION', MSG.common.countMin));
  }
  return customBuildTransformJsx(params);
}

/* ---------------- v2：导出（3） ---------------- */

/** 导出当前图片：整块配置 + 目录守卫（官方 `getExportImage` 那一处判据） */
export async function exportImage(): Promise<Result<void>> {
  const checked = assertExportPath();
  if (checked.status === 'error') return checked;

  loading.show(MSG.common.progressExport);
  const exported = await exportImageJsx(exportConfig());
  loading.hide();
  return exported;
}

/** 批量导出图层：`level` 1 一级 / 2 二级，配置与单张导出同一块 */
export async function exportLayers(level: 1 | 2): Promise<Result<void>> {
  const checked = assertExportPath();
  if (checked.status === 'error') return checked;
  return exportLayersJsx(level, exportConfig());
}

/**
 * 导出这些 PSD（**列表由页面先经 `listPsdFiles` 拿到**）。
 *
 * 为什么收 `files` 而不是自己再扫一次：`cy_getPsdForFolder` 会弹选目录，
 * 命令层重扫一遍 = 用户要选两次目录。
 *
 * **`>30` 的确认已经在页面做完了**（`useConfirm`，唯一入口），这里不再收 `confirmed`：
 * 原设计的「未确认就返回 VALIDATION」是**不可达分支**——唯一调用方传的就是
 * `needsBatchConfirm(count)`，>30 时必然为 `true`（2026-10-29 审计发现并删除）。
 * 命令层只判「有没有文件可导」，弹不弹确认是 UI 的事（`CONVENTIONS` §9）。
 */
export async function exportPsdFiles(files: readonly string[]): Promise<Result<void>> {
  /*
   * 防御性判空，但**用官方那句**：审计 §5.4 #2 指出原先另造了一句「没有可导出的 PSD 文件」，
   * 与 `noPsd` 是同一事实、两个码两句；且这条路不可达（`listPsdFiles` 已把空列表判成 NOT_FOUND）。
   * 留判空、删重复句。
   */
  if (!files.length) return fail('VALIDATION', MSG.common.noPsd);

  /*
   * 每份 PSD 的配置：当前 `cyExport` 的深拷贝 + 三处改写（官方 `:36974-36978`）。
   * 改的是副本，**不动用户的设置文件**——批量导出不该反写偏好。
   */
  const base = exportConfig();
  const perFile = {
    ...base,
    path: '',
    pathType: 2,
    autoOpenFolder: false
  };

  for (const [index, file] of files.entries()) {
    /* 官方文案是「正在导出...」（A-5：进度写「当前/总数」，官方写反了） */
    loading.show(`正在导出：${index + 1}/${files.length}`);
    const result = await exportPsdImageJsx(file, perFile);
    loading.hide();
    if (result.status === 'error') return result;
  }
  return ok(undefined);
}

/* ---------------- v2：事件驱动（2） ---------------- */

/** 智能填色：`color` 前景 / `line` 背景（两条 jsx，语义相同） */
export function smartFill(kind: 'color' | 'line'): Promise<Result<void>> {
  return smartFillJsx(kind);
}

/** 智能参考线：`singleRow` 水平 / `singleColumn` 竖直 */
export function smartReferenceLine(target: 'singleRow' | 'singleColumn'): Promise<Result<void>> {
  return smartReferenceLineJsx(target);
}

/**
 * 智能参考线开关：开 = 切 PS 的参考线工具并让 watcher 开始订阅；关 = 只退订。
 *
 * 订阅在 `app/common-use-watcher.tsx`（页面不订阅 PS 事件，`CONVENTIONS` §4.8），
 * 这里只落本地开关 + 切工具。开关状态进 store 的 `guideOn`，不写 `sj_set.json`
 * （原版也是组件本地 state）。
 */
export async function toggleSmartGuide(on: boolean): Promise<Result<void>> {
  if (!on) {
    useCommonUseStore.getState().setGuideOn(false);
    return ok(undefined);
  }

  const switched = await setTool('marqueeSingleRowTool');
  if (switched.status === 'error') return switched;
  useCommonUseStore.getState().setGuideOn(true);
  return ok(undefined);
}

/* ---------------- 数据（5） ---------------- */

/**
 * 写成功后重读投影：网格顺序 / 显隐是用户一眼能看出来的东西，不做乐观更新。
 *
 * mutator 拿到的是**原始记录**（`RawRecords`），不是读视图：文件里被跳过的坏项要原样留着。
 * 判定失败直接 `return fail(...)`，不走「返回 null 再由外面捞」。
 */
async function commitFile(mutator: (file: RawRecords) => Result<RawRecords | null>) {
  const result = await updateCommonUseFile(mutator);
  if (result.status === 'ok') useCommonUseStore.getState().load();
  return result;
}

/** 改一条常用项：id 不存在就明确失败，不静默不写 */
async function patchItem(
  id: string,
  patch: Record<string, unknown>
): Promise<Result<void>> {
  return commitFile((items) => {
    /* 只在队列里用最新记录判一次：两次读之间该项可能已被别的操作删掉 */
    if (!items.some((item) => item.id === id)) {
      return failWithDetail('VALIDATION', MSG.stale, `id:${id}`);
    }
    return ok(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  });
}

/** 显示 / 隐藏一格：写 `sj_commonFunction.json` 的 `isShow` */
export function setShow(id: string, show: boolean): Promise<Result<void>> {
  return patchItem(id, { isShow: show });
}

/**
 * 拖拽排序：落点计算复用 `domain/reorder.applyListDrop`，不自己算下标。
 *
 * 下标只在**队列里**用最新记录判一次：并发下数量可能变了，
 * 用读缓存时的长度判会「拖 1 号却动了 3 号」；判据不成立就返回失败，不是静默不写。
 */
export async function reorder(
  from: number,
  to: number,
  position: DropPosition
): Promise<Result<void>> {
  return commitFile((items) => {
    const valid = (value: number) =>
      Number.isInteger(value) && value >= 0 && value < items.length;
    if (!valid(from) || !valid(to)) {
      return failWithDetail('VALIDATION', MSG.stale, `from:${from} to:${to} len:${items.length}`);
    }

    const next = [...items];
    try {
      if (applyListDrop(next, from, to, position) < 0) {
        return failWithDetail('VALIDATION', MSG.stale, 'drop:-1');
      }
    } catch (error) {
      return failWithDetail('VALIDATION', MSG.stale, String(error));
    }
    return ok(next);
  });
}

/** 重置为官方 14 项（回 `COMMON_USE_SEED` 的副本，不动只读常量） */
export function resetAll(): Promise<Result<void>> {
  return commitFile(() => ok(COMMON_USE_SEED.map((item) => ({ ...item }))));
}

/**
 * 改一个设置项：`path` 只允许 `<17 键>` / `<键>.<一级子键>` / `cyExport.compress.<4 键>`
 * （白名单与拼装都在 `domain/common-use-options.optionPatchOf`，本函数只管落盘与重读）。
 *
 * 不在白名单返回 `VALIDATION`，**不往 `sj_set.json` 写未知键**——
 * 那是全客户端共用的设置文件，塞错键可能让官方读配置时整份判坏。
 */
export async function setOption(path: string, value: unknown): Promise<Result<void>> {
  const patch = optionPatchOf(path, value);
  if (patch.status === 'error') return patch;

  const result = await updateCommonUseOptions(patch.value);
  if (result.status === 'ok') useCommonUseStore.getState().load();
  return result;
}

