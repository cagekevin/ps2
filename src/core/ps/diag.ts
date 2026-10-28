/**
 * 【范本】PS 能力诊断
 * 只读探测：官方 jsx 的函数是否定义、官方配置是否存在、影响填充的开关值。
 * 用于区分「函数没加载」「函数执行失败」「配置导致跳过」三种情况。
 */

import { callJsx } from '../cep/bridge';
import { ok, type Result } from '../../types/result';
import { gateFailed } from './capability';
import { requireCore } from './init';
import { parseJsxRaw } from './raw';

export interface VendorDiag {
  /** 每个字段是 typeof 的结果，'function' 才算可用 */
  dispatch: string;
  useStyleColor: string;
  useGradient: string;
  btnUseStyle: string;
  setForegroundColor: string;
  useShapeFill: string;
  /** 官方配置 sj_set.json 是否存在 */
  configSet: boolean;
  /** 官方配置 sj_interfaceSet.ini 是否存在 */
  configInterface: boolean;
  /** 影响填充行为的开关；null 表示没读到 */
  autoFillColor: boolean | string | null;
}

export async function diagVendor(): Promise<Result<VendorDiag>> {
  if (!(await requireCore())) return gateFailed('core');

  const call = await callJsx('mm_diag_vendor');
  if (call.status === 'error') return call;

  const parsed = parseJsxRaw(call.value);
  if (parsed.status === 'error') return parsed;
  return ok(parsed.value as VendorDiag);
}
