/**
 * 【范本】网络横切
 * 唯一允许发请求的地方。feature 只能调用 request()，不能自己 fetch。
 * 新增接口先登记 endpoints.ts，再在 feature 里调用 request()。
 *
 * **HTTP 状态码 → `ErrorCode` 只有 `httpFailure` 一处**：`request` 与 GAS 网关（`postText` 的调用方）
 * 都从那里取失败臂。别处再写 `if (status === 401)` 就是第二套映射（结构上挡不住，靠这句声明）。
 */

import { emitUnauthorized, getToken } from '../auth';
import { log } from '../logger';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import { ENDPOINTS, resolveUrl, type EndpointKey, type EndpointResponses } from './endpoints';

export interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  withAuth?: boolean;
}

const DEFAULT_TIMEOUT = 10000;

/** GAS 网关一次往返的上限（参考实现 `cep/cloud/transport.ts` 的 `TIMEOUT_MS`） */
const POST_TEXT_TIMEOUT = 20000;

/**
 * HTTP 状态码 → 本仓错误码（唯一映射）。
 *
 * 2xx 返回 `null`（正文交给调用方解析）；401 的 `emitUnauthorized` 由 `request` 自己发，
 * 因为那是「登录态失效」的全局广播，不是状态码本身的语义。
 * 429 归 `NETWORK`（没有退避状态机），`detail` 写成 `HTTP 429` 以便日志里区分限流。
 */
export function httpFailure(status: number): Result<never> | null {
  if (status === 401) return failWithDetail('AUTH', MSG.codeReason.AUTH, `http:${status}`);
  if (status === 403) return failWithDetail('FORBIDDEN', MSG.codeReason.FORBIDDEN, `http:${status}`);
  if (status === 429) return failWithDetail('NETWORK', MSG.codeReason.NETWORK, 'HTTP 429');
  if (status < 200 || status >= 300) {
    return failWithDetail('NETWORK', MSG.codeReason.NETWORK, `http:${status}`);
  }
  return null;
}

export async function request<K extends EndpointKey>(
  key: K,
  options: RequestOptions = {}
): Promise<Result<EndpointResponses[K]>> {
  const endpoint = ENDPOINTS[key];
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT);

  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  if (options.withAuth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let body: string | undefined;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(resolveUrl(key), {
      method: endpoint.method,
      headers,
      body,
      signal: controller.signal
    });

    if (response.status === 401) emitUnauthorized();

    const failure = httpFailure(response.status);
    if (failure) return failure;

    /* json() 返回 any；端点响应的真实形状声明在 `EndpointResponses`（值就是 unknown），此处不猜 */
    const data: EndpointResponses[K] = await response.json();
    return ok(data);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return failWithDetail('TIMEOUT', MSG.codeReason.TIMEOUT, 'http:timeout');
    }
    log.error('请求异常', { key, error });
    return failWithDetail('NETWORK', MSG.codeReason.NETWORK, String(error));
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * 裸文本 POST：只给 Google Apps Script 网关（云同步）用，`fetch` 仍然只在本文件。
 *
 * 为什么不走 `request()`：那张表按 `EndpointKey` 拼 URL、按 JSON 解析、按 `withAuth` 加 token；
 * GAS 是「完整地址当账号 + 文本请求体 + 正文由调用方按自己的协议解析」。
 *
 * 只负责「发出去、拿回状态码与正文」：HTTP 状态码到 `ErrorCode` 的映射由调用方按协议做
 * （401 / 403 / 429 在 GAS 上的含义与 JSON 接口不同，不在这里猜）。
 */
export async function postText(
  url: string,
  body: string,
  options: { timeoutMs?: number } = {}
): Promise<Result<{ status: number; text: string }>> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), options.timeoutMs ?? POST_TEXT_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: 'POST',
      /* GAS 只认 text/plain 才不会触发预检；charset 显式写 UTF-8，中文快照不会乱码 */
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      signal: controller.signal
    });

    /* 不 response.json()：正文由调用方按协议解析，这里不假定一定是我方 JSON */
    return ok({ status: response.status, text: await response.text() });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return failWithDetail('TIMEOUT', MSG.codeReason.TIMEOUT, 'http:timeout');
    }
    /* 不记 url：GAS 地址即账号，日志里不能留全文 */
    log.error('POST 请求异常', { error });
    return failWithDetail('NETWORK', MSG.codeReason.NETWORK, String(error));
  } finally {
    window.clearTimeout(timer);
  }
}
