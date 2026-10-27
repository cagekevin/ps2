/**
 * 【范本】PS 环境变量注入
 *
 * 官方 jsx 内部靠这些 key 拼数据路径和接口地址，不注入就会报「undefined 不是对象」，
 * 表现为 `EvalScript error.`。
 *
 * 字段名不能改——jsx 按这些 key 取值。`VUE_APP_USER_DIR` 最关键。
 */

import { callJsx } from '../cep/bridge';
import { log } from '../logger';
import { ok, type Result } from '../../types/result';

export const PS_ENV = {
  VUE_APP_BASE_SERVER: 'https://zhuli.gaoding.com',
  VUE_APP_WEBSITE_HOST: 'https://www.pszhuli.com',
  VUE_APP_ENVNAME: '',
  VUE_APP_CURRENTMODE: 'prod',
  VUE_APP_BASE_SYNC_SERVER: 'https://syncserver.pszhuli.com',
  VUE_APP_UMS: 'https://ums.gaoding.com',
  VUE_APP_BASE_CEP: 'https://cepapp.pszhuli.com',
  VUE_APP_USER_DIR: '/SheJiZhuLi',
  VUE_APP_OPTIMAL_DIR: '/Optimal',
  NODE_ENV: 'production',
  VUE_APP_CEP_VERSION: '3.6.2',
  VUE_APP_CEP_NAME: 'design',
  VUE_APP_CEP_PUB_TIME: '2022-06-28',
  VUE_APP_CEP_PUB_TIMESTAMP: '1656410553279',
  BASE_URL: ''
} as const;

/** 注入环境变量；失败原样上抛（码 + 原因 + detail） */
export async function injectEnv(): Promise<Result<void>> {
  const call = await callJsx('Sys_setSystemEnvInfo', [PS_ENV]);
  if (call.status === 'error') {
    log.error('环境变量注入失败', { reason: call.reason, detail: call.detail });
    return call;
  }

  log.info('环境变量已注入', { userDir: PS_ENV.VUE_APP_USER_DIR, raw: call.value });
  return ok(undefined);
}
