/**
 * 云同步的形状与判据（纯函数，零 IO）
 *
 * 云端只存**一份快照**（`psz_sync`）：`push_data` 传上去什么，云端就是什么（整份覆盖），
 * 只有两个 unit —— 样式库索引与动作库（索引 + 各仓库文件）。图片不同步。
 *
 * 三条边界：
 *   1. 快照是**不可信输入**：`decodeSnapshot` 逐字段判，不合格 `CORRUPT`，不半信半疑地用。
 *   2. 上传要**原文**（`buildUnit` 收的是文件正文），不 parse 再 stringify —— 会洗掉官方未知键。
 *   3. 唯一的防御只有 `needsOverwrite` 一条判据：`cloudRev > ledgerRev` 才问要不要覆盖。
 *      没有差异列表、没有逐键合并、没有 unit 级增量。
 */

import { md5 } from './md5';
import { isRecord } from '../types/guards';
import { parseJson } from '../types/json';
import { MSG } from '../types/messages';
import { failWithDetail, ok, type Result } from '../types/result';

/** 快照里这两个 unit 的名字（协议值，不是文件名）；上传只写这两个，下载也只认这两个 */
export const STYLE_UNIT = 'style.library';
export const ACTION_UNIT = 'action.library';

/** 云端一个文件：`path` 以 `/` 开头（相对用户数据目录），正文内联在 `content.data` */
export interface SyncFile {
  path: string;
  size: number;
  content: { kind: 'inline'; data: string; encoding: 'json' };
}

/** 一个 unit = 一组文件的整体哈希 + 全部文件 */
export interface SyncUnit {
  schema: number;
  hash: string;
  files: SyncFile[];
}

/** 云端快照（`rev` 只增，`updatedAt` 是写入时刻） */
export interface CloudSnapshot {
  type: 'psz_sync';
  schema: 1;
  rev: number;
  updatedAt: number;
  units: Record<string, SyncUnit>;
}

/** 本地台账：上次同步成功时云端的 rev 与时刻 */
export interface CloudLedger {
  rev: number;
  syncedAt: number;
}

/**
 * 云端从未上传过时的快照（服务端回 `{status:'SUCCESS', data:null}`）。
 *
 * `rev = 0` 是客户端约定：真实快照的 `rev` 从 1 起（push 时 `cloudRev + 1`），
 * 所以 `rev === 0` 只有一个意思 —— 云端还没有数据。
 */
export const EMPTY_SNAPSHOT: CloudSnapshot = {
  type: 'psz_sync',
  schema: 1,
  rev: 0,
  updatedAt: 0,
  units: {}
};

const encoder = new TextEncoder();

/**
 * 拼一个 unit。
 *
 * `hash` 必须与**文件顺序无关**（`/sj_*` 与各仓库文件的列举顺序会随索引变），
 * 所以按 `path` 字典序排序后再拼；同样的内容在任何一台机器上得到同一个摘要。
 */
export function buildUnit(files: readonly { path: string; text: string }[]): SyncUnit {
  const sorted = [...files].sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0
  );

  return {
    schema: 1,
    hash: md5(sorted.map((file) => `${file.path}\n${file.text}`).join('\n')),
    files: sorted.map((file) => ({
      path: file.path,
      /* 字节数，不是字符数：中文文件按 UTF-16 长度算会小一半 */
      size: encoder.encode(file.text).length,
      content: { kind: 'inline', data: file.text, encoding: 'json' }
    }))
  };
}

/** 一个文件：`path` 必须是以 `/` 开头的非空串，否则拼不回本地路径 */
function decodeFile(raw: unknown, path: string): Result<SyncFile> {
  if (!isRecord(raw)) return failWithDetail('CORRUPT', MSG.cloud.syncFailed, path);
  if (typeof raw.path !== 'string' || !raw.path.startsWith('/')) {
    return failWithDetail('CORRUPT', MSG.cloud.syncFailed, `${path}.path`);
  }
  if (typeof raw.size !== 'number' || !Number.isFinite(raw.size)) {
    return failWithDetail('CORRUPT', MSG.cloud.syncFailed, `${path}.size`);
  }

  const content = raw.content;
  if (!isRecord(content)) return failWithDetail('CORRUPT', MSG.cloud.syncFailed, `${path}.content`);
  if (content.kind !== 'inline' || typeof content.data !== 'string') {
    return failWithDetail('CORRUPT', MSG.cloud.syncFailed, `${path}.content.kind`);
  }
  if (content.encoding !== 'json') {
    return failWithDetail('CORRUPT', MSG.cloud.syncFailed, `${path}.content.encoding`);
  }

  return ok({
    path: raw.path,
    size: raw.size,
    content: { kind: 'inline', data: content.data, encoding: 'json' }
  });
}

/** 一个 unit：`files` 必须是数组，逐项判 */
function decodeUnit(raw: unknown, path: string): Result<SyncUnit> {
  if (!isRecord(raw)) return failWithDetail('CORRUPT', MSG.cloud.syncFailed, path);
  if (typeof raw.schema !== 'number') {
    return failWithDetail('CORRUPT', MSG.cloud.syncFailed, `${path}.schema`);
  }
  if (typeof raw.hash !== 'string') {
    return failWithDetail('CORRUPT', MSG.cloud.syncFailed, `${path}.hash`);
  }
  if (!Array.isArray(raw.files)) {
    return failWithDetail('CORRUPT', MSG.cloud.syncFailed, `${path}.files`);
  }

  const files: SyncFile[] = [];
  for (let index = 0; index < raw.files.length; index += 1) {
    const decoded = decodeFile(raw.files[index], `${path}.files[${index}]`);
    if (decoded.status === 'error') return decoded;
    files.push(decoded.value);
  }

  return ok({ schema: raw.schema, hash: raw.hash, files });
}

/**
 * 校验一份快照。
 *
 * 严格：`type` / `schema` / `rev` / `updatedAt` / `units` 缺一样都是 `CORRUPT`。
 * **不在这里要求两个 unit 齐全** —— 那是下载命令的事（能指名缺哪个 unit 进 `detail`）。
 */
export function decodeSnapshot(raw: unknown): Result<CloudSnapshot> {
  if (!isRecord(raw)) return failWithDetail('CORRUPT', MSG.cloud.syncFailed, 'root');
  if (raw.type !== 'psz_sync') return failWithDetail('CORRUPT', MSG.cloud.syncFailed, 'root.type');
  if (raw.schema !== 1) return failWithDetail('CORRUPT', MSG.cloud.syncFailed, 'root.schema');
  if (typeof raw.rev !== 'number' || !Number.isInteger(raw.rev) || raw.rev < 0) {
    return failWithDetail('CORRUPT', MSG.cloud.syncFailed, 'root.rev');
  }
  if (typeof raw.updatedAt !== 'number' || !Number.isFinite(raw.updatedAt)) {
    return failWithDetail('CORRUPT', MSG.cloud.syncFailed, 'root.updatedAt');
  }
  if (!isRecord(raw.units)) {
    return failWithDetail('CORRUPT', MSG.cloud.syncFailed, 'root.units');
  }

  const units: Record<string, SyncUnit> = {};
  for (const [name, value] of Object.entries(raw.units)) {
    const decoded = decodeUnit(value, `units.${name}`);
    if (decoded.status === 'error') return decoded;
    units[name] = decoded.value;
  }

  return ok({ type: 'psz_sync', schema: 1, rev: raw.rev, updatedAt: raw.updatedAt, units });
}

/**
 * 解析 GAS 网关信封，取出 `data`。
 *
 * 服务端固定回：
 *   成功 `{ status: 'SUCCESS', data }`（空库 `data: null`）
 *   失败 `{ status: 'ERROR', error: '…' }`
 * 只认 `status` 一个判别位；别的形状一律 `CORRUPT`。
 * 服务端原话（中文）原样进 `detail`：它是观测，不是我们编的文案。
 */
export function parseGatewayData(text: string): Result<unknown> {
  const parsed = parseJson(text, '云同步响应');
  if (parsed.status === 'error') return parsed;

  if (!isRecord(parsed.value)) {
    return failWithDetail('CORRUPT', MSG.cloud.syncFailed, `root:${typeof parsed.value}`);
  }
  if (parsed.value.status === 'ERROR') {
    const reason = typeof parsed.value.error === 'string' ? parsed.value.error : '';
    return failWithDetail('CORRUPT', MSG.cloud.syncFailed, `server:${reason}`);
  }
  if (parsed.value.status !== 'SUCCESS') {
    return failWithDetail(
      'CORRUPT',
      MSG.cloud.syncFailed,
      `status:${String(parsed.value.status)}`
    );
  }

  return ok(parsed.value.data);
}

/**
 * 台账解码：**坏值返回 null**（不是坏文件）。
 *
 * 台账只决定「上传时要不要问一句覆盖」，丢了最多多问一次；为它开一个失败通道
 * 会让每次读偏好都要处理一个用户无能为力的错。
 */
export function decodeLedger(raw: unknown): CloudLedger | null {
  if (!isRecord(raw)) return null;
  const { rev, syncedAt } = raw;
  if (typeof rev !== 'number' || !Number.isInteger(rev) || rev < 0) return null;
  if (typeof syncedAt !== 'number' || !Number.isFinite(syncedAt)) return null;
  return { rev, syncedAt };
}

/**
 * 上传前**唯一**的判定：云端比台账新才问「确定覆盖？」。
 *
 * 台账不存在按 `rev = 0` 处理（调用方传 0）：云端 rev > 0 时提示一次，之后不再提示。
 */
export function needsOverwrite(cloudRev: number, ledgerRev: number): boolean {
  return cloudRev > ledgerRev;
}
