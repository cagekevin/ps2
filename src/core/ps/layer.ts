/**
 * 【范本】PS 图层能力
 * 只做一件事：把 jsx 结果转成类型化的 Result，不做业务判断。
 * 新增能力：core/ps 函数 + jsx 同名镜像（mm_<域>_<动作>）。
 */

import { callJsx } from '../cep/bridge';
import { fail, ok, type Result } from '../../types/result';
import type { LayerKind } from '../../types/layer';
import { requireCore } from './init';

const VALID_KINDS: LayerKind[] = ['normal', 'shape', 'text', 'smartObject', 'group', 'unknown'];

export async function getLayerKind(): Promise<Result<LayerKind>> {
  if (!(await requireCore())) return fail('PS_ERROR', 'PS 脚本未加载');

  const call = await callJsx('mm_layer_getKind');
  if (!call.ok) return fail('PS_ERROR', call.reason);

  const raw = call.raw;
  if (raw === 'no-doc') return fail('PS_ERROR', '没有打开的文档');

  const value = raw.startsWith('unknown') ? 'unknown' : (raw.trim() as LayerKind);
  return ok(VALID_KINDS.includes(value) ? value : 'unknown');
}

export interface LayerState {
  kind: LayerKind;
  name: string;
}

/**
 * 一次拿到类型 + 名称，供图层轮询用。
 * 比 getLayerKind + getLayerName 少一次 evalScript。
 */
export async function getLayerState(): Promise<Result<LayerState>> {
  if (!(await requireCore())) return fail('PS_ERROR', 'PS 脚本未加载');

  /* 轮询专用：不记 info，避免日志被刷屏 */
  const call = await callJsx('mm_layer_getState', [], { silent: true });
  if (!call.ok) return fail('PS_ERROR', call.reason);

  const raw = call.raw;
  if (raw === 'no-doc') return fail('PS_ERROR', '没有打开的文档');

  /* 名称里可能含 '|'，只切第一个 */
  const index = raw.indexOf('|');
  if (index < 0) return fail('PS_ERROR', '图层信息格式错误');

  const kindRaw = raw.slice(0, index);
  const name = raw.slice(index + 1);
  const kind = kindRaw.startsWith('unknown') ? 'unknown' : (kindRaw as LayerKind);

  return ok({
    kind: VALID_KINDS.includes(kind) ? kind : 'unknown',
    name
  });
}

export async function getLayerName(): Promise<Result<string>> {
  if (!(await requireCore())) return fail('PS_ERROR', 'PS 脚本未加载');

  const call = await callJsx('mm_layer_getName');
  if (!call.ok) return fail('PS_ERROR', call.reason);

  const raw = call.raw;
  if (raw === 'no-doc') return fail('PS_ERROR', '没有打开的文档');
  if (!raw) return fail('PS_ERROR', '无法读取图层名称');

  return ok(raw);
}
