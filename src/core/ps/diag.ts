/**
 * 【范本】PS 能力诊断
 * 只读探测：官方 jsx 的函数是否定义、官方配置是否存在、影响填充的开关值。
 * 用于区分「函数没加载」「函数执行失败」「配置导致跳过」三种情况。
 */

import { callJsx } from '../cep/bridge';
import { failWithDetail, ok, type Result } from '../../types/result';
import { gateFailed } from './capability';
import { ensurePsReady } from './init';
import { parseJsxRaw } from './raw';

export interface VendorDiag {
  /** 每个字段是 typeof 的结果，'function' 才算可用 */
  dispatch: string;
  useStyleColor: string;
  useGradient: string;
  btnUseStyle: string;
  setForegroundColor: string;
  useShapeFill: string;
  /** 动作页（`05`）：执行 PS 动作 / 取动作列表，jsxbin 里静态搜不到，只能这样探 */
  callAction: string;
  getActionList: string;
  /** 官方配置 sj_set.json 是否存在 */
  configSet: boolean;
  /** 官方配置 sj_interfaceSet.ini 是否存在 */
  configInterface: boolean;
  /** 影响填充行为的开关；null 表示没读到 */
  autoFillColor: boolean | string | null;
}

export async function diagVendor(): Promise<Result<VendorDiag>> {
  const capability = await ensurePsReady();
  if (!capability.core) {
    /*
     * 探测**本身**失败时如实报原始原因（超时 / 脚本异常）。
     * 统一说成「PS 脚本未加载」会让排障去找根本不存在的 jsx 文件。
     */
    const failure = capability.probeFailure;
    if (failure && failure.status === 'error') {
      return failWithDetail(failure.code, failure.reason, failure.detail);
    }
    return gateFailed('core');
  }

  const call = await callJsx('mm_diag_vendor');
  if (call.status === 'error') return call;

  const parsed = parseJsxRaw(call.value);
  if (parsed.status === 'error') return parsed;
  return ok(parsed.value as VendorDiag);
}
