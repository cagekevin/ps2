/**
 * 【范本】网络横切
 * 唯一允许发请求的地方。feature 只能调用 request()，不能自己 fetch。
 * 新增接口先登记 endpoints.ts，再在 feature 里调用 request()。
 */

import { emitUnauthorized, getToken } from '../auth';
import { log } from '../logger';
import { fail, ok, type Result } from '../../types/result';
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
      return fail('AUTH', '登录已失效');
    }
    if (response.status === 403) {
      return fail('FORBIDDEN', '没有访问权限');
    }
    if (!response.ok) {
      return fail('NETWORK', `请求失败（HTTP ${response.status}）`);
    }

    const data = (await response.json()) as EndpointResponses[K];
    return ok(data);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return fail('TIMEOUT', '请求超时');
    }
    log.error('请求异常', { key, error });
    return fail('NETWORK', '网络异常');
  } finally {
    window.clearTimeout(timer);
  }
}
