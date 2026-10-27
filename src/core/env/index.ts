/**
 * 【范本】环境横切
 * 只读。所有需要版本号、扩展 ID 的地方都从这里取。
 * 禁止在组件里写死版本号或调 getSystemPath。
 */

import { getExtensionId, isCep } from '../cep/bridge';

export const APP_NAME = 'maomao-design-tools';
export const APP_TITLE = '猫猫设计工具';
export const APP_VERSION = '0.1.0';

export function isInCep(): boolean {
  return isCep();
}

export function extensionId(): string {
  return getExtensionId();
}
