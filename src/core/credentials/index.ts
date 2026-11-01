/**
 * 【范本】凭证的唯一持有者：百度云 OCR（API Key / Secret Key）+ 百度翻译（AppID / 密钥）。
 *
 * **为什么不放 `prefs.json`**：`CONVENTIONS` §4.8 —— 凭证不进偏好文件。
 * **为什么不放 `config.ts`**：那个文件**进 git**，密钥写进去会被推到远端
 * （百度控制台的原话也是「切勿填写在第三方插件、开源代码或前端页面中」）。
 * **为什么不用 `userData` 根**：那是隐藏目录（macOS `~/Library/Application Support`、
 * Windows `%APPDATA%`），让用户自己去翻系统目录改 JSON 不现实。
 *
 * 落盘：`core/storage` 的 `data` 根（`~/Library/Application Support/Maomao/`、`%APPDATA%\Maomao\`），
 * **在项目目录之外，不进 git**。用户不用去那里改文件 —— 设置页整段粘贴即可（见文件末尾两个导出）。
 *
 * 文件形状（分节，两套凭证互不干扰）：
 *
 * ```json
 * { "ocr": { "apiKey": "...", "secretKey": "..." },
 *   "translate": { "appId": "...", "key": "..." } }
 * ```
 *
 * 兼容：2026-11-01 之前的扁平 `{ apiKey, secretKey }` 按 `ocr` 节读（旧文件不用手动改）。
 *
 * 三条边界：
 *   1. 只由本文件读写；别的模块要凭证就调 `readXxxCredentials()`，不许自己拼文件名。
 *   2. 读失败原样透传（`NOT_FOUND` = 还没配，调用方据此提示去设置，而不是报网络错）。
 *   3. 写走 `writeTextAtomic`，且**先读旧文件再合并本节** —— 存 OCR 不许把翻译那节冲掉。
 */

import { readTextResult, writeTextAtomic } from '../storage';
import { isRecord } from '../../types/guards';
import { parseJson } from '../../types/json';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';

/** 百度云应用的两个值：取 token 走 `client_id=API Key` + `client_secret=Secret Key` */
export interface OcrCredentials {
  apiKey: string;
  secretKey: string;
}

/** 百度翻译开放平台的两个值：`sign = md5(appId + q + salt + key)` */
export interface TranslateCredentials {
  appId: string;
  key: string;
}

/**
 * 落盘位置：`core/storage` 的 `data` 根（`~/Library/Application Support/Maomao/`、
 * `%APPDATA%\Maomao\`）。
 *
 * 用户不需要去找这个文件 —— 设置页可以整段粘贴导入（`readCredentialsText` /
 * `importCredentialsText`），文件位置只是「存在哪」，不是「怎么配」。
 */
const FILE = 'credentials.json';

function readRaw(): Result<Record<string, unknown>> {
  const text = readTextResult(FILE, 'data');
  if (text.status === 'error') return text;

  const parsed = parseJson(text.value, '凭证文件');
  if (parsed.status === 'error') return parsed;

  if (!isRecord(parsed.value)) return failWithDetail('CORRUPT', MSG.corrupt, 'credentials:root');
  return ok(parsed.value);
}

/** 取一节；`flat` 用于兼容旧格式（根上直接放字段） */
function sectionOf(raw: Record<string, unknown>, key: 'ocr' | 'translate'): unknown {
  if (isRecord(raw[key])) return raw[key];
  /* 旧格式：根上直接是 { apiKey, secretKey }，只有 ocr 这一节 */
  if (key === 'ocr' && ('apiKey' in raw || 'secretKey' in raw)) return raw;
  return undefined;
}

function decodeOcr(raw: unknown): Result<OcrCredentials> {
  if (!isRecord(raw)) return failWithDetail('NOT_FOUND', MSG.corrupt, 'credentials:ocr');

  const { apiKey, secretKey } = raw;
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    return failWithDetail('CORRUPT', MSG.corrupt, 'credentials:ocr.apiKey');
  }
  if (typeof secretKey !== 'string' || !secretKey.trim()) {
    return failWithDetail('CORRUPT', MSG.corrupt, 'credentials:ocr.secretKey');
  }
  return ok({ apiKey: apiKey.trim(), secretKey: secretKey.trim() });
}

function decodeTranslate(raw: unknown): Result<TranslateCredentials> {
  if (!isRecord(raw)) return failWithDetail('NOT_FOUND', MSG.corrupt, 'credentials:translate');

  const { appId, key } = raw;
  if (typeof appId !== 'string' || !appId.trim()) {
    return failWithDetail('CORRUPT', MSG.corrupt, 'credentials:translate.appId');
  }
  if (typeof key !== 'string' || !key.trim()) {
    return failWithDetail('CORRUPT', MSG.corrupt, 'credentials:translate.key');
  }
  return ok({ appId: appId.trim(), key: key.trim() });
}

/**
 * 当前配置的原文（设置页那个**单行框**的初始值）。
 *
 * 文件不存在时返回**模板**（空字段），用户照样子填完粘贴回来即可 —— 不让用户去翻文件。
 */
export function readCredentialsText(): Result<string> {
  const raw = readRaw();
  if (raw.status === 'ok') return ok(`${JSON.stringify(raw.value, null, 2)}\n`);
  if (raw.code !== 'NOT_FOUND') return raw;

  return ok(
    `${JSON.stringify(
      {
        ocr: { apiKey: '', secretKey: '' },
        translate: { appId: '', key: '' }
      },
      null,
      2
    )}\n`
  );
}

/**
 * 从**一整段文本**导入（设置页粘贴一次就完事）。
 *
 * 只覆盖文本里出现的节：只贴 `ocr` 就只改 OCR，`translate` 那节原样保留。
 * 两节都没有、或字段是空的 → `VALIDATION`（不写半截配置）。
 */
export async function importCredentialsText(text: string): Promise<Result<void>> {
  const parsed = parseJson(text, '凭证文本');
  if (parsed.status === 'error') return parsed;
  if (!isRecord(parsed.value)) {
    return failWithDetail('VALIDATION', MSG.credentials.badText, 'root:not-object');
  }

  const hasOcr = 'ocr' in parsed.value;
  const hasTranslate = 'translate' in parsed.value;
  if (!hasOcr && !hasTranslate) {
    return failWithDetail('VALIDATION', MSG.credentials.badText, 'sections:none');
  }

  const next: Record<string, unknown> = {};

  if (hasOcr) {
    const ocr = decodeOcr(sectionOf(parsed.value, 'ocr'));
    if (ocr.status === 'error') return ocr;
    next.ocr = ocr.value;
  }

  if (hasTranslate) {
    const translate = decodeTranslate(parsed.value.translate);
    if (translate.status === 'error') return translate;
    next.translate = translate.value;
  }

  /* 读旧文件再合并：只贴一节时，另一节不能被冲掉 */
  const raw = readRaw();
  if (raw.status === 'error' && raw.code !== 'NOT_FOUND') return raw;

  const base = raw.status === 'ok' ? raw.value : {};
  const merged: Record<string, unknown> = { ...base, ...next };
  delete merged.apiKey;
  delete merged.secretKey;

  return writeTextAtomic(FILE, `${JSON.stringify(merged, null, 2)}\n`);
}

/** 读 OCR 凭证：`NOT_FOUND` = 还没配（**不创建文件**，首次创建只在用户点保存时） */
export function readOcrCredentials(): Result<OcrCredentials> {
  const raw = readRaw();
  if (raw.status === 'error') return raw;
  return decodeOcr(sectionOf(raw.value, 'ocr'));
}


/** 读翻译凭证：`NOT_FOUND` = 还没配 */
export function readTranslateCredentials(): Result<TranslateCredentials> {
  const raw = readRaw();
  if (raw.status === 'error') return raw;
  return decodeTranslate(sectionOf(raw.value, 'translate'));
}

