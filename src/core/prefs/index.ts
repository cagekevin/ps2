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
import { readTextResult, writeTextAtomic } from '../storage';
import { isRecord } from '../../types/guards';
import { parseJson } from '../../types/json';
import { ok, type Result } from '../../types/result';

export type PrefKey =
  | 'style.activeKind'
  | 'style.activeWarehouse'
  | 'style.expandedGroups'
  | 'nav.lastPath'
  | 'font.previewMode'
  | 'font.previewText'
  /** 动作页列表列数（1|2|3）；官方存 `dzShowListType` 0|1|2，我们只存自己的 */
  | 'action.listColumns'
  /** 动作页「首次引导」是否已问过（点取消也算问过） */
  | 'action.guideDone'
  /** 重命名页模式：0 默认 / 1 替换 */
  | 'rename.mode'
  /** 重命名页「图层颜色标记」区的展开态 */
  | 'rename.showColorSign'
  /**
   * 云同步台账（`CloudLedger`：上次成功同步的云端 rev 与时刻）。
   * 形状校验在 `domain/cloud.decodeLedger`，坏值按「没同步过」处理。
   */
  | 'cloud.ledger'

const FILE = 'prefs.json';

let cache: Record<string, unknown> | null = null;
let flushTimer: number | null = null;

/** 偏好文件是「读不到就用默认值」的显式特例，不走通用 Result 读入口 */
function readPrefsFile(): Record<string, unknown> {
  const text = readTextResult(FILE, 'data');
  if (text.status === 'error') return {};

  const parsed = parseJson(text.value, '偏好文件');
  if (parsed.status === 'error') {
    log.warn('偏好文件解析失败', { reason: parsed.reason });
    return {};
  }
  return isRecord(parsed.value) ? parsed.value : {};
}

function load(): Record<string, unknown> {
  if (!cache) cache = readPrefsFile();
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

/** 立即落盘；失败原样上抛（writeTextAtomic 内部已记日志） */
async function flushPrefs(): Promise<Result<void>> {
  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!cache) return ok(undefined);

  const result = await writeTextAtomic(FILE, JSON.stringify(cache), 'data');
  if (result.status === 'error') log.error('偏好写入失败', { reason: result.reason });
  return result;
}

function scheduleFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushPrefs();
  }, 200);
}

/**
 * 写一个偏好并**立即落盘**：全仓「马上生效」的唯一入口。
 *
 * 失败只记日志、不阻断：偏好丢了最多重来一次（多弹一次引导 / 多问一次覆盖），
 * 不影响任何业务写入。命令里不要再写 `setPref + flushPrefs + log.warn` 三行。
 */
export async function savePref(key: PrefKey, value: unknown): Promise<void> {
  setPref(key, value);
  const flushed = await flushPrefs();
  if (flushed.status === 'error') {
    log.warn('偏好落盘失败', { key, code: flushed.code, detail: flushed.detail });
  }
}
