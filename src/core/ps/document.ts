/**
 * 【范本】PS 文档能力
 * 分隔符解析只在这里做，业务层拿到的永远是结构化对象。
 */

import { callJsx } from '../cep/bridge';
import { fail, ok, type Result } from '../../types/result';
import { requireCore } from './init';

export interface DocumentInfo {
  name: string;
  width: number;
  height: number;
  mode: string;
  layerCount: number;
}

export async function getDocumentInfo(): Promise<Result<DocumentInfo>> {
  if (!(await requireCore())) return fail('PS_ERROR', 'PS 脚本未加载');

  const call = await callJsx('mm_doc_getInfo');
  if (!call.ok) return fail('PS_ERROR', call.reason);

  const raw = call.raw;
  if (raw === 'no-doc') return fail('PS_ERROR', '没有打开的文档');

  const [name, width, height, mode, layerCount] = raw.split('|');
  if (!name) return fail('PS_ERROR', '文档信息格式错误');

  return ok({
    name,
    width: Number(width) || 0,
    height: Number(height) || 0,
    mode: mode ?? 'unknown',
    layerCount: Number(layerCount) || 0
  });
}
