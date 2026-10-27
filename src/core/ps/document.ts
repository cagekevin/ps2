/**
 * 【范本】PS 文档能力
 * 分隔符解析只在这里做，业务层拿到的永远是结构化对象。
 */

import { callJsx } from '../cep/bridge';
import { failWithDetail, ok, type Result } from '../../types/result';
import { requireCore } from './init';
import { unwrapRaw } from './raw';

export interface DocumentInfo {
  name: string;
  width: number;
  height: number;
  mode: string;
  layerCount: number;
}

export async function getDocumentInfo(): Promise<Result<DocumentInfo>> {
  if (!(await requireCore())) return failWithDetail('PS_UNREADY', 'PS 脚本未加载', 'core:false');

  const call = await callJsx('mm_doc_getInfo');
  if (call.status === 'error') return call;

  const guard = unwrapRaw(call.value);
  if (guard.status === 'error') return guard;

  const [name, width, height, mode, layerCount] = call.value.split('|');
  if (!name) return failWithDetail('PS_ERROR', '文档信息格式错误', `raw:${call.value}`);

  return ok({
    name,
    width: Number(width) || 0,
    height: Number(height) || 0,
    mode: mode ?? 'unknown',
    layerCount: Number(layerCount) || 0
  });
}
