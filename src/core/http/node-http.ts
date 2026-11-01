/**
 * 【范本】Node HTTP 出口：**无 CORS 头的第三方接口**的唯一实现。
 *
 * 为什么不能用 `fetch`：CEP 的页面是 `file://`，Chromium 照常执行同源策略。百度 OCR 的响应
 * 实测**没有** `Access-Control-Allow-Origin`（2026-11-01 `curl` 验过），`fetch` 必被拦。
 * 百度翻译同病，以前靠插 `<script>` 走 JSONP（只能 GET）；Node 既能 GET 也能 POST，
 * 所以两者都收在这里，`core/http/jsonp.ts` 已删。
 *
 * 四条边界：
 *   1. 只回「正文原文」：业务错误码由调用方按各自协议映射（百度 OCR 与翻译的码不是一套）。
 *   2. 按 URL 协议选 `http` / `https` 模块（百度翻译的地址是 `http://`）。
 *   3. **不判 HTTP 状态码**：百度把错误写在 200 的 JSON 里，状态码没有信息量；
 *      2xx 之外的正文也原样交出，由调用方解析后决定成败。
 *   4. 日志不写 url：第三方地址里常带 token / key（与 `postText` 同一条理由）。
 *
 * 参数一律走 `application/x-www-form-urlencoded`（百度两条接口都吃这个）。
 * 要 JSON 体就是第二个入口了 —— 真需要时先改 `CONVENTIONS` §5，别在这里加 `mode`。
 */

import { nodeRequire } from '../cep/node';
import { log } from '../logger';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';

/** 第三方接口一次往返的上限：识别一张大图 5–10s，翻译一段文本 1–3s */
const DEFAULT_TIMEOUT = 20_000;

interface NodeHttpResponse {
  setEncoding(encoding: 'utf8'): void;
  on(event: 'data', listener: (chunk: string) => void): void;
  on(event: 'end', listener: () => void): void;
  on(event: 'error', listener: (error: Error) => void): void;
}

interface NodeHttpRequest {
  on(event: 'timeout', listener: () => void): void;
  on(event: 'error', listener: (error: Error) => void): void;
  setTimeout(ms: number): void;
  write(chunk: string): void;
  end(): void;
  destroy(): void;
}

interface NodeHttpModule {
  request(
    options: {
      method: string;
      hostname: string;
      port: string;
      path: string;
      headers: Record<string, string>;
    },
    callback: (response: NodeHttpResponse) => void
  ): NodeHttpRequest;
}

/** utf8 字节数：`Content-Length` 必须按字节算，中文按字符数算会少，请求会挂住 */
function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function send(
  url: string,
  method: 'GET' | 'POST',
  params: Record<string, string>,
  timeoutMs: number
): Promise<Result<string>> {
  return new Promise<Result<string>>((resolve) => {
    /* 地址写错（`config.ts` 里手改过）时 `new URL` 会抛：在 executor 里抛 = Promise reject，
       调用方拿不到 `Result`、界面会卡在「处理中」。所以在这里折成失败码。 */
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      resolve(failWithDetail('VALIDATION', MSG.codeReason.VALIDATION, 'url:invalid'));
      return;
    }

    const mod = nodeRequire<NodeHttpModule>(parsed.protocol === 'http:' ? 'http' : 'https');
    if (!mod) {
      resolve(failWithDetail('NETWORK', MSG.codeReason.NETWORK, 'node:unavailable'));
      return;
    }

    const query = new URLSearchParams(params).toString();
    const isGet = method === 'GET';
    const path = isGet && query ? `${parsed.pathname}?${query}` : parsed.pathname;
    const body = isGet ? '' : query;

    let settled = false;
    const done = (result: Result<string>): void => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (!isGet) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = String(byteLength(body));
    }

    const req = mod.request(
      { method, hostname: parsed.hostname, port: parsed.port, path, headers },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          text += chunk;
        });
        res.on('end', () => done(ok(text)));
        res.on('error', (error) => {
          log.error('Node 请求读取失败', { host: parsed.hostname, error });
          done(failWithDetail('NETWORK', MSG.codeReason.NETWORK, `node:${error.message}`));
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      done(failWithDetail('TIMEOUT', MSG.codeReason.TIMEOUT, 'node:timeout'));
    });
    req.on('error', (error) => {
      log.error('Node 请求异常', { host: parsed.hostname, error });
      done(failWithDetail('NETWORK', MSG.codeReason.NETWORK, `node:${error.message}`));
    });

    req.setTimeout(timeoutMs);
    if (!isGet) req.write(body);
    req.end();
  });
}

/** GET 一个无 CORS 头的第三方接口，返回正文原文 */
export function nodeGet(
  url: string,
  params: Record<string, string>,
  timeoutMs = DEFAULT_TIMEOUT
): Promise<Result<string>> {
  return send(url, 'GET', params, timeoutMs);
}

/** POST 表单到无 CORS 头的第三方接口，返回正文原文 */
export function nodePost(
  url: string,
  params: Record<string, string>,
  timeoutMs = DEFAULT_TIMEOUT
): Promise<Result<string>> {
  return send(url, 'POST', params, timeoutMs);
}
