/**
 * 【范本】官方设置文件 `sj_set.json` 的形状：文件名、顶层解码、原始记录数组。
 *
 * 新增「一份官方设置文件、多个模块按键分工」时照此结构：文件名与顶层形状在这里，读写仍在 `json-file`。
 *
 * 为什么不在 `json-file`：那是「读改写引擎」（任何 JSON 文件都走它），
 * 不该认识某一个业务文件的形状。引擎只做 IO 与排队，业务判据放这里。
 *
 * 谁在用：`font-set-repo`（`zt*` 键）与 `common-use-repo`（`cy*` 键）。
 * **两边都 import 本文件，不许各自再写一份文件名或顶层解码。**
 */
import { decodeList } from '../types/decode-list';
import { isRecord } from '../types/guards';
import { failWithDetail, ok, type Result } from '../types/result';

/** `sj_set.json` —— 全客户端共用的官方设置文件 */
export const SETTINGS_FILE = 'sj_set.json';

/** 原始记录数组：写路径专用，保留未知键（丢掉就会改坏用户数据） */
export type RawRecords = Record<string, unknown>[];

/**
 * 顶层解码：必须是一个对象，**原样返回**。
 *
 * 写路径要拿到原始对象才能保留别的页面/模块写的键，所以这里不重建、不挑字段。
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
