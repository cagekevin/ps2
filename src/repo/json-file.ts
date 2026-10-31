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
 *
 * **整份替换有两个入口，按内容形态分**（值 vs 原文，别合并）：
 *   `replaceJsonFile`        —— 给**值**，内部 `JSON.stringify`（导入标签/评分）
 *   `replaceFileText`        —— 给**原文**，一个字节都不改（云同步搬运、导入写库文件）
 *
 * 全仓所有写盘都这两个/上面三个之一；直接 `writeTextAtomic` 会绕开「读改写 ↔ 整份替换」
 * 之间的排队（2026-10-31 收到这里：`action-repo` 两处、`ku-archive` 一处）。
 */

import { log } from '../core/logger';
import { exists, readTextResult, writeTextAtomic, type StorageRoot } from '../core/storage';
import { runSerial } from '../core/serial';
import { parseJson } from '../types/json';
import { MSG } from '../types/messages';
import { failWithDetail, ok, type Result } from '../types/result';

/**
 * 写 mutator：`ok(null)` = 不需要写，`error` = 判定失败原样上抛。
 *
 * **只有一个类型**：不需要判定的场合就 `return ok(next)`。分成「纯改 / 可失败」两个类型
 * 会让每个调用点都要选一个 —— 选就要判断，判断就会错（`ADR-0005`）。
 */
export type JsonMutator<T> = (current: T) => Result<T | null>;

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

    const outcome = mutator(policy.empty());
    if (outcome.status === 'error') return outcome;
    if (outcome.value === null) return ok(undefined);

    /* 首次创建：先确认文件确实不存在，绝不覆盖 */
    if (policy.kind === 'create') return createJsonFile(name, root, outcome.value);
    return writeTextAtomic(name, JSON.stringify(outcome.value), root);
  }

  const outcome = mutator(current.value);
  if (outcome.status === 'error') return outcome;
  if (outcome.value === null) return ok(undefined);

  return writeTextAtomic(name, JSON.stringify(outcome.value), root);
}

function enqueue(name: string, root: StorageRoot, task: () => Promise<Result<void>>) {
  return runSerial(`mutate:${root}:${name}`, async () => {
    try {
      return await task();
    } catch (error) {
      return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, `queue:${String(error)}`);
    }
  });
}

/**
 * 读-改-写。`mutator` 返回 `ok(null)` 表示「不需要写」，`error` 原样上抛。
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
    runMutation(name, root, label, decode, mutator, { kind: 'empty', empty: options.missing }, options)
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
 * 整份替换为**原文**：内容不解析、不序列化，调用方给什么字节就写什么。
 *
 * 与 `replaceJsonFile` 的区别只有一个——值还是文本。**两个都要有**，不许并成一个
 * 收 `string | T` 的联合：那样每个调用点都要自己判「这个 string 是原文还是要序列化的值」，
 * 判错一次就是把 `"{...}"` 双序列化一次（云同步搬运算与导入写库是最容易踩的两处）。
 *
 * 走同一条文件队列（`mutate:<root>:<name>`）：`writeTextAtomic` 自带的是 `write:<absPath>`
 * 队列，只保证「两次写不交错」；**读改写与整份替换之间**的排队靠这一层，
 * 否则「读到旧值 → 整份替换 → 读改写把旧值写回」会静默丢掉替换。
 */
export function replaceFileText(name: string, root: StorageRoot, text: string): Promise<Result<void>> {
  return enqueue(name, root, () => writeTextAtomic(name, text, root));
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
    return failWithDetail('VALIDATION', MSG.stale, 'file:exists');
  }

  return writeTextAtomic(name, JSON.stringify(value), root);
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
