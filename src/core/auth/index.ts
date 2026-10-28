/**
 * 【范本】鉴权横切
 * token 只在内存与 localStorage 流转，业务层不直接读。
 * 401 统一由 http 层触发 onUnauthorized，不在这里发请求。
 * 新增凭据（如 refresh_token）按同样模式：内存缓存 + 版本化 key。
 */

import { createChannel } from '../feedback/channel';

/* key 带 schema 版本，后续结构变更可平滑迁移 */
const STORAGE_KEY = 'maomao.v1.user.token';

let token: string | null = null;
/** 401 的订阅表；与 toast / loading 共用同一份通道原语 */
const unauthorized = createChannel();

export function getToken(): string | null {
  if (token) return token;
  try {
    token = localStorage.getItem(STORAGE_KEY);
  } catch {
    token = null;
  }
  return token;
}

export function setToken(value: string | null): void {
  token = value;
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* localStorage 不可用时只保留内存态 */
  }
}

export function clearToken(): void {
  setToken(null);
}

export function onUnauthorized(listener: () => void): () => void {
  return unauthorized.subscribe(listener);
}

export function emitUnauthorized(): void {
  clearToken();
  unauthorized.emit();
}
