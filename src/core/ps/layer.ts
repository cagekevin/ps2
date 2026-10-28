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
import { requireCore } from './init';
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
  if (!(await requireCore())) return failWithDetail('PS_UNREADY', 'PS 脚本未加载', 'core:false');

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
  const kind = kindRaw.startsWith('unknown') ? 'unknown' : (kindRaw as LayerKind);

  return ok({
    kind: VALID_KINDS.includes(kind) ? kind : 'unknown',
    name
  });
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
