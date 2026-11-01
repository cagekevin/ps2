/**
 * 百度云 OCR（通用文字识别·标准含位置版）。
 *
 * 为什么走 Node 而不是 `fetch`：它的响应**没有** `Access-Control-Allow-Origin`（2026-11-01
 * `curl` 实测），浏览器会拦。出口是 `core/http/node-http` 的 `nodePost`，不要另开一条。
 *
 * 三条边界：
 *   1. 只返回**已合并、已估字号**的 `OcrBlock[]`：百度原始结构（`words_result` / `location`）
 *      不出这个文件，`domain` 只认 `OcrBlock`。
 *   2. token 只在内存缓存（约 30 天），不落盘；`110` / `111`（token 失效）清缓存重取一次。
 *   3. `error_code` 的映射见 `bucketOf`，**UNVERIFIED**：百度文档的码表比这里多得多，
 *      认不出的码一律 `NETWORK`（可重试），原文进 `detail`。
 */

import { OCR_TIMEOUT_MS, OCR_TOKEN_URL, OCR_URL } from '../../config';
import { nodePost } from '../http/node-http';
import { isRecord } from '../../types/guards';
import { parseJson } from '../../types/json';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type ErrorCode, type Result } from '../../types/result';
import type { OcrBlock, OcrLine } from '../../types/ocr';
import { mergeBlocks } from './blocks';
import type { OcrCredentials } from '../credentials';



/** 图像类错误：改图能解决 */
const IMAGE_ERRORS = new Set([216200, 216201, 216202, 282003, 282810]);
/** 配额 / 频率类错误：等一会儿或换账号 */
const QUOTA_ERRORS = new Set([4, 17, 18, 19]);

let cached: { apiKey: string; token: string; expiresAt: number } | null = null;

/** 百度 error_code → 本仓码（三桶，判据写在 `IMAGE_ERRORS` / `QUOTA_ERRORS` 的注释里） */
function bucketOf(errorCode: number): ErrorCode {
  if (IMAGE_ERRORS.has(errorCode)) return 'VALIDATION';
  if (QUOTA_ERRORS.has(errorCode)) return 'FORBIDDEN';
  return 'NETWORK';
}

function tokenOf(raw: unknown): Result<{ token: string; expiresIn: number }> {
  if (!isRecord(raw)) return failWithDetail('CORRUPT', MSG.corrupt, 'baidu:token');

  const accessToken = raw.access_token;
  if (typeof accessToken !== 'string' || !accessToken) {
    const error = typeof raw.error === 'string' ? raw.error : '';
    const description = typeof raw.error_description === 'string' ? raw.error_description : '';
    return failWithDetail('VALIDATION', MSG.ocr.recognizeFailed, `baidu:token:${error}:${description}`);
  }
  const expiresIn = typeof raw.expires_in === 'number' ? raw.expires_in : 0;
  return ok({ token: accessToken, expiresIn });
}

/** 取 token：同 API Key 且未过期就复用（提前 5 分钟视为过期） */
async function getAccessToken(credentials: OcrCredentials): Promise<Result<string>> {
  const now = Date.now();
  if (cached && cached.apiKey === credentials.apiKey && cached.expiresAt > now) {
    return ok(cached.token);
  }

  /* 百度的取 token 形状：`client_id` = 应用的 **API Key**，`client_secret` = **Secret Key** */
  const query = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: credentials.apiKey,
    client_secret: credentials.secretKey
  }).toString();

  const response = await nodePost(`${OCR_TOKEN_URL}?${query}`, {}, OCR_TIMEOUT_MS);
  if (response.status === 'error') return response;

  const parsed = parseJson(response.value, '百度 token 响应');
  if (parsed.status === 'error') return parsed;

  const token = tokenOf(parsed.value);
  if (token.status === 'error') return token;

  cached = {
    apiKey: credentials.apiKey,
    token: token.value.token,
    expiresAt: now + Math.max(token.value.expiresIn - 300, 60) * 1000
  };
  return ok(token.value.token);
}

/**
 * 百度原始返回 → 行级框。
 *
 * `words_result` 里缺 `words` 或缺 `location` 的项跳过（不猜坐标），**计入 `dropped`** ——
 * 少一行不影响其余，但「少了几行」必须让调用方能说出来（`CONVENTIONS` §1.2 的 filter 策略）。
 * `error_code` 非 0 时按 `bucketOf` 折码，原文进 `detail`。
 */
export function decodeBaiduWords(raw: unknown): Result<{ lines: OcrLine[]; dropped: number }> {
  if (!isRecord(raw)) return failWithDetail('CORRUPT', MSG.corrupt, 'baidu:root');

  const errorCode = raw.error_code;
  if (typeof errorCode === 'number' && errorCode !== 0) {
    const message = typeof raw.error_msg === 'string' ? raw.error_msg : '';
    const code = errorCode === 110 || errorCode === 111 ? 'AUTH' : bucketOf(errorCode);
    return failWithDetail(code, MSG.ocr.recognizeFailed, `baidu:${errorCode}:${message}`);
  }

  const words = raw.words_result;
  if (!Array.isArray(words)) return failWithDetail('CORRUPT', MSG.corrupt, 'baidu:words_result');

  const lines: OcrLine[] = [];
  let dropped = 0;

  for (const item of words) {
    if (!isRecord(item)) {
      dropped += 1;
      continue;
    }

    const content = item.words;
    const location = item.location;
    if (typeof content !== 'string' || !isRecord(location)) {
      dropped += 1;
      continue;
    }

    const { left, top, width, height } = location;
    if (
      typeof left !== 'number' ||
      typeof top !== 'number' ||
      typeof width !== 'number' ||
      typeof height !== 'number'
    ) {
      dropped += 1;
      continue;
    }

    lines.push({ content, left, top, width, height });
  }

  return ok({ lines, dropped });
}

async function recognizeOnce(
  imageBase64: string,
  credentials: OcrCredentials
): Promise<Result<{ lines: OcrLine[]; dropped: number }>> {
  const token = await getAccessToken(credentials);
  if (token.status === 'error') return token;

  const response = await nodePost(
    `${OCR_URL}?access_token=${encodeURIComponent(token.value)}`,
    { image: imageBase64, language_type: 'CHN_ENG', detect_direction: 'true' },
    OCR_TIMEOUT_MS
  );
  if (response.status === 'error') return response;

  const parsed = parseJson(response.value, '百度 OCR 响应');
  if (parsed.status === 'error') return parsed;

  return decodeBaiduWords(parsed.value);
}

/** 识别一张 base64 图：行级框 → 合并成段；`dropped` 是认不出框、被跳过的行数 */
export async function recognize(
  imageBase64: string,
  credentials: OcrCredentials
): Promise<Result<{ blocks: OcrBlock[]; dropped: number }>> {
  let recognized = await recognizeOnce(imageBase64, credentials);

  /* token 失效：清缓存重取一次。别把「token 过期」报成识别失败——那是我们能自愈的 */
  if (recognized.status === 'error' && recognized.code === 'AUTH') {
    cached = null;
    recognized = await recognizeOnce(imageBase64, credentials);
  }
  if (recognized.status === 'error') return recognized;

  return ok({
    blocks: mergeBlocks(recognized.value.lines),
    dropped: recognized.value.dropped
  });
}
