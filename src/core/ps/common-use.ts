/**
 * 【范本】PS 常用页能力（26 个官方 jsx：v1 覆盖 11 个 —— 12 条命令，`cy_guideFunction` 一函数两用 ——
 * 另有 2 个只登记不接线，其余 13 条排 v2）
 *
 * 通道**不是一刀切**：按原版调用点用的方法分两批（`docs/PS-CHANNEL-NOTES.md` §11.4），
 *   dispatch（原版 `jsxHistory*`）：`cy_transformPosition` / `cy_locationTrade` /
 *     `cy_LayerReplace` / `cy_exchangeLayerColor` / `cy_correctRectangleBlur` /
 *     `cy_swapWireframeFill` / `cy_distributedByPitch` / `cy_createSafeAreaGuide`
 *   直调（原版 `jsx` / `jsxNoCheck`）：`cy_zoom` / `cy_guideFunction` / `cy_openDirectory`
 * 判断依据是原版调用点，不是函数名前缀——`cy_zoom` 直调、同族的 `cy_transformPosition` 走调度。
 *
 * 参数一律明文（不走 `encodeText`，那是 `ys_*` 字体通道的事）；写操作 60s。
 * 三处原版拼写照抄不改：`cy_BacthExportPsdToImage`（Bacth）、`cy_LayerReplace`（大写 L）、
 * `cy_ExportImage`（大写 E）——改成「正确拼写」等于函数不存在。
 *
 * 返回结构未真机验证：写函数只把 raw 约定值（`-1` / `no-doc` 等）当失败，
 * 其余算成功；读函数把 raw 原样交出去，解析在 domain。
 */

import { callJsx } from '../cep/bridge';
import { fail, ok, type Result } from '../../types/result';
import { requireVendor } from './init';
import { runDirect, runVendor } from './vendor';

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
  return runDirect('cy_zoom', [scale], '当前图层不支持缩放');
}

/** 翻转：`cy_transformPosition([方向文本])`，走调度通道 */
export function flip(direction: FlipDirection): Promise<Result<void>> {
  return runVendor('cy_transformPosition', [direction], '自由变换');
}

/** 位置对换：`cy_locationTrade([])` */
export function locationTrade(): Promise<Result<void>> {
  return runVendor('cy_locationTrade', [], '位置对换');
}

/** 元素替换：`cy_LayerReplace([])`，大写字面照抄 */
export function layerReplace(): Promise<Result<void>> {
  return runVendor('cy_LayerReplace', [], '元素替换');
}

/** 图层颜色互换：`cy_exchangeLayerColor([])` */
export function exchangeLayerColor(): Promise<Result<void>> {
  return runVendor('cy_exchangeLayerColor', [], '图层颜色互换');
}

/** 修正边缘模糊：派发 key 是拼错的 `cy_coorectBlur`，函数名是这个 */
export function correctBlur(): Promise<Result<void>> {
  return runVendor('cy_correctRectangleBlur', [], '修正边缘模糊');
}

/**
 * 填充线框互换：`cy_swapWireframeFill` **既是派发 key 也是函数名**（`case 36` → `jsxHistory`）。
 * 无参，走调度通道。
 */
export function swapWireframeFill(): Promise<Result<void>> {
  return runVendor('cy_swapWireframeFill', [], '填充线框互换');
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
  return runVendor('cy_distributedByPitch', [axis, gap, sortMode], '按间距分布');
}

/** 生成安全区参考线：`cy_createSafeAreaGuide([宽度])`，宽度原文照传（空串由命令层拦） */
export function referenceWidth(width: string): Promise<Result<void>> {
  return runVendor('cy_createSafeAreaGuide', [width], '生成安全区域参考线');
}

/**
 * 清除参考线：`cy_guideFunction([1])`，走直调（原版 `jsxNoCheck`）。
 *
 * 切片用的是同一个函数，参数 `2`——拆成两个函数名是为了不让调用方记数字。
 */
export function clearGuide(): Promise<Result<void>> {
  return runDirect('cy_guideFunction', [1], '清除参考线失败');
}

/** 按参考线切片：`cy_guideFunction([2])` */
export function sliceByGuide(): Promise<Result<void>> {
  return runDirect('cy_guideFunction', [2], '按参考线切片失败');
}

/** 打开当前文件所在目录：`cy_openDirectory` **无参**，直调 */
export function openDirectory(): Promise<Result<void>> {
  return runDirect('cy_openDirectory', [], '打开所在目录失败');
}

/* ---------------- v1 只登记、不接线（2） ---------------- */

/**
 * 让 jsx 弹选图对话框并返回路径（`cy_getImagePath`）。
 *
 * 返回结构未实测（可能单张路径、也可能是数组），**这里不解码**，raw 原样交给上层——
 * 按 JSON 解析的话，裸路径串会被判成 `CORRUPT`，把「用户取消了」演成「数据坏了」。
 * 接入方（v2 嵌入图片）必须先处理 `-1` = 取消（原版判据是 `!== -1`）。
 */
export async function getImagePath(): Promise<Result<unknown>> {
  if (!(await requireVendor())) return fail('PS_UNREADY', '官方 PS 能力未就绪');
  const call = await callJsx('cy_getImagePath', []);
  if (call.status === 'error') return call;
  return ok(call.value);
}

/** 扫文件夹取 PSD 列表（`cy_getPsdForFolder`）：jsx 自己弹选目录，**无参**，返回同样不解码 */
export async function getPsdList(): Promise<Result<unknown>> {
  if (!(await requireVendor())) return fail('PS_UNREADY', '官方 PS 能力未就绪');
  const call = await callJsx('cy_getPsdForFolder', []);
  if (call.status === 'error') return call;
  return ok(call.value);
}
