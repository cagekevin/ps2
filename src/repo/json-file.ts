/**
 * 【范本】JSON 文件的唯一「读 → 改 → 写」入口。
 *
 * 库文件与字体标签/星级都走这里，不允许再写第二份「读原文 → 改 → 原子写」。
 *
 * 三条保证（与 `CONVENTIONS` §4.5 / §4.6 对应）：
 *   1. 读失败直接返回，**不执行** mutator——读不到就写等于把用户数据换成默认值
 *   2. 写入走 `writeTextAtomic`（`.bak` 备份 + 同文件串行）
 *   3. 写失败原样返回 `IO_ERROR`，不静默成功
 *
 * **三种「文件不存在」的语义分开写成三个入口**，不许用一个布尔参数兼职：
 *   `mutateJsonFile`         —— 文件必须存在；读不到就是失败（库文件）
 *   `updateJsonFile`         —— 不存在 = 空值继续（色板这类「不存在=空」的文件）
 *   `updateOrCreateJsonFile` —— 不存在 = 首次创建（先确认不存在，不产生 `.bak`）
 */

import { log } from '../core/logger';
import { exists, readTextResult, writeTextAtomic, type StorageRoot } from '../core/storage';
import { runSerial } from '../core/serial';
import { decodeList } from '../types/decode-list';
import { isRecord } from '../types/guards';
import { parseJson } from '../types/json';
import { fail, failWithDetail, ok, type Result } from '../types/result';

export type JsonMutator<T> = (current: T) => T | null;

interface ReadOptions<T> {
  /** 空文件按什么值读（色板文件有空文件 = 空数组的既定语义） */
  emptyAs?: () => T;
}

/** 读 + 解析 + 结构解码；三段的失败码原样透传 */
export function readJsonFile<T>(
  name: string,
  root: StorageRoot,
  label: string,
  decode: (raw: unknown) => Result<T>,
  options: ReadOptions<T> = {}
): Result<T> {
  const text = readTextResult(name, root);
  if (text.status === 'error') return text;

  if (text.value.trim() === '' && options.emptyAs) return ok(options.emptyAs());

  const parsed = parseJson(text.value, label);
  if (parsed.status === 'error') return parsed;

  return decode(parsed.value);
}

/** 文件不存在时的三种处理 */
type MissingPolicy<T> =
  | { kind: 'error' }
  | { kind: 'empty'; empty: () => T }
  | { kind: 'create'; empty: () => T };

/**
 * 同一文件的「读-改-写」必须整体串行，而不只是写串行：
 * 两个并发操作各自读到同一份旧值，后写的会把先写的改掉。
 */
async function runMutation<T>(
  name: string,
  root: StorageRoot,
  label: string,
  decode: (raw: unknown) => Result<T>,
  mutator: JsonMutator<T>,
  policy: MissingPolicy<T>,
  options: ReadOptions<T>
): Promise<Result<void>> {
  const current = readJsonFile(name, root, label, decode, options);

  if (current.status === 'error') {
    if (current.code !== 'NOT_FOUND') return current;

    if (policy.kind === 'error') return current;

    const next = mutator(policy.empty());
    if (next === null) return ok(undefined);

    /* 首次创建：先确认文件确实不存在，绝不覆盖 */
    if (policy.kind === 'create') return createJsonFile(name, root, next);
    return writeTextAtomic(name, JSON.stringify(next), root);
  }

  const next = mutator(current.value);
  if (next === null) return ok(undefined);

  return writeTextAtomic(name, JSON.stringify(next), root);
}

function enqueue(name: string, root: StorageRoot, task: () => Promise<Result<void>>) {
  return runSerial(`mutate:${root}:${name}`, async () => {
    try {
      return await task();
    } catch (error) {
      return failWithDetail('IO_ERROR', '读写队列异常', String(error));
    }
  });
}

/**
 * 读-改-写。mutator 返回 `null` 表示「不需要写」。
 * 读失败时 mutator 不会被调用；同一文件整体排队，避免读改交错。
 *
 * 文件必须存在：读不到（不存在 / 坏 JSON / IO 失败）一律返回错误。
 */
export function mutateJsonFile<T>(
  name: string,
  root: StorageRoot,
  label: string,
  decode: (raw: unknown) => Result<T>,
  mutator: JsonMutator<T>
): Promise<Result<void>> {
  return enqueue(name, root, () =>
    runMutation(name, root, label, decode, mutator, { kind: 'error' }, {})
  );
}

/**
 * 读-改-写，文件不存在 = 空值（该文件已有「不存在 = 空」的既定裁定，如色板）。
 */
export function updateJsonFile<T>(
  name: string,
  root: StorageRoot,
  label: string,
  decode: (raw: unknown) => Result<T>,
  mutator: JsonMutator<T>,
  options: ReadOptions<T> & { missing: () => T }
): Promise<Result<void>> {
  return enqueue(name, root, () =>
    runMutation(
      name,
      root,
      label,
      decode,
      mutator,
      { kind: 'empty', empty: options.missing },
      options
    )
  );
}

/**
 * 读-改-写，文件不存在 = 首次创建（用户主动新增）。
 * 存在 = 读改写（`.bak`）；不存在 = 显式创建（先确认不存在，不产生 `.bak`）。
 */
export function updateOrCreateJsonFile<T>(
  name: string,
  root: StorageRoot,
  label: string,
  decode: (raw: unknown) => Result<T>,
  mutator: JsonMutator<T>,
  options: ReadOptions<T> & { missing: () => T }
): Promise<Result<void>> {
  return enqueue(name, root, () =>
    runMutation(
      name,
      root,
      label,
      decode,
      mutator,
      { kind: 'create', empty: options.missing },
      options
    )
  );
}

/**
 * 整份替换（导入标签/评分这种「用户明确覆盖」的场景）。
 * 与 mutate 共用同一文件队列，避免导入与正在进行的单条修改交错；
 * 写前仍由 `writeTextAtomic` 备份 `.bak`。
 */
export function replaceJsonFile<T>(
  name: string,
  root: StorageRoot,
  value: T
): Promise<Result<void>> {
  return enqueue(name, root, () => writeTextAtomic(name, JSON.stringify(value), root));
}

/**
 * 新建文件。仅限「文件确实不存在」的用户新增路径；存在则拒绝，绝不覆盖。
 * 只被 `updateOrCreateJsonFile` 调用，不导出（没有第二个入口）。
 */
async function createJsonFile<T>(
  name: string,
  root: StorageRoot,
  value: T
): Promise<Result<void>> {
  if (exists(name, root)) {
    log.warn('拒绝覆盖已存在文件', { name, root });
    return fail('VALIDATION', '文件已存在，不能按新建写入');
  }

  return writeTextAtomic(name, JSON.stringify(value), root);
}

/** 原始记录数组：写路径专用，保留未知键（丢掉就会改坏用户数据） */
export type RawRecords = Record<string, unknown>[];

/**
 * 官方设置文件（`sj_set.json` 那一类）的顶层解码：必须是一个对象，**原样返回**。
 *
 * 写路径要拿到原始对象才能保留别的页面/模块写的键，所以这里不重建、不挑字段。
 * 唯一入口：`font-set-repo` 与 `common-use-repo` 共用这一份，别在各自文件里再写一遍
 * （曾经两份逐字节相同）。
 */
export function decodeSettingsObject(raw: unknown): Result<Record<string, unknown>> {
  if (!isRecord(raw)) return failWithDetail('CORRUPT', '设置文件顶层不是对象', 'root');
  return ok(raw);
}

/** 一项必须是对象：写路径的严格判据（读路径用 `decodeCommonUseItem` 那类，坏项可跳过） */
function requireRecord(value: unknown, path: string): Result<Record<string, unknown>> {
  if (!isRecord(value)) return failWithDetail('CORRUPT', '文件里存在非对象条目', path);
  return ok(value);
}

/**
 * 顶层必须是「对象数组」；有一个不是对象就整份拒绝，不做静默过滤（`detail` 指出第几个）。
 *
 * 由 `decodeList(..., 'reject')` 推导，**不再自己写一遍「数组 + 每项是对象」的循环**：
 * 那条判据的唯一实现在 `types/decode-list`（`decodeArray` + 逐项）。
 */
export function decodeRawRecords(raw: unknown): Result<RawRecords> {
  const decoded = decodeList(raw, requireRecord, 'reject');
  if (decoded.status === 'error') return decoded;
  return ok(decoded.value.items);
}

/**
 * 「文件不存在 = 空」的唯一判据：只在 `NOT_FOUND` 时给默认值，其余失败原样上抛。
 *
 * 三处曾各写一遍这个 `if`：字体标签/星级（`font-repo.readMetaFile`）、
 * 字体面板设置（`font-set-repo`）、常用页设置（`common-use-repo`）。
 */
export function readOrEmpty<T>(read: Result<T>, empty: () => Result<T>): Result<T> {
  if (read.status === 'error' && read.code === 'NOT_FOUND') return empty();
  return read;
}
