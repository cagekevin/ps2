/**
 * 【范本】列表解码（唯一入口）
 *
 * `unknown` 数组 → 逐项解码，按策略决定「一项坏」怎么处理。新增「文件里一堆项」的解码
 * 照此结构：只写一项的校验函数（`(value, path) => Result<T>`），循环交给 `decodeList`。
 *
 * 为什么在 `types/` 而不是 `repo/json-file`：这是与 `parseJson`（文本 → unknown）同层的
 * 结构原语，`domain` 也要用，而 `CONVENTIONS` §3 禁止 `domain` import `repo`。
 *
 * **只用于读视图**。写路径一律读原始记录（`repo/settings-object.decodeRawRecords`）：拿过滤后的
 * 结果去写盘，等于「读的时候跳过、写的时候删掉」——坏项会被静默删除，且不可逆
 * （`.bak` 只有上一版）。
 */

import { failWithDetail, ok, type ErrorCode, type Result } from './result';

/** 被跳过的一项：`path` 指出第几个（与 `detail` 同一写法），`code` / `reason` 是那一项自己的失败 */
export interface Dropped {
  path: string;
  code: ErrorCode;
  reason: string;
}

/** 一项坏时：整份失败（结构性错误）还是丢掉那一项（字段级错误） */
export type DropPolicy = 'reject' | 'filter';

/**
 * 顶层必须是数组——**唯一判据**。
 *
 * `decodeList` 与「只要数组、不校验项」的调用方（色板文件的写路径）共用这一份，
 * 别在各自文件里再写一遍 `Array.isArray`。
 */
export function decodeArray(raw: unknown, pathPrefix = 'root'): Result<unknown[]> {
  if (!Array.isArray(raw)) return failWithDetail('CORRUPT', '文件顶层不是数组', pathPrefix);
  return ok(raw);
}

/**
 * 逐项解码，按 `policy` 决定一项坏时整份失败还是丢掉那一项。
 *
 * `reject` 是给结构性错误用的：顶层不是数组、一项不是对象，这种「文件不是我以为的文件」
 * 不该被当成「有几项看不懂」糊过去。
 *
 * `pathPrefix` 决定 `path` 与 `detail` 的前缀（默认 `root`）；调用方给 `tags` / `stars`
 * 这类语义前缀，排障时才能一眼看出是哪个文件的哪一项。
 */
export function decodeList<T>(
  raw: unknown,
  item: (value: unknown, path: string) => Result<T>,
  policy: DropPolicy,
  pathPrefix = 'root'
): Result<{ items: T[]; records: unknown[]; dropped: Dropped[] }> {
  const array = decodeArray(raw, pathPrefix);
  if (array.status === 'error') return array;

  const records = array.value;
  const items: T[] = [];
  const dropped: Dropped[] = [];

  for (let index = 0; index < records.length; index += 1) {
    const path = `${pathPrefix}[${index}]`;
    const decoded = item(records[index], path);

    if (decoded.status === 'ok') {
      items.push(decoded.value);
      continue;
    }

    if (policy === 'reject') return decoded;
    dropped.push({ path, code: decoded.code, reason: decoded.reason });
  }

  /* 三样一次交全，调用方不必再拿原始数组二次解码：
     `items` 判「有哪些可用」，`records` 保「下标与写回空间」，`dropped` 记「坏了哪些」。
     少给一样，调用方就会自己去猜，于是同一份数据出现第二个判据。 */
  return ok({ items, records, dropped });
}
