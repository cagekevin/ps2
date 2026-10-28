/**
 * 【范本】PS 图层能力
 * 只做一件事：把 jsx 结果转成类型化的 Result，不做业务判断。
 * 新增能力：core/ps 函数 + jsx 同名镜像（mm_<域>_<动作>）。
 *
 * 图层类型的唯一判定处在 jsx（`mm_layer_kindOf`），这里的 VALID_KINDS 只是白名单兜底。
 */

import { callJsx } from '../cep/bridge';
import { failWithDetail, ok, type Result } from '../../types/result';
import type { LayerKind } from '../../types/layer';
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
