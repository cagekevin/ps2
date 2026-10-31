/**
 * 【范本】PS 样式应用能力
 *
 * **颜色只有一条路**：vendor 的 `ys_useStyleColor`，走调度通道 `ps_onJsx`。
 * 它一次处理**所有选中图层**，单选多选是同一个调用，前端不判数量、不循环 ——
 * 官方 `app.v4.js:17894-17900` 也是只发一项交给它。
 *
 * 不能照抄色板面板那份 jsx（`sb_cy_SheZhiQianJingSe`）：它 `iTuCengGeShu == 1` 才上色，
 * 多选只设前景色，抄过来就是「界面提示成功、图层没变」。
 *
 * **渐变 / 图层样式** → vendor 的统一调度 `ps_onJsx`
 *   原版通过 `{ f, arr, n }` 调度（cep-events.js:156-165），不能直接调 `ys_*`，
 *   否则报「缺少必需值」。`n` 是日志标签，不传给 jsx 函数本身。
 *
 * 颜色参数是**扁平**对象 + 顶层 `isFill`，不是库项 —— vendor 只认这个形状。
 *
 * 门 / 通道 / 超时 / 解析都在能力表（`./capabilities.ts`）里，本文件只拼参数。
 * 只剩 `saveLayerStyle` 留在本文件（`err===1` 折 `PS_ERROR` 而不是 `VALIDATION`，且没有
 * `false` 分支，与 `strictVoid` / `strictPayload` 都不同档）。
 */

import { WRITE_TIMEOUT } from '../cep/bridge';
import { ROOTS } from '../storage';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import { callCapability, callDirect } from './capability';
import { CAP } from './capabilities';
import { parseErrEnvelope } from './raw';

/** 应用颜色要的完整色值：四个分量都必填 —— 缺一个，vendor 拿到残缺对象既不报错也不上色 */
export interface AppColor {
  hex: string;
  c: number;
  m: number;
  y: number;
  k: number;
}

/**
 * 应用颜色：**单选、多选同一个调用**，遍历选中层在 vendor 内部完成。
 *
 * 入参**只收完整色值**，不收库项：`JSON.stringify` 会把 `undefined` 的键整个删掉，
 * 传残缺对象的结果是「不报错、不上色」。库项 → 完整色值的拍平与补齐在
 * `commands/style` 的 `toAppColor`（那里能 import `domain` 的 `hexToCmyk`）。
 */
export function applyStyleColor(color: AppColor): Promise<Result<void>> {
  return callCapability(CAP.useStyleColor, [{ ...color, isFill: true }]);
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
  /* envDir 是原版 jsxbin 写 PSD 时的目录名，与数据根同值——别在这里再写一份字面量 */
  const call = await callDirect(
    'ys_AddStyle',
    [{ delArr: [], groupId, envDir: ROOTS.legacy }],
    { gate: 'vendor', timeout: WRITE_TIMEOUT }
  );
  if (call.status === 'error') return call;

  const err = parseErrEnvelope(call.value);
  if (err.status === 'error') return err;
  if (err.value === 1) {
    return failWithDetail('PS_ERROR', MSG.codeReason.PS_ERROR, `saveLayerStyle raw:${call.value}`);
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
