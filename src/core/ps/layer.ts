/**
 * 【范本】PS 图层能力
 * 只做一件事：把 jsx 结果转成类型化的 Result，不做业务判断。
 * 新增能力：core/ps 函数 + jsx 同名镜像（mm_<域>_<动作>）。
 *
 * 图层类型的唯一判定处在 jsx（`mm_layer_kindOf`），这里的 VALID_KINDS 只是白名单兜底。
 */

import { callJsx } from '../cep/bridge';
import { failWithDetail, ok, type Result } from '../../types/result';
import { LAYER_KIND_LABEL, type LayerKind } from '../../types/layer';
import { gateFailed } from './capability';
import { funcMissing, requireCore } from './init';
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
  if (!(await requireCore())) return gateFailed('core');

  /* 轮询专用：不记 info，避免日志被刷屏 */
  const call = await callJsx('mm_layer_getState', [], { silent: true });
  if (call.status === 'error') return call;

  const guard = unwrapRaw(call.value);
  if (guard.status === 'error') return guard;

  const raw = call.value;

  /* 名称里可能含 '|'，只切第一个 */
  const index = raw.indexOf('|');
  if (index < 0) return failWithDetail('PS_ERROR', '图层信息格式错误', `raw:${raw}`);

  const kindRaw = raw.slice(0, index);
  const name = raw.slice(index + 1);
  /* 白名单查表：查不到就是 `unknown`，不给「硬转成联合类型」留口子 */
  const kind = VALID_KINDS.find((item) => item === kindRaw) ?? 'unknown';

  return ok({ kind, name });
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
  if (!(await requireCore())) return gateFailed('core');

  /* 函数没加载（旧 jsx）就如实报，不要让它去调一个不存在的函数变成 EvalScript error */
  if (await funcMissing('mm_layer_getSelection')) {
    return failWithDetail('PS_UNREADY', '「mm_layer_getSelection」未加载', 'fn:mm_layer_getSelection');
  }

  const call = await callJsx('mm_layer_getSelection', []);
  if (call.status === 'error') return call;

  const guard = unwrapRaw(call.value);
  if (guard.status === 'error') return guard;

  const count = Number(call.value.trim());
  if (!Number.isInteger(count) || count < 0) {
    return failWithDetail('CORRUPT', '图层数量不是整数', `raw:${call.value}`);
  }
  return ok(count);
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
