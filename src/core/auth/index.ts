/**
 * 【范本】鉴权横切
 * token 只在内存与 localStorage 流转，业务层不直接读。
 * 401 统一由 http 层触发 onUnauthorized，不在这里发请求。
 * 新增凭据（如 refresh_token）按同样模式：内存缓存 + 版本化 key。
 */

import { createChannel } from '../feedback/channel';
import { log } from '../logger';

/* key 带 schema 版本，后续结构变更可平滑迁移 */
const STORAGE_KEY = 'maomao.v1.user.token';

let token: string | null = null;
/** 401 的订阅表；与 toast / loading 共用同一份通道原语 */
const unauthorized = createChannel();

export function getToken(): string | null {
  if (token) return token;
  try {
    token = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    /* 降级必须留痕（`TD-01-27`）：CEP 里 localStorage 不可用时只能留在内存态，
       不抛是对的（凭证缺失不是故障），但「这次读失败」必须能在日志里看到 */
    log.warn('读取登录 token 失败，本次按未登录处理', { detail: String(error) });
    token = null;
  }
  return token;
}

export function setToken(value: string | null): void {
  token = value;
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    /* 降级必须留痕（`TD-01-27`）：写不进就只在内存态有效，下次启动要重新登录 */
    log.warn('写入登录 token 失败，仅内存态有效', { detail: String(error) });
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
