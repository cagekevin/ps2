/**
 * JSONP 请求（第三方接口专用）
 *
 * 为什么存在：百度翻译不支持 CORS，`fetch` 会被浏览器拦；原版就是插 `<script>` 走回调。
 * 只服务这类**无 CORS 的第三方接口**，业务代码经 `commands` 调，页面不许自己注入脚本。
 *
 * 三条边界：
 *   1. 回调名全局唯一（序号递增），用完立刻删 `window[名字]` 并移除 script，不堆垃圾
 *   2. 超时 / 加载失败都**清理干净再返回**，不留悬挂回调
 *   3. 返回 `Result<unknown>`；回调载荷是外部数据，解析交给 `domain`
 */

import { log } from '../logger';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';

const DEFAULT_TIMEOUT = 20_000;

let seq = 0;

/** 回调挂到 window 上：JSONP 只能通过全局函数回传，没有类型化的 DOM API */
function setGlobal(name: string, value: unknown): void {
  (window as unknown as Record<string, unknown>)[name] = value;
}

function removeGlobal(name: string): void {
  delete (window as unknown as Record<string, unknown>)[name];
}

/**
 * GET 一个 JSONP 接口。
 *
 * `params` 里不要自己带 `callback`——回调名由本函数生成并追加，调用方传了会被覆盖。
 */
export function jsonpGet(
  url: string,
  params: Record<string, string>,
  timeoutMs = DEFAULT_TIMEOUT
): Promise<Result<unknown>> {
  return new Promise<Result<unknown>>((resolve) => {
    const name = `__mmJsonp${(seq += 1)}`;
    const script = document.createElement('script');

    let settled = false;

    const cleanup = (): void => {
      window.clearTimeout(timer);
      script.remove();
      removeGlobal(name);
    };

    const done = (result: Result<unknown>): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const timer = window.setTimeout(() => {
      log.warn('JSONP 超时', { url, timeoutMs });
      done(failWithDetail('TIMEOUT', MSG.codeReason.TIMEOUT, 'jsonp:translate'));
    }, timeoutMs);

    setGlobal(name, (data: unknown) => done(ok(data)));
    script.onerror = () => done(failWithDetail('NETWORK', MSG.codeReason.NETWORK, `url:${url}`));

    const query = new URLSearchParams(params);
    query.set('callback', name);
    script.src = `${url}?${query.toString()}`;

    document.head.appendChild(script);
  });
}
