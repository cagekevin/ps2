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

/**
 * 云同步网关（Google Apps Script）。
 *
 * **地址不是凭证**（2026-10-30 实测，代理走本机 7897）：
 *   POST `{"action":"pull_data"}` → `401` + `text/html`（标题「网页未找到」）
 *   GET 同一地址 → `302` 到 `accounts.google.com/ServiceLogin?continue=<本地址>`
 * 即：部署要求 **Google 登录态**。浏览器能拉下来是因为浏览器已登录；
 * CEP 面板的 `fetch` 没有登录态，拿到的是 401，不是 JSON。
 * 要让面板可用，得把部署权限改成「任何人」——这一步在 Google 侧，代码改不了。
 *
 * 不登记进 `ENDPOINTS`：那张表是「host + path + JSON 响应」，而这个网关是完整地址 +
 * 文本请求体 + 正文由调用方解析（见 `postText`）。来源：`ps/src/config/cloud.ts` 的
 * `CLOUD_SYNC_GAS_URL`。
 *
 * 仍然不要外传、不要打进公开构建、不要写进 README / 截图。
 */
export const CLOUD_SYNC_URL =
  'https://script.google.com/macros/s/AKfycbyNJHgNZMci2kIY0jfhozriJYwPkw4phoUZh7nWwW1rw3ZlJaWg282EygOEnyxyka6X/exec';

