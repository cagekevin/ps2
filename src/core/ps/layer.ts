/**
 * 【范本】PS 图层能力
 * 只做一件事：把 jsx 结果转成类型化的 Result，不做业务判断。
 * 新增能力：core/ps 函数 + jsx 同名镜像（mm_<域>_<动作>）。
 *
 * 图层类型的唯一判定处在 jsx（`mm_layer_kindOf`），这里的 VALID_KINDS 只是白名单兜底。
 */

import { callDirect } from './capability';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import { LAYER_KIND_LABEL, type LayerKind } from '../../types/layer';
import { unwrapRaw } from './raw';

const VALID_KINDS: LayerKind[] = ['normal', 'shape', 'text', 'smartObject', 'group', 'unknown'];

export interface LayerState {
  kind: LayerKind;
  name: string;
}

/**
 * 一次拿到类型 + 名称（唯一入口）。
 *
 * 两个消费者：`app/layer-watcher` 轮询、`core/ps/text` 的读函数判「当前是不是文字图层」
 * （非文字图层上 PS 会直接抛错，见 `text.ts` 文件头第 3 条）。
 */
export async function getLayerState(): Promise<Result<LayerState>> {
  /* **不进能力表**：它是本域的**内部基础设施**（`requireSelection` / `requireLayerKind` 的输入），
     页面/命令从不直接触发它。进表会让 `layer` 反向 import `capabilities` —— 那正是 2026-10-31
     解掉的那个环的成因（环是症状，职责错位才是病：域内查询被当成了对外能力）。 */
  const call = await callDirect('mm_layer_getState', [], { gate: 'core', silent: true });
  if (call.status === 'error') return call;

  const parsed = layerStateRaw(call.value);
  if (parsed.status === 'error') return parsed;

  /* 白名单查表：查不到就是 `unknown`，不给「硬转成联合类型」留口子。
     切分 `kind|name` 是结构，归 `raw.layerStateRaw`；这里只判「这个 kind 认不认识」。 */
  const kind = VALID_KINDS.find((item) => item === parsed.value.kind) ?? 'unknown';
  return ok({ kind, name: parsed.value.name });
}

/**
 * 前提判断的**唯一出口**：当前图层类型必须在 `allow` 里。
 *
 * 为什么不各自判：不满足时 PS 不是返回 `{err:1}`，而是直接抛
 * 「命令"获取/设置"当前不可用」——那句原文会被当成失败原因显示出来，
 * 于是「没选中文字」被说成「Photoshop 版本不支持」。每个能力各写一遍判断，
 * 迟早有一处漏写、文案也各说一套；所以只在 `core/ps/layer` 判一次。
 *
 * `need` 是给人看的目标名（「文字图层」/「形状图层」/「智能对象」）；
 * 提示里同时给出当前实际类型，用户才知道该换成什么。
 */
export async function requireLayerKind(
  allow: readonly LayerKind[],
  need: string
): Promise<Result<void>> {
  const layer = await getLayerState();
  if (layer.status === 'error') return layer;
  if (!allow.includes(layer.value.kind)) {
    return failWithDetail(
      'PS_WRONG_LAYER',
      `当前图层是「${LAYER_KIND_LABEL[layer.value.kind]}」，需要「${need}」`,
      `kind:${layer.value.kind}`
    );
  }
  return ok(undefined);
}

/** 文字属性读写的前提（`requireLayerKind` 的语义化快捷方式） */
export function requireTextLayer(): Promise<Result<void>> {
  return requireLayerKind(['text'], '文字图层');
}

/** 形状相关操作的前提 */
export function requireShapeLayer(): Promise<Result<void>> {
  return requireLayerKind(['shape'], '形状图层');
}

/**
 * 当前选中的图层数量（`mm_layer_getSelection`）。
 *
 * 与 `getLayerState` 分成两个 jsx：那个被 `layer-watcher` 每 800ms 调一次，返回协议不能动
 * （新旧 jsx 混用会静默解析错）；这个只在「需要多选」的能力点击时调，低频。
 */
export async function getSelectionCount(): Promise<Result<number>> {
  /* 同上：域内基础设施，不进表 */
  const call = await callDirect('mm_layer_getSelection', [], { gate: 'core' });
  if (call.status === 'error') return call;
  return selectionCountRaw(call.value);
}

/**
 * 多选前提：至少 `min` 个图层被选中。
 *
 * 用在「成对才有意义」的操作上：位置对换、图层颜色互换、按间距分布——单选时 PS 会返回
 * `-1`（一句笼统的「请确认已选中图层」），这里提前说清「当前选中几个、需要几个」。
 * 数量不足不是故障（多选几个就好），用 `PS_WRONG_LAYER` 让 `StateHint` 走灰字。
 */
export async function requireSelection(min: number): Promise<Result<void>> {
  const count = await getSelectionCount();
  if (count.status === 'error') return count;

  if (count.value < min) {
    return failWithDetail(
      'PS_WRONG_LAYER',
      `当前选中 ${count.value} 个图层，需要至少 ${min} 个`,
      `selection:${count.value}`
    );
  }
  return ok(undefined);
}

/*
 * ---------------- 本域私有的两个解析器 ----------------
 *
 * **为什么写在 `layer.ts` 而不是 `raw.ts`**：它们各自只服务**一个**能力，
 * 而且解的是图层域的私有协议（`kind|name`、选中数量）。放进 `raw.ts` 的公共清单，
 * 等于让每个"加能力的人"都要多认两个名字，而他一辈子用不上 —— 负担是别人付的。
 *
 * 判据：`raw.ts` 只放**通用骨架**（≥2 个能力会用，或纯结构工具）；
 * 一个能力专用的解析器就近写在自己的域模块里，只被本域的 CAP 行引用。
 */

/**
 * `mm_layer_getState` 的 `kind|name`：**只切第一个 `|`**（图层名里可能含它）。
 *
 * 只做结构切分，**不判 kind 合不合法** —— 白名单是语义，在 `getLayerState` 里查
 * （`VALID_KINDS`）。
 */
export function layerStateRaw(raw: string): Result<{ kind: string; name: string }> {
  const guard = unwrapRaw(raw);
  if (guard.status === 'error') return guard;

  const index = raw.indexOf('|');
  if (index < 0) return failWithDetail('PS_ERROR', MSG.codeReason.PS_ERROR, `raw:${raw}`);

  return ok({ kind: raw.slice(0, index), name: raw.slice(index + 1) });
}

/**
 * `mm_layer_getSelection` 的选中数量：单个非负整数。
 *
 * 空串必须单独判：`Number('')` 是 **0**，不判就会被当成「选中 0 个」静默通过。
 */
export function selectionCountRaw(raw: string): Result<number> {
  const guard = unwrapRaw(raw);
  if (guard.status === 'error') return guard;

  const text = raw.trim();
  if (text === '') return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, 'raw:<empty>');

  const value = Number(text);
  if (!Number.isInteger(value) || value < 0) {
    return failWithDetail('CORRUPT', MSG.codeReason.CORRUPT, `shape:notInt raw:${text}`);
  }
  return ok(value);
}
