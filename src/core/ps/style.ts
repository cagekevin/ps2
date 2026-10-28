/**
 * 【范本】PS 样式应用能力
 *
 * 两条路径，各用已验证的实现：
 *
 * **颜色** → 我们自己的 `mm_style_applyColor`（jsx/main.jsx）
 *   移植自色板面板的明文实现，按图层类型分四路（普通/形状/智能对象/文字）。
 *   不用 vendor 的 `ys_useStyleColor`：它在「自动填充」关闭时只改前景色、
 *   不碰图层，表现为「返回 1 但图层没变」。
 *
 * **渐变 / 图层样式** → vendor 的统一调度 `ps_onJsx`
 *   原版通过 `{ f, arr, n }` 调度（cep-events.js:156-165），不能直接调 `ys_*`，
 *   否则报「缺少必需值」。`n` 是日志标签，不传给 jsx 函数本身。
 *
 * 项必须是磁盘原始项（含 isFill 等未知键），isFill 加在**顶层**。
 *
 * 门 / 通道 / 超时 / 解析都在能力表（`./capabilities.ts`）里，本文件只拼参数。
 * 只剩 `saveLayerStyle` 留在本文件（`err===1` 折 `PS_ERROR` 而不是 `VALIDATION`，且没有
 * `false` 分支，与 `strictVoid` / `strictPayload` 都不同档）。
 */

import { callJsx, WRITE_TIMEOUT } from '../cep/bridge';
import { ROOTS } from '../storage';
import { failWithDetail, ok, type Result } from '../../types/result';
import { callCapability, gateFailed } from './capability';
import { CAP } from './capabilities';
import { requireVendor } from './init';
import { parseErrEnvelope } from './raw';

/**
 * 应用颜色。
 *
 * 走 `mm_style_applyColor`（移植自色板面板），按图层类型分别处理：
 * 普通图层填充、形状改填充/描边、智能对象加颜色叠加、文字改文字色。
 */
export function applyStyleColor(item: Record<string, unknown>): Promise<Result<void>> {
  /* 移植版只读 item.color，不认 isFill——别照 vendor 的写法加这个键 */
  return callCapability(CAP.applyStyleColor, [item]);
}

/**
 * 智能填充形状（ctrl + 点色块）：只改填充色。
 * 走移植的 `mm_style_applyShapeFill`，只对形状图层有效。
 */
export function applyShapeFill(item: Record<string, unknown>): Promise<Result<void>> {
  return callCapability(CAP.applyShapeFill, [item]);
}

/** 设线框色（shift + 点色块）：只改描边色，只对形状图层有效 */
export function applyBorderColor(item: Record<string, unknown>): Promise<Result<void>> {
  return callCapability(CAP.applyBorderColor, [item]);
}

/**
 * 取当前前景色，返回库项形状：`{ name, color: { hex, c, m, y, k } }`。
 * 供「添加颜色」直接写进库文件，不需要前端再转换。
 */
export async function getForegroundColor(): Promise<Result<Record<string, unknown>>> {
  const result = await callCapability(CAP.foregroundColor);
  if (result.status === 'error') return result;

  /* 载荷形状由 jsx 决定，这里只做类型收敛（与迁移前同一处断言，未加字段校验） */
  return ok(result.value as Record<string, unknown>);
}

/**
 * 读取当前图层的渐变定义（原版 `app.v4.js:50755-50771`）。
 *
 * 返回值三种：`false` = 图层没有渐变；`{err:1}` = 读取失败；其余为渐变载荷。
 * 载荷形状就是渐变项里的 `gradient` 字段（渐变应用已验证过这个结构）。
 */
export function getGradientInfo(): Promise<Result<unknown>> {
  /* 三态（false / err:1 / 载荷）与载荷校验都在 `CAP.gradientInfo` 的 `strictPayload` 里 */
  return callCapability(CAP.gradientInfo);
}

/**
 * 保存当前图层样式到分组（原版 `app.v4.js:51532-51536`）。
 *
 * 发 `{ delArr: [], groupId, envDir: '/SheJiZhuLi' }`——`delArr` 是「删除样式后
 * 告诉 jsxbin 哪些该删」的临时清单，添加新样式不需要删东西，传空数组。
 *
 * jsxbin 自己负责把 PSD / 缩略图写进 `kuStyle/<groupId>.psd|png`；
 * 库文件是否由它更新未实测（app 同位置也是 UNVERIFIED），成功后前端重读一次。
 */
export async function saveLayerStyle(groupId: string): Promise<Result<void>> {
  if (!(await requireVendor())) return gateFailed('vendor');

  /* envDir 是原版 jsxbin 写 PSD 时的目录名，与数据根同值——别在这里再写一份字面量 */
  const call = await callJsx(
    'ys_AddStyle',
    [{ delArr: [], groupId, envDir: ROOTS.legacy }],
    { timeout: WRITE_TIMEOUT }
  );
  if (call.status === 'error') return call;

  const err = parseErrEnvelope(call.value);
  if (err.status === 'error') return err;
  if (err.value === 1) {
    return failWithDetail('PS_ERROR', '保存图层样式失败', `raw:${call.value}`);
  }

  return ok(undefined);
}

/** 应用渐变：原版传的是项里的 gradient 字段 */
export function applyGradient(gradient: unknown): Promise<Result<void>> {
  return callCapability(CAP.applyGradient, [gradient]);
}

/** 切换 PS 工具（快速吸色用：`Tool_set('eyedropperTool')`，直调通道） */
export function setTool(tool: string): Promise<Result<void>> {
  return callCapability(CAP.setTool, [tool]);
}

/** 应用图层样式：{ ...项, groupId } */
export function applyStyle(item: Record<string, unknown>, groupId: string): Promise<Result<void>> {
  return callCapability(CAP.applyStyle, [{ ...item, groupId }]);
}
