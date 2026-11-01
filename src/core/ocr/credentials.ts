/**
 * 百度云 OCR 凭证（API Key / Secret Key）的唯一持有者。
 *
 * 为什么不放 `prefs.json`：`CONVENTIONS` §4.8 —— 凭证不进偏好文件（清偏好就掉配置）。
 * 落盘：`%APPDATA%\Maomao\credentials.json`（`core/storage` 的 `data` 根）。
 *
 * 三条边界：
 *   1. 只由本文件读写；别的模块要凭证就调 `readCredentials()`，不许自己拼文件名。
 *   2. 读失败原样透传（`NOT_FOUND` = 还没配，调用方据此给「去设置」而不是「网络错误」）。
 *   3. 写走 `writeTextAtomic`（`.bak` + 原子替换 + 按文件串行），不自己 `fs.writeFileSync`。
 */

import { readTextResult, writeTextAtomic } from '../storage';
import { isRecord } from '../../types/guards';
import { parseJson } from '../../types/json';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';

/**
 * 百度云应用的两个值：**API Key / Secret Key**（不是 AppID —— AppID 是旧 SDK 用的数字，
 * 取 access_token 走的是 `client_id=API Key` + `client_secret=Secret Key`）。
 */
export interface BaiduCredentials {
  apiKey: string;
  secretKey: string;
}

const FILE = 'credentials.json';

/** 形状校验：两个字段都非空才算配好；认不出给 `CORRUPT`，不猜默认值（模块私有，不导出） */
function decodeCredentials(raw: unknown): Result<BaiduCredentials> {
  if (!isRecord(raw)) return failWithDetail('CORRUPT', MSG.corrupt, 'credentials:root');

  const { apiKey, secretKey } = raw;
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    return failWithDetail('CORRUPT', MSG.corrupt, 'credentials:apiKey');
  }
  if (typeof secretKey !== 'string' || !secretKey.trim()) {
    return failWithDetail('CORRUPT', MSG.corrupt, 'credentials:secretKey');
  }
  return ok({ apiKey: apiKey.trim(), secretKey: secretKey.trim() });
}

/** 读凭证：`NOT_FOUND` = 还没配（**不创建文件**，首次创建只在用户点保存时） */
export function readCredentials(): Result<BaiduCredentials> {
  const text = readTextResult(FILE, 'data');
  if (text.status === 'error') return text;

  const parsed = parseJson(text.value, '凭证文件');
  if (parsed.status === 'error') return parsed;

  return decodeCredentials(parsed.value);
}

/** 保存凭证：只在设置页的「保存」里调 */
export function saveCredentials(credentials: BaiduCredentials): Promise<Result<void>> {
  const body = JSON.stringify(
    { apiKey: credentials.apiKey.trim(), secretKey: credentials.secretKey.trim() },
    null,
    2
  );
  return writeTextAtomic(FILE, `${body}\n`, 'data');
}
