/**
 * 【范本】PS 常用页能力（26 个官方 jsx + v2 追加的 3 条事件驱动：v1 覆盖 11 个 —— 12 条命令，
 * `cy_guideFunction` 一函数两用 —— 2 个只登记，其余 16 个在 v2 接线）
 *
 * 通道**不是一刀切**：按原版调用点用的方法分两批（`docs/PS-CHANNEL-NOTES.md` §11.4），
 *   dispatch（原版 `jsxHistory*`）：`cy_transformPosition` / `cy_locationTrade` /
 *     `cy_LayerReplace` / `cy_exchangeLayerColor` / `cy_correctRectangleBlur` /
 *     `cy_swapWireframeFill` / `cy_distributedByPitch` / `cy_createSafeAreaGuide`
 *   直调（原版 `jsx` / `jsxNoCheck`）：`cy_zoom` / `cy_guideFunction` / `cy_openDirectory`
 * 判断依据是原版调用点，不是函数名前缀——`cy_zoom` 直调、同族的 `cy_transformPosition` 走调度。
 * 通道与超时写在能力表（`./capabilities.ts`）里，本文件只负责拼参数。
 *
 * 参数一律明文（不走 `encodeText`，那是 `ys_*` 字体通道的事）。
 * 三处原版拼写照抄不改：`cy_BacthExportPsdToImage`（Bacth）、`cy_LayerReplace`（大写 L）、
 * `cy_ExportImage`（大写 E）——改成「正确拼写」等于函数不存在。
 *
 * 返回结构未真机验证：写函数用 `lenientVoid` / `unwrapRaw`，只把 raw 约定值（`-1` / `no-doc` 等）
 * 当失败，其余算成功；读函数用 `passthrough` 把 raw 原样交出去，解析在 domain。
 */

import type { Result } from '../../types/result';
import { callCapability } from './capability';
import { CAP } from './capabilities';

/** 翻转 6 向的方向文本：原版 `eventTransformPosition` 表逐字（`app.v4.js:37805-37812`） */
export type FlipDirection = '左右' | '上下' | '左' | '右' | '下' | '上';

/* ---------------- 执行类（v1 在用） ---------------- */

/**
 * 放大 / 缩小：`cy_zoom([倍数])`，`105` / `95` 这类。
 *
 * 原版走 `jsx`（直调），且先过一次 `Layer_isSelectLayer()`；我方不额外探一次，
 * 没选中图层时由 jsx 自己返回约定值（`-1` → PS_REJECTED），页面 toast 即可。
 */
export function zoom(scale: number): Promise<Result<void>> {
  return callCapability(CAP.zoom, [scale]);
}

/** 翻转：`cy_transformPosition([方向文本])`，走调度通道 */
export function flip(direction: FlipDirection): Promise<Result<void>> {
  return callCapability(CAP.flip, [direction]);
}

/** 位置对换：`cy_locationTrade([])` */
export function locationTrade(): Promise<Result<void>> {
  return callCapability(CAP.locationTrade);
}

/** 元素替换：`cy_LayerReplace([])`，大写字面照抄 */
export function layerReplace(): Promise<Result<void>> {
  return callCapability(CAP.layerReplace);
}

/** 图层颜色互换：`cy_exchangeLayerColor([])` */
export function exchangeLayerColor(): Promise<Result<void>> {
  return callCapability(CAP.exchangeLayerColor);
}

/** 修正边缘模糊：派发 key 是拼错的 `cy_coorectBlur`，函数名是这个 */
export function correctBlur(): Promise<Result<void>> {
  return callCapability(CAP.correctBlur);
}

/**
 * 填充线框互换：`cy_swapWireframeFill` **既是派发 key 也是函数名**（`case 36` → `jsxHistory`）。
 * 无参，走调度通道。
 */
export function swapWireframeFill(): Promise<Result<void>> {
  return callCapability(CAP.swapWireframeFill);
}

/**
 * 按间距分布：`cy_distributedByPitch([axis, gap, sortMode])`。
 *
 * `gap` 是**字符串**：原版把输入框的原文（可能带单位，如 `10px`）直接传下去，
 * 单位补全在前端做（`ft.b`）。我方不补单位——`appUnit` 属设置页的键，
 * 本页 repo 只读 17 个 `cy*` 键，为此多开一个键会把 17 键契约撕开。
 * `sortMode` `1` 按图层 / `2` 按坐标。
 *
 * 注意与 `core/ps/text.distributeByPitch` 的区别：那个是文本属性面板的
 * `[axis, value, 2, filter]` 四参形态，两者不是同一条调用，别合并。
 */
export function distribute(axis: 1 | 2, gap: string, sortMode: 1 | 2): Promise<Result<void>> {
  return callCapability(CAP.distribute, [axis, gap, sortMode]);
}

/** 生成安全区参考线：`cy_createSafeAreaGuide([宽度])`，宽度原文照传（空串由命令层拦） */
export function referenceWidth(width: string): Promise<Result<void>> {
  return callCapability(CAP.referenceWidth, [width]);
}

/**
 * 清除参考线：`cy_guideFunction([1])`，走直调（原版 `jsxNoCheck`）。
 *
 * 切片用的是同一个函数，参数 `2`——拆成两个函数名是为了不让调用方记数字。
 */
export function clearGuide(): Promise<Result<void>> {
  return callCapability(CAP.clearGuide, [1]);
}

/** 按参考线切片：`cy_guideFunction([2])` */
export function sliceByGuide(): Promise<Result<void>> {
  return callCapability(CAP.sliceByGuide, [2]);
}

/** 打开当前文件所在目录：`cy_openDirectory` **无参**，直调 */
export function openDirectory(): Promise<Result<void>> {
  return callCapability(CAP.openDirectory);
}

/* ---------------- v1 只登记、不接线（2） ---------------- */

/**
 * 让 jsx 弹选图对话框并返回路径（`cy_getImagePath`）。
 *
 * 返回结构未实测（可能单张路径、也可能是数组），**这里不解码**，raw 原样交给上层——
 * 按 JSON 解析的话，裸路径串会被判成 `CORRUPT`，把「用户取消了」演成「数据坏了」。
 * 接入方（v2 嵌入图片）必须先处理 `-1` = 取消（原版判据是 `!== -1`）。
 */
export function getImagePath(): Promise<Result<unknown>> {
  return callCapability(CAP.imagePath);
}

/** 扫文件夹取 PSD 列表（`cy_getPsdForFolder`）：jsx 自己弹选目录，**无参**，返回同样不解码 */
export function getPsdList(): Promise<Result<unknown>> {
  return callCapability(CAP.psdList);
}

/* ---------------- v2：嵌入 / 导入（3） ---------------- */

/**
 * 嵌入图片：`cy_insertionImage([{ path, bLink2, bDelete }])`。
 *
 * `path` 恒空串——官方两处调用都是空串，意思是「嵌 PS 里当前置入的那张图」，
 * **不弹选图**。`bLink2` 取 `cyLinkObject`（-1 不存链接 / 1 原始路径 / 2 与 PSD 同目录），
 * `bDelete` 取 `cyDeleteNext`；两个值由 `commands` 从设置读出后传进来，`core` 不读设置。
 */
export function embedImage(bLink2: number, bDelete: boolean): Promise<Result<void>> {
  return callCapability(CAP.embedImage, [{ path: '', bLink2, bDelete }]);
}

/** 嵌入多图片：`cy_embedMultipleImage([])`，多张图由 jsx 自己处理 */
export function embedMultipleImage(): Promise<Result<void>> {
  return callCapability(CAP.embedMultipleImage);
}

/** 导入多图片：`cy_importMultipleImage([{ path, toLinkObject }])` */
export function importMultipleImage(imagePath: string, toLinkObject: boolean): Promise<Result<void>> {
  return callCapability(CAP.importMultipleImage, [{ path: imagePath, toLinkObject }]);
}

/* ---------------- v2：智能对象转换（3） ---------------- */

/** 把置入层的链接路径改掉：`Layer_placedLayerRelinkToFile([path])`，直调 */
export function relinkPlacedLayer(path: string): Promise<Result<void>> {
  return callCapability(CAP.relinkPlacedLayer, [path]);
}

/** 转链接智能对象：`cy_smartToLinkSmartObject([])`，走调度，标签「转链接智能对象」 */
export function toLinkSmartObject(): Promise<Result<void>> {
  return callCapability(CAP.toLinkSmartObject);
}

/** 转回普通智能对象：`cy_linkSmartObjectToSmartObject([])`，标签「转智能对象」 */
export function linkSmartObjectToSmartObject(): Promise<Result<void>> {
  return callCapability(CAP.linkSmartObjectToSmartObject);
}

/* ---------------- v2：优化（2） ---------------- */

/** 优化文档的三个开关：键名与 `sj_set.json` 的设置键同名（官方 `:36006-36013` 的 option 就是这三键） */
export interface OptimizeOptions {
  cyOptimizeAll: boolean;
  cyOptimizeDeleteAllEmpty: boolean;
  cyOptimizeDeleteAllHide: boolean;
}

/** 优化当前文档：`cy_optimizeDoc([{ 三键 }])`，走调度（原版 `jsxHistoryNoCheck`） */
export function optimizeDoc(options: OptimizeOptions): Promise<Result<void>> {
  return callCapability(CAP.optimizeDoc, [{ ...options }]);
}

/**
 * 优化单个 PSD：`cy_batchOptimizeDoc([option, file])`，直调（原版 `jsxNoCheck`）。
 *
 * **跨文档批量，循环在 `commands`**：一次 `evalScript` 只作用于当前打开的文档，
 * 这是 `CONVENTIONS` §8「批量在 jsx 内循环」的**登记例外**（`13-常用-V2` §4.6）。
 */
export function batchOptimizeDoc(options: OptimizeOptions, file: string): Promise<Result<void>> {
  return callCapability(CAP.batchOptimizeDoc, [{ ...options }, file]);
}

/* ---------------- v2：自定义变换（1） ---------------- */

/**
 * 自定义变换的 7 个参数（具名字段；**拼数组只在 `customBuildTransform` 里做一次**）。
 *
 * 官方顺序是 `[number, angle, leftRigth, topBottom, pointIndex, scale, opacity]`
 * （`app.v4.js:36415`）。Vue 参考实现写成 `[number, scale, leftRight, topBottom, angle, opacity, anchor]`，
 * 照它拼会把角度当缩放、锚点当透明度——真机上不报错，只是结果全不对。
 * `leftRigth` 的拼写照抄官方（Rigth），不要顺手改成 Right。
 */
export interface CustomTransformParams {
  /** 复制数量 */
  number: number;
  /** 缩放比例（百分比整数） */
  scale: number;
  /** 左右距离（原样传，可能带单位） */
  leftRigth: string;
  /** 上下距离（原样传） */
  topBottom: string;
  /** 旋转角度 */
  angle: number;
  /** 透明度递减 */
  opacity: number;
  /** 九宫格锚点下标 0-8（官方默认 0） */
  pointIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

/** 自定义变换：`cy_customBuildTransform([...7])`，走调度 */
export function customBuildTransform(params: CustomTransformParams): Promise<Result<void>> {
  return callCapability(CAP.customBuildTransform, [
    params.number,
    params.angle,
    params.leftRigth,
    params.topBottom,
    params.pointIndex,
    params.scale,
    params.opacity
  ]);
}

/* ---------------- v2：导出（3 个函数 / 4 条 jsx） ---------------- */

/**
 * 导出当前图片：`cy_ExportImage([cyExport])`，走调度（原版 `jsxHistoryNoCheck`）。
 *
 * 传的是磁盘上 `cyExport` 的**整块**（含 `compress` 与不认识的子键）——官方
 * `getKey("cyExport")` 就是整块，只传面板管的那几个字段会让 PS 读不到配置。
 */
export function exportImage(config: Record<string, unknown>): Promise<Result<void>> {
  return callCapability(CAP.exportImage, [config]);
}

/** 批量导出图层：`level` 1 = `cy_BatchExportLayer`、2 = `cy_BatchExportSecondLayer`，配置同上整块 */
export function exportLayers(level: 1 | 2, config: Record<string, unknown>): Promise<Result<void>> {
  return callCapability(level === 1 ? CAP.exportFirstLevelLayers : CAP.exportSecondLevelLayers, [config]);
}

/** 单个 PSD 导图：`cy_BacthExportPsdToImage([file, config])`，`Bacth` 是官方拼写照抄 */
export function exportPsdImage(file: string, config: Record<string, unknown>): Promise<Result<void>> {
  return callCapability(CAP.exportPsdImage, [file, config]);
}

/* ---------------- v2：事件驱动（2 个函数 / 3 条 jsx） ---------------- */

/** 智能填色：`color` = 前景色 → `cy_smartFillColor`；`line` = 背景色 → `cy_smartFillLineColor` */
export function smartFill(kind: 'color' | 'line'): Promise<Result<void>> {
  return callCapability(kind === 'color' ? CAP.smartFillColor : CAP.smartFillLineColor);
}

/** 智能参考线：`cy_smartReferenceLine([singleRow | singleColumn])` */
export function smartReferenceLine(target: 'singleRow' | 'singleColumn'): Promise<Result<void>> {
  return callCapability(CAP.smartReferenceLine, [target]);
}
