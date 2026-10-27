/**
 * 【范本】界面偏好持久化
 *
 * 只存「界面状态」：当前 tab、展开的分组、上次选的仓库。
 * **业务数据不要放这里**（字体列表、样式库内容必须每次从磁盘读最新的）。
 *
 * 存储：`%APPDATA%\Maomao\prefs.json`，一个文件存所有偏好。
 * 内存缓存 + 延迟批量写，避免每次 set 都落盘。
 *
 * key 必须是 PrefKey 联合类型的一员——拼错编译期就报错，不用等到运行时。
 */

import { log } from '../logger';
import { readJson, writeJson } from '../storage';

export type PrefKey =
  | 'style.activeKind'
  | 'style.activeWarehouse'
  | 'style.expandedGroups'
  | 'nav.lastPath';

const FILE = 'prefs.json';

let cache: Record<string, unknown> | null = null;
let flushTimer: number | null = null;

function load(): Record<string, unknown> {
  if (!cache) cache = readJson<Record<string, unknown>>(FILE, {}, 'data');
  return cache;
}

export function getPref<T>(key: PrefKey, fallback: T): T {
  const value = load()[key];
  return value === undefined ? fallback : (value as T);
}

export function setPref(key: PrefKey, value: unknown): void {
  load()[key] = value;
  scheduleFlush();
}

export function removePref(key: PrefKey): void {
  delete load()[key];
  scheduleFlush();
}

/** 立即落盘；返回是否成功 */
export function flushPrefs(): boolean {
  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!cache) return true;

  const written = writeJson(FILE, cache, 'data');
  if (!written) log.error('偏好写入失败', { file: FILE });
  return written;
}

function scheduleFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flushPrefs();
  }, 200);
}

/** 仅测试用 */
export function resetPrefs(): void {
  cache = null;
  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }
}
