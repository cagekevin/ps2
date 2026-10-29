/**
 * 【范本】样式命令
 * 组合原子能力，不碰 DOM、不弹提示，只返回 Result。
 * 参数一律是磁盘原始项，不是视图模型。
 *
 * 命名不用 `use` 开头——会被 React 当成 Hook（react-hooks/rules-of-hooks）。
 *
 * repo / core/ps 现在都返回同一个 Result：失败直接透传（码 + 原因 + detail 原样上抛），
 * 这里不再做任何「换一种失败说法」的重包。
 */

import { openFile, saveFile } from '../core/dialog';
import { MSG } from '../types/messages';
import { exportKuArchive, importKuArchive, kuArchiveDefaultName, type KuImportResult } from '../repo/ku-archive';
import { applyFont, checkFontUsable, getFontInfo } from '../core/ps/font';
import {
  applyBorderColor,
  applyGradient,
  applyShapeFill,
  applyStyle,
  applyStyleColor,
  getForegroundColor,
  getGradientInfo,
  saveLayerStyle,
  setTool
} from '../core/ps/style';
import {
  addKuGroup,
  addKuGroupWithItems,
  addKuItem,
  moveKuGroupTo,
  readKuGroupItems,
  readKuGroupId,
  readKuItem,
  renameKuGroup,
  renameKuItem,
  setKuGroupShow,
  deleteKuGroup,
  deleteKuItem,
  moveKuItemTo
} from '../repo/style-repo';

/**
 * 原样读单项 / 改名 / 删除 / 移动的出口（页面要用**原始记录**，视图模型不带原始数据）。
 *
 * **为什么在这里再导出一次**：`repo/style-repo` 是数据访问层，页面直接调它就绕过了
 * 编排层（`CONVENTIONS` §9：命令层是唯一执行入口）。这里只转发，不加判断——
 * 真要加判断（如「组不存在」给更具体的原因）就在这一层加。
 */
export {
  deleteKuGroup,
  deleteKuItem,
  moveKuItemTo,
  readKuGroupId,
  readKuItem,
  renameKuGroup,
  renameKuItem
};
import { isForegroundSetd, startHostEventWait } from '../core/cep/ps-events';
import {
  buildColorPairGradients,
  createGradientItem,
  type GradientLibraryItem
} from '../domain/image-color';
import { updateSwatchItems } from '../repo/swatch-repo';
import type { JsonMutator } from '../repo/json-file';
import { emitAppEvent } from '../core/cep/bridge';
import { log } from '../core/logger';
import type { DropPosition } from '../domain/reorder';
import type { KuKind, StyleWarehouse } from '../domain/style-library';
import { fail, failWithDetail, ok, type Result } from '../types/result';

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
export function addGroupToLibrary(
  warehouse: StyleWarehouse,
  kind: KuKind,
  name: string,
  afterIndex?: number
): Promise<Result<void>> {
  return addKuGroup(warehouse, kind, name, afterIndex);
}

/**
 * 折叠状态写回库文件。
 * 原版普通点击折叠/展开也写库（不是纯前端状态），照此行为。
 */
export function setGroupShowInLibrary(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number,
  show: boolean
): Promise<Result<void>> {
  return setKuGroupShow(warehouse, kind, groupIndex, show);
}

/** 分组拖拽排序 */
export function moveGroupInLibrary(
  warehouse: StyleWarehouse,
  kind: KuKind,
  from: number,
  to: number,
  position: DropPosition
): Promise<Result<void>> {
  return moveKuGroupTo(warehouse, kind, from, to, position);
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
  if (color.status === 'error') return color;

  return addKuItem(warehouse, kind, groupIndex, color.value);
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
  if (gradient.status === 'error') return gradient;

  return addKuItem(warehouse, kind, groupIndex, {
    name: MSG.style.untitledName,
    gradient: gradient.value
  });
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
  if (info.status === 'error') return info;

  return addKuItem(warehouse, kind, groupIndex, info.value);
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
  if (groupId.status === 'error') return groupId;

  return saveLayerStyle(groupId.value);
}

/* ---------------- 色板（原版 :50348-50364 / :50260-50290） ---------------- */

/**
 * 色板写成功后的通知事件。
 * 原版 `sendMessageToSeBan()`（`:50216-50218`）= `$cep.sendAppEvent("com.fengzi.event.seban","GengXin")`。
 * 本地模式没有色板面板收事件，发了无害——官方面板在的话它自己会刷新。
 */
const SWATCH_EVENT = 'com.fengzi.event.seban';

/** 改色板并广播；写失败返回错误（不让用户以为发送成功） */
async function persistSwatchUpdate(
  mutator: JsonMutator<unknown[]>
): Promise<Result<void>> {
  const written = await updateSwatchItems(mutator);
  if (written.status === 'error') return written;

  /*
   * 写盘已经成功，广播失败**不升级成业务失败**（色板数据是对的，只是官方面板不会自动刷新）；
   * 但必须留痕，否则「官方色板面板为什么不更新」查不到原因。
   */
  const broadcast = emitAppEvent(SWATCH_EVENT, 'GengXin');
  if (broadcast.status === 'error') {
    log.warn('色板已写入，但广播官方事件失败', {
      code: broadcast.code,
      reason: broadcast.reason,
      detail: broadcast.detail
    });
  }
  return ok(undefined);
}

/** 整份替换色板 */
function persistSwatch(items: unknown[]): Promise<Result<void>> {
  return persistSwatchUpdate(() => ok(items));
}

/** 发送到色板（单项）：整份替换为 `[项]`（原版 `:50348-50355`） */
export async function sendItemToSwatch(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number,
  itemIndex: number
): Promise<Result<void>> {
  const raw = readKuItem(warehouse, kind, groupIndex, itemIndex);
  if (raw.status === 'error') return raw;

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
  if (raw.status === 'error') return raw;

  return persistSwatchUpdate((current) => ok([...current, raw.value]));
}

/** 发送到色板（整组替换为该组 list，原版 `:50260-50268`） */
export async function sendGroupToSwatch(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number
): Promise<Result<void>> {
  const group = readKuGroupItems(warehouse, kind, groupIndex);
  if (group.status === 'error') return group;

  return persistSwatch(group.value);
}

/** 追加到色板（整组逐项 push，原版 `:50269-50290`） */
export async function appendGroupToSwatch(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number
): Promise<Result<void>> {
  const group = readKuGroupItems(warehouse, kind, groupIndex);
  if (group.status === 'error') return group;

  return persistSwatchUpdate((current) => ok([...current, ...group.value]));
}

/**
 * 应用字体：先查可用性，再应用。
 * 字体缺失时直接返回失败，不发注定无效的调用。
 */
export async function applyFontToLayer(item: Record<string, unknown>): Promise<Result<void>> {
  /* 不可用的原因由 `checkFontUsable` 给出（宿主原话：字体缺失 / 请选择文字图层） */
  const check = await checkFontUsable(item);
  if (check.status === 'error') return check;

  return applyFont(item);
}

/* ---------------- 快速吸色到组（原版 `:50293-50304`，app 的 pickColorToGroup） ---------------- */

/** 吸管挂在 PS 上等用户的超时（app 的 EYEDROPPER_TIMEOUT） */
const EYEDROPPER_TIMEOUT = 60_000;

/**
 * 快速吸色到组：切吸管 → 等 PS 事件 → 读前景色 → 追加到组。
 *
 * 事件判据（app T-87）：只有 `setd` 改了**前景色**才算完成；选区变化 = 用户取消。
 * 先订阅再切工具——切完用户可能立刻吸色，晚订阅会漏事件。
 */
export async function pickColorToGroup(
  warehouse: StyleWarehouse,
  kind: KuKind,
  groupIndex: number
): Promise<Result<void>> {
  /*
   * 先订阅再切工具：切完用户可能立刻吸色，晚订阅会漏事件（官方同序）。
   * 订阅 / 超时 / 退订的生命周期封在 `startHostEventWait` 里，这里只递判据。
   */
  const waiter = await startHostEventWait('setd', isForegroundSetd, {
    timeoutMs: EYEDROPPER_TIMEOUT,
    cancelOn: ['selection']
  });
  if (waiter.status === 'error') return waiter;

  try {
    const switched = await setTool('eyedropperTool');
    if (switched.status === 'error') return switched;

    const outcome = await waiter.value.result;
    /* 用户切走选区 = 主动放弃，不是故障 */
    if (outcome.kind === 'cancelled') {
      return failWithDetail('CANCELLED', MSG.codeReason.CANCELLED, 'pick:cancelled');
    }
    if (outcome.kind === 'timeout') {
      return failWithDetail('TIMEOUT', MSG.style.pickTimeout, 'pick:timeout');
    }
  } finally {
    waiter.value.close();
  }

  /* 与「添加颜色」同一条路径：读前景色 → 追加到组 */
  const color = await getForegroundColor();
  if (color.status === 'error') return color;

  return addKuItem(warehouse, kind, groupIndex, color.value);
}

/* ---------------- 导入 / 导出（.kux 容器，原版 :49844-49874 四个菜单入口） ---------------- */

/** 导入预设仓库（覆盖）：旧文件先进回收目录，索引整份替换 */
export function importKuReplace(): Promise<Result<KuImportResult>> {
  const path = openFile(MSG.style.dialogImport, ['kux']);
  if (!path) return Promise.resolve(fail('CANCELLED', MSG.codeReason.CANCELLED));
  return importKuArchive(false, path);
}

/** 追加预设仓库：只往索引 push 仓库，本地已有文件不动 */
export function importKuAppend(): Promise<Result<KuImportResult>> {
  const path = openFile(MSG.style.dialogAppend, ['kux']);
  if (!path) return Promise.resolve(fail('CANCELLED', MSG.codeReason.CANCELLED));
  return importKuArchive(true, path);
}

/** 导出所有仓库 */
export function exportKuAll(): Promise<Result<void>> {
  const path = saveFile(MSG.style.dialogExportAll, ['kux'], kuArchiveDefaultName(false));
  if (!path) return Promise.resolve(fail('CANCELLED', MSG.codeReason.CANCELLED));
  return Promise.resolve(exportKuArchive(false, path));
}

/** 导出当前仓库 */
export function exportKuCurrent(): Promise<Result<void>> {
  const path = saveFile(MSG.style.dialogExportCurrent, ['kux'], kuArchiveDefaultName(true));
  if (!path) return Promise.resolve(fail('CANCELLED', MSG.codeReason.CANCELLED));
  return Promise.resolve(exportKuArchive(true, path));
}

/**
 * 应用提取色（原版 `setColor` `:52909-52914`）。
 *
 * 原版在前端把 hex 转 CMYK 再发 vendor；我们走移植版 `mm_style_applyColor`，
 * CMYK 分流在 jsx 内部做——前端只发库项形状，CMYK 字段由库里已有项自带。
 */
export function applyColorByHex(hex: string): Promise<Result<void>> {
  return applyStyleColor({ name: MSG.style.untitledName, color: { hex } });
}

/** 应用提取的渐变对（原版 `setGrad` `:52905-52908`：createGradientItem → ys_useGradient） */
export function applyGradientPair(pair: [string, string]): Promise<Result<void>> {
  const item: GradientLibraryItem = createGradientItem(MSG.style.untitledName, pair);
  return applyGradient(item.gradient);
}

/**
 * 提取色整份写入色板（原版 `saveSeban` `:52915-52919`：write + app event）。
 * 注意原版语义就是**整份替换**色板文件——不是追加。
 */
export async function saveExtractedToSwatch(hexes: string[]): Promise<Result<void>> {
  const items = hexes.map((hex) => ({
    name: MSG.style.untitledName,
    color: { hex: hex.replace('#', '') }
  }));
  return persistSwatch(items);
}

/** 提取色新建「提取颜色组」分组（原版 `saveColor` 经 appBus 让样式页建组，这里直接写库） */
export function saveExtractedColorsToGroup(
  warehouse: StyleWarehouse,
  hexes: string[]
): Promise<Result<void>> {
  const items = hexes.map((hex) => ({
    name: MSG.style.untitledName,
    color: { hex: hex.replace('#', '') }
  }));
  return addKuGroupWithItems(warehouse, 'color', MSG.style.groupFromColors, items);
}

/** 提取色两两成渐变，新建「提取渐变组」分组（原版 `saveGrad` `:52882-52901`） */
export function saveExtractedGradientsToGroup(
  warehouse: StyleWarehouse,
  hexes: string[]
): Promise<Result<void>> {
  const pairs = buildColorPairGradients(hexes).slice(0, 30);
  const items = pairs.map(({ pair }) => createGradientItem(MSG.style.untitledName, pair));
  return addKuGroupWithItems(warehouse, 'gradient', MSG.style.groupFromGradients, items);
}
