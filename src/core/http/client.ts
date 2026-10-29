/**
 * 【范本】网络横切
 * 唯一允许发请求的地方。feature 只能调用 request()，不能自己 fetch。
 * 新增接口先登记 endpoints.ts，再在 feature 里调用 request()。
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

    if (response.status === 401) {
      emitUnauthorized();
      return failWithDetail('AUTH', MSG.codeReason.AUTH, `http:${response.status}`);
    }
    if (response.status === 403) {
      return failWithDetail('FORBIDDEN', MSG.codeReason.FORBIDDEN, `http:${response.status}`);
    }
    if (!response.ok) {
      return failWithDetail('NETWORK', MSG.codeReason.NETWORK, `http:${response.status}`);
    }

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
