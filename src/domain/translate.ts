/**
 * 翻译的纯规则：语言表 / 混淆文本编解码 / 请求签名 / 响应解析。
 *
 * 只放算法与常量：不发请求（`core/http/node-http`）、不读写文件（`repo`）、不弹提示（页面）。
 *
 * 三个必须照抄原版的地方，改了就整条链路错：
 *   1. `encodeText` / `decodeText` 是原版 `Xv` / `qv`，与 `core/cep/text-codec` 的同名函数
 *      **不是同一套算法**——那套服务 `ys_*` 参数，这套服务 `zt_getCurrentText` 的文本
 *   2. 签名顺序是 `md5(appid + q + salt + key)`，salt 同时当 `_time`
 *   3. 结束语言的默认值是 `auto`，但面板**显示**「英文」（原版自身不一致，照抄）
 */

import { failWithDetail, ok, type ErrorCode, type Result } from '../types/result';
import { decodeList } from '../types/decode-list';
import { isRecord } from '../types/guards';
import { MSG } from '../types/messages';
import { md5 } from './md5';

/** 凭证由调用方传（`credentials.json`，不进 git）；本文件只放签名与解码 */

/** 单段文本上限（`app.v4.js:43339`）；每日次数上限见 `DAILY_LIMIT`，两者不是一回事 */
export const MAX_TEXT_LENGTH = 1000;

/**
 * 目标语言不能是 `auto`：百度要求明确目标语种，原版设置里默认 `to: 'auto'` 直接发会被拒。
 *
 * 兜成中文（原版面板显示的目标语言也是中文）。**只此一处判**，命令层不再自己兜。
 */
export function resolveTargetLang(to: string): string {
  return to === 'auto' || !to ? 'zh' : to;
}

/**
 * 百度翻译的错误码 → 本仓码 + 一句话。
 *
 * 以前所有非 0 码都折成 `CORRUPT`「返回数据无法识别」——账户欠费（54004）会被显示成
 * 「数据坏了」，用户去修一个没坏的东西。表里没有的码才归 `CORRUPT`。
 *
 * 码表来源：百度翻译开放平台文档（错误码说明）。
 */
const TRANSLATE_ERRORS: Record<string, { code: ErrorCode; reason: string }> = {
  '52001': { code: 'TIMEOUT', reason: MSG.font.translateBusy },
  '52002': { code: 'NETWORK', reason: MSG.font.translateBusy },
  '52003': { code: 'AUTH', reason: MSG.font.translateUnauthorized },
  '54000': { code: 'VALIDATION', reason: MSG.font.translateParams },
  '54001': { code: 'AUTH', reason: MSG.font.translateUnauthorized },
  '54003': { code: 'NETWORK', reason: MSG.font.translateBusy },
  '54004': { code: 'FORBIDDEN', reason: MSG.font.translateQuota },
  '54005': { code: 'NETWORK', reason: MSG.font.translateBusy },
  '58000': { code: 'FORBIDDEN', reason: MSG.font.translateUnauthorized },
  '58001': { code: 'VALIDATION', reason: MSG.font.translateParams },
  '58002': { code: 'FORBIDDEN', reason: MSG.font.translateQuota }
};

/** 每日翻译次数上限（`app.v4.js:42900`，原版就是 380，不是 1000） */
export const DAILY_LIMIT = 380;

/** 12 个语言，顺序与 `app.v4.js:30887-30888` 一致 */
export const LANGUAGES: ReadonlyArray<{ label: string; code: string }> = [
  { label: '自动检测', code: 'auto' },
  { label: '中文', code: 'zh' },
  { label: '英语', code: 'en' },
  { label: '日语', code: 'jp' },
  { label: '韩语', code: 'kor' },
  { label: '法语', code: 'fra' },
  { label: '俄语', code: 'ru' },
  { label: '意大利语', code: 'it' },
  { label: '西班牙语', code: 'spa' },
  { label: '德语', code: 'de' },
  { label: '越南语', code: 'vie' },
  { label: '泰语', code: 'th' }
];

/** 原版 `Xv`：把 jsx 给出的混淆文本编码成可发送的文本（第 0 位加长度，之后逐位叠加前一位） */
export function encodeText(value: string): string {
  if (!value) return value;

  let out = String.fromCharCode(value.charCodeAt(0) + value.length);
  for (let index = 1; index < value.length; index += 1) {
    out += String.fromCharCode(value.charCodeAt(index) + value.charCodeAt(index - 1));
  }
  return escape(out);
}

/** 原版 `qv`：发送前还原成可读文本；对已经还原过的文本再调一次会得到乱码 */
export function decodeText(value: string): string {
  if (!value) return value;

  const raw = unescape(value);
  let out = String.fromCharCode(raw.charCodeAt(0) - raw.length);
  for (let index = 1; index < raw.length; index += 1) {
    out += String.fromCharCode(raw.charCodeAt(index) - out.charCodeAt(index - 1));
  }
  return out;
}

/** 请求参数（全部字符串：URLSearchParams 只吃字符串，数字会被静默转成文本） */
export function buildTranslateParams(input: {
  text: string;
  from: string;
  to: string;
  /** 调用方给（来自 `credentials.json`，不进 git）；本函数不持有密钥 */
  appId: string;
  key: string;
  salt?: string;
}): Record<string, string> {
  const salt = input.salt ?? String(Date.now());

  return {
    q: input.text,
    appid: input.appId,
    salt,
    from: input.from,
    to: input.to,
    sign: md5(input.appId + input.text + salt + input.key),
    _time: salt
  };
}

/**
 * 解析一段译文。
 *
 * 成功码有两代：新接口 `52000`、老接口 `0`，两种都认（原版只判 `trans_result[0].dst`）。
 * 失败码 `CORRUPT`，`detail` 带 `error_msg`（外部原话，排障只认它）。
 */
export function decodeTranslateResponse(raw: unknown): Result<string> {
  if (!isRecord(raw)) {
    return failWithDetail('CORRUPT', MSG.badPayload, `raw:${String(raw).slice(0, 120)}`);
  }

  const code = raw.error_code;
  if (code !== undefined && String(code) !== '0' && String(code) !== '52000') {
    const key = String(code);
    const message = typeof raw.error_msg === 'string' ? raw.error_msg : `error_code:${key}`;
    /* 已知码按语义折（账户欠费不该显示成「返回数据无法识别」）；未知码才归 CORRUPT */
    const known = TRANSLATE_ERRORS[key];
    if (known) return failWithDetail(known.code, known.reason, `api:${key}:${message}`);
    return failWithDetail('CORRUPT', MSG.badPayload, `api:${key}:${message}`);
  }

  const results = raw.trans_result;
  if (!Array.isArray(results) || results.length === 0) {
    return failWithDetail('CORRUPT', MSG.badPayload, `noText:${JSON.stringify(raw).slice(0, 120)}`);
  }

  const first: unknown = results[0];
  const dst = isRecord(first) ? first.dst : undefined;
  if (typeof dst !== 'string' || !dst) {
    return failWithDetail('CORRUPT', MSG.badPayload, `noText:${JSON.stringify(first).slice(0, 120)}`);
  }

  return ok(dst);
}

/** 一段待翻译文本；`dst` 由命令层回填，宿主返回里没有 */
export interface TranslateItem {
  text: string;
  [key: string]: unknown;
}

/**
 * `zt_getCurrentText` 的载荷 → 条目数组。
 *
 * 每条必须有 `text`：缺了就无法翻译，也没法判断 1000 字上限——
 * 宁可报「第 N 段没有文本」，也不要按空串继续把用户的图层改坏。
 */
/** 一段文本：必须有 `text` 字符串，其余键原样保留 */
function translateItem(value: unknown, path: string): Result<TranslateItem> {
  if (!isRecord(value) || typeof value.text !== 'string') {
    return failWithDetail('CORRUPT', MSG.corrupt, `${path}.text`);
  }
  return ok({ ...value, text: value.text });
}

export function decodeTranslateItems(raw: unknown): Result<TranslateItem[]> {
  /* 数组判定与逐项循环都在 `decodeList` 里（唯一判据），这里只写「一段长什么样」 */
  const decoded = decodeList(raw, translateItem, 'reject');
  if (decoded.status === 'error') return decoded;
  return ok(decoded.value.items);
}
