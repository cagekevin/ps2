/**
 * 云同步命令（2 条：`upload` / `download`）
 *
 * 只有一次人工确认：上传前拉一次云端 rev，比台账新就问「确定覆盖？」。
 * **命令不弹窗**：`upload` 返回 `{ status: 'needs-confirm', cloudRev }`，页面用 `useConfirm()` 问，
 * 确认后带 `force: true` 再调一次。
 *
 * 三条口径（`07` §3.6）：
 *   1. 上传前先 pull —— 只为了拿 `rev`（不合并、不算差异、不做 unit 增量）。
 *   2. 台账只在成功后写；失败不改台账（最多下次再问一次覆盖）。
 *   3. 下载写回后刷新两个页面切片（文件换了，页面还拿着旧投影）。
 *
 * 协议细节（`pull_data` / `push_data`、20s 超时、状态码 → `ErrorCode`）都在本文件；
 * 正文解析失败与缺 unit 一律 `CORRUPT`，现场进 `detail`。
 */

import { CLOUD_SYNC_URL } from '../core/http/endpoints';
import { httpFailure, postText } from '../core/http/client';
import { log } from '../core/logger';
import { flushPrefs, setPref } from '../core/prefs';
import {
  ACTION_UNIT,
  EMPTY_SNAPSHOT,
  STYLE_UNIT,
  decodeSnapshot,
  needsOverwrite,
  parseGatewayData,
  type CloudSnapshot
} from '../domain/cloud';
import { applyActionUnit, applyStyleUnit, collectActionUnit, collectStyleUnit } from '../repo/cloud-repo';
import { useActionStore } from '../store/action';
import { readLedger, useCloudStore } from '../store/cloud';
import { useStyleLibraryStore } from '../store/style-library';
import { MSG } from '../types/messages';
import { fail, failWithDetail, ok, type Result } from '../types/result';

const ACTION_PULL = 'pull_data';
const ACTION_PUSH = 'push_data';

/** 上传结果：`needs-confirm` 是**成功**臂（页面弹确认后再带 `force` 调一次） */
export type UploadOutcome = { status: 'done' } | { status: 'needs-confirm'; cloudRev: number };

/**
 * 发一次请求并映射状态码。
 *
 * 地址被清空时不发请求（`VALIDATION`）；状态码 → `ErrorCode` 走 `core/http` 的唯一映射，
 * 不在这里再写一份（401 / 403 / 429 的语义全仓一致）。
 */
async function send(action: string, data?: unknown): Promise<Result<string>> {
  const url = CLOUD_SYNC_URL.trim();
  if (!url) return fail('VALIDATION', MSG.cloud.notConfigured);

  const body = JSON.stringify(data === undefined ? { action } : { action, data });
  const posted = await postText(url, body);
  if (posted.status === 'error') return posted;

  const { status, text } = posted.value;
  const failure = httpFailure(status);
  if (failure) return failure;

  return ok(text);
}

/**
 * 拉云端快照（上传只为拿 `rev`，下载要整份内容）。
 *
 * 服务端空库回 `{status:'SUCCESS', data:null}` → 按 `rev = 0` 的空快照处理，
 * 于是第一次上传不会弹「云端更新」，下载则能明确说「云端还没有数据」。
 */
async function pull(): Promise<Result<CloudSnapshot>> {
  const text = await send(ACTION_PULL);
  if (text.status === 'error') return text;

  const data = parseGatewayData(text.value);
  if (data.status === 'error') return data;

  if (data.value === null) return ok(EMPTY_SNAPSHOT);

  return decodeSnapshot(data.value);
}

/** 整份覆盖云端（`push_data` 不接受增量）；服务端只回 `{status:'SUCCESS', msg}`，不读载荷 */
async function push(snapshot: CloudSnapshot): Promise<Result<void>> {
  const text = await send(ACTION_PUSH, snapshot);
  if (text.status === 'error') return text;

  const ack = parseGatewayData(text.value);
  if (ack.status === 'error') return ack;

  return ok(undefined);
}

/**
 * 台账写入。
 *
 * 落盘失败只记日志：台账只决定「下次要不要问一句覆盖」，丢了最多多问一次；
 * 同步本身已经成功，不能因为台账写不进去就报失败。
 */
async function writeLedger(rev: number, syncedAt: number): Promise<void> {
  setPref('cloud.ledger', { rev, syncedAt });
  const flushed = await flushPrefs();
  if (flushed.status === 'error') {
    log.warn('云同步台账写入失败', { code: flushed.code, detail: flushed.detail });
  }
}

/** 文件换了 → 两个页面的投影必须重读（否则页面还显示旧库） */
function refreshPages(): void {
  void useStyleLibraryStore.getState().load();
  useActionStore.getState().load();
}

/**
 * 上传样式库 + 动作库。
 *
 * `force: true` = 用户在确认框里点了「覆盖」，跳过唯一那处判定。
 */
export async function upload(options: { force?: boolean } = {}): Promise<Result<UploadOutcome>> {
  const cloud = await pull();
  if (cloud.status === 'error') return cloud;

  const cloudRev = cloud.value.rev;
  if (!options.force && needsOverwrite(cloudRev, readLedger()?.rev ?? 0)) {
    return ok({ status: 'needs-confirm', cloudRev });
  }

  const style = collectStyleUnit();
  if (style.status === 'error') return style;

  const action = collectActionUnit();
  if (action.status === 'error') return action;

  const rev = cloudRev + 1;
  const updatedAt = Date.now();
  const snapshot: CloudSnapshot = {
    type: 'psz_sync',
    schema: 1,
    rev,
    updatedAt,
    units: {
      [STYLE_UNIT]: style.value,
      [ACTION_UNIT]: action.value
    }
  };

  const pushed = await push(snapshot);
  if (pushed.status === 'error') return pushed;

  await writeLedger(rev, updatedAt);
  useCloudStore.getState().load();
  return ok({ status: 'done' });
}

/**
 * 下载并覆盖本地。
 *
 * 不做比较：用户点了下载就是要覆盖；写前 `.bak` 是 `core/storage` 的行为，不是这里加的防御。
 * 两个 unit 缺一个就整体不写；写回中途失败时已写文件由 `.bak` 兜底，台账不变。
 */
export async function download(): Promise<Result<void>> {
  const cloud = await pull();
  if (cloud.status === 'error') return cloud;

  /* rev 0 只可能是服务端空库（push 后 rev 从 1 起），不当成「unit 缺失」 */
  if (cloud.value.rev === 0) return fail('NOT_FOUND', MSG.cloud.empty);

  const style = cloud.value.units[STYLE_UNIT];
  if (!style) return failWithDetail('CORRUPT', MSG.cloud.syncFailed, `unit:${STYLE_UNIT}`);

  const action = cloud.value.units[ACTION_UNIT];
  if (!action) return failWithDetail('CORRUPT', MSG.cloud.syncFailed, `unit:${ACTION_UNIT}`);

  const styleApplied = await applyStyleUnit(style);
  if (styleApplied.status === 'error') return styleApplied;

  const actionApplied = await applyActionUnit(action);
  if (actionApplied.status === 'error') return actionApplied;

  refreshPages();
  await writeLedger(cloud.value.rev, Date.now());
  useCloudStore.getState().load();
  return ok(undefined);
}
