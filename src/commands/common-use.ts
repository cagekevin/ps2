/**
 * 常用页命令层（19 条，v1 17 条）
 *
 * **父子重叠一律走这里**：父网格的格子与两个子面板的按钮调用同一个函数名，
 * 子面板退化为纯 UI（`docs/plan/03-常用-2026-10-27.md` §9 第 1 条 C-1 = A）。
 *
 * 写盘之后的三条规则（同计划 §3.7）：
 *   数据类（setShow / reorder / resetAll）成功 → `store.load()` 重读
 *   参数类（setOption）成功 → 同样重读，**不做本地 patch**（避免面板显示与文件不一致）
 *   折叠（setCollapsed）→ 先落内存立即生效，落盘失败只记日志（偏好不是业务数据）
 * 失败一律原样透传，不把 `IO_ERROR` 说成「读取失败」。
 *
 * 三条硬规则（`CONVENTIONS` §9）：不碰 DOM、不弹 toast、只返回 `Result<T>`。
 */

import { log } from '../core/logger';
import {
  clearGuide as clearGuideJsx,
  correctBlur as correctBlurJsx,
  distribute as distributeJsx,
  exchangeLayerColor as exchangeLayerColorJsx,
  flip as flipJsx,
  layerReplace as layerReplaceJsx,
  locationTrade as locationTradeJsx,
  openDirectory as openDirectoryJsx,
  referenceWidth as referenceWidthJsx,
  sliceByGuide as sliceByGuideJsx,
  swapWireframeFill as swapWireframeFillJsx,
  zoom as zoomJsx,
  type FlipDirection
} from '../core/ps/common-use';
import { flushPrefs, getPref, setPref } from '../core/prefs';
import { COMMON_USE_SEED, normalizeCollapsed } from '../domain/common-use';
import { isCommonUseSettingKey } from '../domain/common-use-options';
import { applyListDrop, type DropPosition } from '../domain/reorder';
import {
  readCommonUseFile,
  updateCommonUseFile,
  updateCommonUseOptions
} from '../repo/common-use-repo';
import type { RawRecords } from '../repo/json-file';
import { useCommonUseStore, type CommonSection } from '../store/common-use';
import { fail, ok, type Result } from '../types/result';

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
    return Promise.resolve(fail('VALIDATION', '请输入有效的缩放倍数'));
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
  if (!text) return Promise.resolve(fail('VALIDATION', '请输入间距'));
  return distributeJsx(axis, text, sortMode);
}

/** 生成安全区参考线：宽度为空提示「请输入宽度」（原版 `useGuide` 同款判据） */
export function referenceWidth(width: string): Promise<Result<void>> {
  const text = width.trim();
  if (!text) return Promise.resolve(fail('VALIDATION', '请输入宽度'));
  return referenceWidthJsx(text);
}

export function clearGuide(): Promise<Result<void>> {
  return clearGuideJsx();
}

export function sliceByGuide(): Promise<Result<void>> {
  return sliceByGuideJsx();
}

/* ---------------- 数据（5） ---------------- */

/**
 * 写成功后重读投影：网格顺序 / 显隐是用户一眼能看出来的东西，不做乐观更新。
 *
 * mutator 拿到的是**原始记录**（`RawRecords`），不是读视图：文件里被跳过的坏项要原样留着。
 */
async function commitFile(mutator: (file: RawRecords) => RawRecords | null) {
  const result = await updateCommonUseFile(mutator);
  if (result.status === 'ok') useCommonUseStore.getState().load();
  return result;
}

/** 改一条常用项：id 不存在就明确失败，不静默不写 */
async function patchItem(
  id: string,
  patch: Record<string, unknown>
): Promise<Result<void>> {
  const file = readCommonUseFile();
  if (file.status === 'error') return file;
  if (!file.value.items.some((item) => item.id === id)) {
    return fail('VALIDATION', '找不到该常用项');
  }

  return commitFile((items) =>
    items.map((item) => (item.id === id ? { ...item, ...patch } : item))
  );
}

/** 显示 / 隐藏一格：写 `sj_commonFunction.json` 的 `isShow` */
export function setShow(id: string, show: boolean): Promise<Result<void>> {
  return patchItem(id, { isShow: show });
}

/**
 * 拖拽排序：落点计算复用 `domain/reorder.applyListDrop`，不自己算下标。
 *
 * 先读一次校验下标（`applyListDrop` 越界抛 `RangeError`，业务函数不抛异常），
 * 写队列里再包一层 try：并发下长度可能变了，此时不写盘并留日志，而不是把异常抛给页面。
 */
export async function reorder(
  from: number,
  to: number,
  position: DropPosition
): Promise<Result<void>> {
  const file = readCommonUseFile();
  if (file.status === 'error') return file;

  /* 长度取原始记录：mutator 拿到的也是原始记录，两边必须是同一个下标空间 */
  const length = file.value.records.length;
  const valid = (value: number) => Number.isInteger(value) && value >= 0 && value < length;
  if (!valid(from) || !valid(to)) {
    return fail('VALIDATION', `排序下标超出范围（0 - ${Math.max(0, length - 1)}）`);
  }

  return commitFile((items) => {
    /* 队列里再对一次长度：两次读之间文件被别的操作改过的话，下标已经指向另一项了，
       宁可这次不写，也不要「拖 1 号却动了 3 号」 */
    if (items.length !== length) {
      log.warn('常用项数量已变化，本次排序未写入', { expected: length, actual: items.length });
      return null;
    }

    const next = [...items];
    try {
      if (applyListDrop(next, from, to, position) < 0) return null;
    } catch (error) {
      log.warn('常用项排序落点无效，未写入', { from, to, position, error: String(error) });
      return null;
    }
    return next;
  });
}

/** 重置为官方 14 项（回 `COMMON_USE_SEED` 的副本，不动只读常量） */
export function resetAll(): Promise<Result<void>> {
  return commitFile(() => COMMON_USE_SEED.map((item) => ({ ...item })));
}

/**
 * 改一个设置项：`path` 只允许 17 个键本身或其一级子路径（`cyExport.ext`）。
 *
 * 不在白名单就返回 `VALIDATION`，**不往 `sj_set.json` 写未知键**——
 * 那是全客户端共用的设置文件，塞错键可能让官方读配置时整份判坏。
 */
export async function setOption(path: string, value: unknown): Promise<Result<void>> {
  const segments = path.split('.');
  const head = segments[0];
  if (!head || !isCommonUseSettingKey(head)) {
    return fail('VALIDATION', `不认识的设置项：${path}`);
  }
  if (segments.length > 2) {
    return fail('VALIDATION', `设置项只允许一级子路径：${path}`);
  }

  const child = segments[1];
  if (segments.length === 2 && !child) {
    return fail('VALIDATION', `设置项路径不完整：${path}`);
  }

  const patch = child ? { [head]: { [child]: value } } : { [head]: value };
  const result = await updateCommonUseOptions(patch);
  if (result.status === 'ok') useCommonUseStore.getState().load();
  return result;
}

/**
 * 折叠 / 展开一个区域：写 `core/prefs`，**不写 `sj_set.json`**
 * （官方那套 `sj_v5_ui.json` 是参考实现自己的偏好文件，不承诺同步）。
 *
 * 内存里立即生效，落盘 200ms 后合并写；落盘失败只记日志——偏好丢了不影响业务。
 */
export function setCollapsed(id: CommonSection, collapsed: boolean): Promise<Result<void>> {
  /* 归一化只有一处（domain.normalizeCollapsed）：读与写不允许各判一套 */
  const next = { ...normalizeCollapsed(getPref<unknown>('common.collapsed', null)), [id]: collapsed };
  setPref('common.collapsed', next);
  /* 只推折叠态，不 `load()`：折叠每点一次就重读两个文件没必要 */
  useCommonUseStore.getState().setCollapsed(next);

  return flushPrefs().then((result) => {
    if (result.status === 'error') {
      log.warn('折叠态写入失败', { reason: result.reason, detail: result.detail });
    }
    return ok(undefined);
  });
}
