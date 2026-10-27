/**
 * 【范本】样式命令
 * 组合原子能力，不碰 DOM、不弹提示，只返回 Result。
 * 参数一律是磁盘原始项，不是视图模型。
 *
 * 命名不用 `use` 开头——会被 React 当成 Hook（react-hooks/rules-of-hooks）。
 */

import { applyFont, checkFontUsable, getFontInfo } from '../core/ps/font';
import {
  applyBorderColor,
  applyGradient,
  applyShapeFill,
  applyStyle,
  applyStyleColor,
  getForegroundColor,
  getGradientInfo,
  saveLayerStyle
} from '../core/ps/style';
import {
  addKuGroup,
  addKuItem,
  moveKuGroupTo,
  readKuGroupItems,
  readKuGroupId,
  readKuItem,
  setKuGroupShow
} from '../repo/style-repo';
import { readSwatchItems, writeSwatchItems } from '../repo/swatch-repo';
import { emitAppEvent } from '../core/cep/bridge';
import type { DropPosition } from '../domain/reorder';
import type { KuKind, StyleWarehouse } from '../domain/style-library';
import { fail, ok, type Result } from '../types/result';
import { toResult } from '../types/read';

/** 把颜色应用到当前图层（按图层类型自动分流） */
export function applyColor(item: Record<string, unknown>): Promise<Result<void>> {
  return applyStyleColor(item);
}

/** ctrl + 点：智能填充形状（只改填充色） */
export function applyShapeFillToLayer(item: Record<string, unknown>): Promise<Result<void>> {
  return applyShapeFill(item);
}

/** shift + 点：设线框色（只改描边色） */
export function applyBorderColorToLayer(item: Record<string, unknown>): Promise<Result<void>> {
  return applyBorderColor(item);
}

/** 应用渐变：原版发的是 item.gradient，不是整个项 */
export function applyGradientToLayer(gradient: unknown): Promise<Result<void>> {
  return applyGradient(gradient);
}

/** 应用图层样式 */
export function applyLayerStyle(item: Record<string, unknown>, groupId: string): Promise<Result<void>> {
  return applyStyle(item, groupId);
}

/**
 * 新建分组。`afterIndex` 缺省时追加到末尾（底栏「添加×分组」按钮走这条）。
 */
export async function addGroupToLibrary(
  warehouse: StyleWarehouse,
  kind: KuKind,
  name: string,
  afterIndex?: number
): Promise<Result<void>> {
  return toResult(await addKuGroup(warehouse, kind, name, afterIndex));
}

/**
 * 折叠状态写回库文件。
 * 原版普通点击折叠/展开也写库（不是纯前端状态），照此行为。
 */
export async function setGroupShowInLibrary(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number,
  show: boolean
): Promise<Result<void>> {
  return toResult(await setKuGroupShow(warehouse, kind, groupIndex, show));
}

/** 分组拖拽排序 */
export async function moveGroupInLibrary(
  warehouse: StyleWarehouse,
  kind: KuKind,
  from: number,
  to: number,
  position: DropPosition
): Promise<Result<void>> {
  return toResult(await moveKuGroupTo(warehouse, kind, from, to, position));
}

/**
 * 把当前前景色存进库文件的指定分组。
 *
 * 取色在 jsx 里做（`app.foregroundColor`），前端不碰颜色格式——
 * 库项形状由 `mm_style_getForegroundColor` 直接给全。
 */
export async function addForegroundColorToLibrary(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number
): Promise<Result<void>> {
  const color = await getForegroundColor();
  if (!color.ok) return color;

  return toResult(await addKuItem(warehouse, kind, groupIndex, color.data));
}

/**
 * 把当前图层的渐变存进分组（原版 `app.v4.js:50755-50771`）。
 * 载荷就是渐变项里的 `gradient` 字段，包成 `{ name: '未命名', gradient }` 入库。
 */
export async function addGradientFromLayer(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number
): Promise<Result<void>> {
  const gradient = await getGradientInfo();
  if (!gradient.ok) return gradient;

  return toResult(
    await addKuItem(warehouse, kind, groupIndex, {
      name: '未命名',
      gradient: gradient.data
    })
  );
}

/**
 * 把当前文字图层的字体属性存进分组（原版 `addFont` `:51243-51264`）。
 * `{ fonts: [...] }` 整份原样入库，不补键、不改写。
 */
export async function addFontFromLayer(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number
): Promise<Result<void>> {
  const info = await getFontInfo();
  if (!info.ok) return info;

  return toResult(await addKuItem(warehouse, kind, groupIndex, info.data));
}

/**
 * 把当前图层样式保存进分组（原版 `:51532-51560`）。
 *
 * `ys_AddStyle` 由 jsxbin 负责写 `kuStyle/<groupId>.psd` 和缩略图；
 * 库文件是否由它更新未实测（app 同位置也是 UNVERIFIED），成功后调用方重读。
 */
export async function addStyleFromLayer(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number
): Promise<Result<void>> {
  const groupId = readKuGroupId(warehouse, kind, groupIndex);
  if (!groupId) return fail('NOT_FOUND', '分组缺少 id，无法定位样式资源');

  return saveLayerStyle(groupId);
}

/* ---------------- 色板（原版 :50348-50364 / :50260-50290） ---------------- */

/**
 * 色板写成功后的通知事件。
 * 原版 `sendMessageToSeBan()`（`:50216-50218`）= `$cep.sendAppEvent("com.fengzi.event.seban","GengXin")`。
 * 本地模式没有色板面板收事件，发了无害——官方面板在的话它自己会刷新。
 */
const SWATCH_EVENT = 'com.fengzi.event.seban';

/** 写色板并广播；写失败返回错误（不让用户以为发送成功） */
async function persistSwatch(items: unknown[]): Promise<Result<void>> {
  const written = await writeSwatchItems(items);
  if (!written) return fail('IO_ERROR', '写入色板文件失败');

  emitAppEvent(SWATCH_EVENT, 'GengXin');
  return ok(undefined);
}

/** 发送到色板（单项）：整份替换为 `[项]`（原版 `:50348-50355`） */
export async function sendItemToSwatch(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number,
  itemIndex: number
): Promise<Result<void>> {
  const raw = readKuItem(warehouse, kind, groupIndex, itemIndex);
  if (raw.status !== 'ok') {
    return fail(raw.status === 'missing' ? 'NOT_FOUND' : 'CORRUPT', '库文件不存在');
  }

  return persistSwatch([raw.value]);
}

/** 追加到色板（单项）：读回 → push → 写回（原版 `:50356-50364`） */
export async function appendItemToSwatch(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number,
  itemIndex: number
): Promise<Result<void>> {
  const raw = readKuItem(warehouse, kind, groupIndex, itemIndex);
  if (raw.status !== 'ok') {
    return fail(raw.status === 'missing' ? 'NOT_FOUND' : 'CORRUPT', '库文件不存在');
  }

  const swatch = readSwatchItems();
  if (swatch.status !== 'ok') return toResult(swatch);

  return persistSwatch([...swatch.value, raw.value]);
}

/** 发送到色板（整组替换为该组 list，原版 `:50260-50268`） */
export async function sendGroupToSwatch(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number
): Promise<Result<void>> {
  const group = readKuGroupItems(warehouse, kind, groupIndex);
  if (group.status !== 'ok') {
    return fail(group.status === 'missing' ? 'NOT_FOUND' : 'CORRUPT', '库文件不存在');
  }

  return persistSwatch(group.value);
}

/** 追加到色板（整组逐项 push，原版 `:50269-50290`） */
export async function appendGroupToSwatch(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number
): Promise<Result<void>> {
  const group = readKuGroupItems(warehouse, kind, groupIndex);
  if (group.status !== 'ok') {
    return fail(group.status === 'missing' ? 'NOT_FOUND' : 'CORRUPT', '库文件不存在');
  }

  const swatch = readSwatchItems();
  if (swatch.status !== 'ok') return toResult(swatch);

  return persistSwatch([...swatch.value, ...group.value]);
}

/**
 * 应用字体：先查可用性，再应用。
 * 字体缺失时直接返回失败，不发注定无效的调用。
 */
export async function applyFontToLayer(item: Record<string, unknown>): Promise<Result<void>> {
  const check = await checkFontUsable(item);
  if (!check.ok) return check;
  if (!check.data) return fail('PS_ERROR', '字体不可用（系统里可能没装这个字体）');

  return applyFont(item);
}
