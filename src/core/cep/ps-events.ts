/**
 * 【范本】PS 宿主事件订阅（原版 `$psEvent.add` 的可读移植）。
 *
 * CEP 面板收 PS 脚本事件的两步（缺一步事件静默不来）：
 *   1. `registerPhotoshopEvent`：向桥 `dispatchEvent({type: PhotoshopRegisterEvent, data: 事件ID})`
 *   2. `onPhotoshopCallback`：监听 `PhotoshopJSONCallback<extensionId>`，`event.data` 是
 *      `JSON.parse(raw.substring(5))` 可解的载荷（前缀 5 字符，原版 `e.data.substring(5)`）
 *
 * 目前只登记吸色需要的两个事件：`setd`（吸色完成）/ `selection`（取消）。
 * 同一个事件 ID 只能挂一个语义名（反查表 1:1，重复注册会让先注册的静默收不到）。
 */
import { getExtensionId } from './bridge';
import { log } from '../logger';
import { parseJson } from '../../types/json';

/** CEP 桥；类型来自 bridge.ts 的 declare global，这里判空取用 */
function getBridge() {
  return window.__adobe_cep__;
}

export type HostEventName = 'setd' | 'selection';

const EVENT_IDS: Record<HostEventName, string> = {
  setd: '1936028772', // setd：属性被修改（吸色完成 = foregroundColor 被改）
  selection: '1936483188' // slct：选区变化（用户切走 = 主动取消）
};

/** 原版 `e.data.substring(5)` */
const PREFIX_LENGTH = 5;
const REGISTER_EVENT = 'com.adobe.PhotoshopRegisterEvent';
const CALLBACK_PREFIX = 'com.adobe.PhotoshopJSONCallback';

export interface PhotoshopEventPayload {
  eventID?: number;
  eventData?: {
    null?: { _ref?: string; _property?: string };
    to?: { _obj?: string };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

type Listener = (payload: PhotoshopEventPayload) => void;

const listeners = new Map<HostEventName, Set<Listener>>();
const registered = new Set<HostEventName>();
let callbackInstalled = false;

function ensureCallback(): void {
  if (callbackInstalled) return;

  onPhotoshopCallback((payload) => {
    const name = Object.entries(EVENT_IDS).find(([, id]) => Number(id) === Number(payload.eventID))?.[0];
    if (!name) return;
    for (const listener of listeners.get(name as HostEventName) ?? []) listener(payload);
  });

  callbackInstalled = true;
}

/** 原版 `e.data.substring(5)` 后 JSON；解不开返回 null（调用方记日志丢弃） */
function decodeEventPayload(raw: unknown): PhotoshopEventPayload | null {
  if (typeof raw !== 'string') return null;
  const parsed = parseJson(raw.substring(PREFIX_LENGTH), 'PS 事件载荷');
  if (parsed.status !== 'ok' || !parsed.value || typeof parsed.value !== 'object') return null;
  return parsed.value as PhotoshopEventPayload;
}

/** 原版 `bindEvent`：桥收对象不是 JSON 字符串，不补 appId */
function registerPhotoshopEvent(typeId: string): boolean {
  const bridge = getBridge();
  const id = getExtensionId();
  if (!bridge?.dispatchEvent || !id) return false;

  bridge.dispatchEvent({
    type: REGISTER_EVENT,
    scope: 'APPLICATION',
    appId: undefined,
    extensionId: id,
    data: typeId
  });
  return true;
}

function onPhotoshopCallback(handler: (payload: PhotoshopEventPayload) => void): () => void {
  const bridge = getBridge();
  const id = getExtensionId();
  if (!bridge?.addEventListener || !id) return () => {};

  const type = `${CALLBACK_PREFIX}${id}`;
  const listener = (event: unknown) => {
    const data = (event as { data?: unknown } | undefined)?.data;
    const payload = decodeEventPayload(data);
    if (!payload) {
      log.error('PS 回调载荷读不懂，已丢弃本次事件', { data });
      return;
    }
    handler(payload);
  };

  bridge.addEventListener(type, listener);
  /* 全局单例回调，永不注销；分发走自家的 listeners 表，表里删掉就不再投递 */
  return () => {};
}

/** `setd` 的官方判据（`app.v4.js:69412-69423` 第一支）：只有前景色被改才算吸色完成 */
export function isForegroundSetd(payload: PhotoshopEventPayload): boolean {
  return payload.eventData?.null?._property === 'foregroundColor';
}

/** 订阅宿主事件，返回取消函数。非 CEP 环境返回 no-op */
export async function subscribeHostEvent(
  name: HostEventName,
  listener: Listener
): Promise<() => void> {
  const bridge = getBridge();
  const id = getExtensionId();
  if (!bridge || !id) {
    log.warn('非 CEP 环境，跳过事件订阅', { name });
    return () => {};
  }

  let set = listeners.get(name);
  if (!set) {
    set = new Set();
    listeners.set(name, set);
  }
  set.add(listener);

  if (!registered.has(name)) {
    ensureCallback();
    if (!registerPhotoshopEvent(EVENT_IDS[name])) {
      /* 注册失败必须回滚 listener，否则残留死函数 */
      set.delete(listener);
      if (set.size === 0) listeners.delete(name);
      log.error('PS 事件注册失败', { name, typeId: EVENT_IDS[name] });
      throw new Error(`PS 事件注册失败：${name}`);
    }
    registered.add(name);
    log.info('PS 事件注册完成', { name, typeId: EVENT_IDS[name] });
  }

  return () => {
    listeners.get(name)?.delete(listener);
  };
}
