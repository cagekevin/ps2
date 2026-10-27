/**
 * 【范本】接口地址
 * 全项目唯一的 URL 来源。feature 禁止自己拼完整地址。
 *
 * 每个接口必须标注来源（文件:行号）与验证状态：
 *   [已验证] 真机调通
 *   [已核对] 从源码抄来且核对过拼接规则，未实测
 *   [待核对] 来源不确定，使用前必须确认
 */

export const HOSTS = {
  zhuli: 'https://zhuli.gaoding.com',
  cep: 'https://cepapp.pszhuli.com',
  ums: 'https://ums.gaoding.com',
  sync: 'https://syncserver.pszhuli.com'
} as const;

export type HostKey = keyof typeof HOSTS;

/**
 * 面板源码的请求是 baseURL + path 形式，baseURL 已含 /api/
 * 来源：psz-panel-v4/src/entry/http-client.js:36
 */
export const ENDPOINTS = {
  /** [待核对] 客户端接口，非面板接口，来源：完整链路理解文档 */
  productList: { host: 'zhuli', path: '/api/product/index', method: 'GET' },

  /** [已核对] app-main.js:9463 postRequest("version/check")，baseURL 已含 /api/ */
  versionCheck: { host: 'zhuli', path: '/api/version/check', method: 'POST' },

  /** [已核对] menu.js:3162 getRequest("sync/file-list") */
  syncFileList: { host: 'zhuli', path: '/api/sync/file-list', method: 'GET' },

  /** [已核对] m_69b1.js:19 tokenEndpoint 完整地址 */
  oauthToken: { host: 'ums', path: '/connect/oauth/tokens', method: 'POST' },

  /** [待核对] 客户端接口，非面板接口，来源：完整链路理解文档 */
  userLoginRegister: { host: 'zhuli', path: '/api/user-login-register', method: 'POST' }
} as const satisfies Record<string, { host: HostKey; path: string; method: 'GET' | 'POST' }>;

export type EndpointKey = keyof typeof ENDPOINTS;

/**
 * 每个接口的响应结构。
 * 未知结构先写 unknown，拿到真实返回后替换成具体类型。
 * 调用方 request('key') 会自动推导，不需要手写泛型。
 */
export interface EndpointResponses {
  productList: unknown;
  versionCheck: unknown;
  syncFileList: unknown;
  oauthToken: unknown;
  userLoginRegister: unknown;
}

export function resolveUrl(key: EndpointKey): string {
  const endpoint = ENDPOINTS[key];
  return `${HOSTS[endpoint.host]}${endpoint.path}`;
}
