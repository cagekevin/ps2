/**
 * 【范本】CEP 通道
 * 所有与 Photoshop 的交互都从这里走：evalScript、应用事件、路径。
 * 组件里不直接碰 window.__adobe_cep__。
 * 文件读写不在这里，统一走 core/storage。
 * 新增同类能力照此结构：类型化入参 → 结果返回 → 失败兜底。
 */

import { log } from '../logger';

/** CEP 执行失败的统一返回值。所有比较都用这个常量，不要写字面量。 */
export const JSX_ERROR = 'EvalScript error.';

export interface CepEvent {
  type: string;
  scope: string;
  data: unknown;
  extensionId?: string;
}

interface AdobeCep {
  evalScript(script: string, callback: (result: string) => void): void;
  getSystemPath(pathType: string): string;
  getExtensionID(): string;
  addEventListener(type: string, listener: (event: CepEvent) => void): void;
  dispatchEvent(event: unknown): void;
  getHostEnvironment(): string;
}

declare global {
  interface Window {
    __adobe_cep__?: AdobeCep;
    CSEvent?: new (type?: string, scope?: string) => CepEvent;
    cep_node?: { require: (id: string) => unknown };
    cep?: { util: { openURLInDefaultBrowser(url: string): void } };
  }
}

/** 是否运行在 Photoshop 的 CEP 容器里 */
export function isCep(): boolean {
  return Boolean(window.__adobe_cep__);
}

/** 单条脚本超时：PS 卡住时不能让整个通道永久挂起 */
const DEFAULT_TIMEOUT = 30_000;

/**
 * ExtendScript 是单线程的，并发发多条 evalScript 时返回顺序不保证。
 * 表现：快速连点 3 个色块，最后生效的可能不是最后点的那个。
 * 用 Promise 链保证先进先出；某条失败不影响后续。
 */
let evalQueue: Promise<unknown> = Promise.resolve();

function runScript(script: string, timeout: number): Promise<string> {
  const cep = window.__adobe_cep__;
  if (!cep) return Promise.resolve('');

  return new Promise<string>((resolve) => {
    let settled = false;

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      log.warn('evalScript 超时，队列放行（PS 侧可能仍在执行）', {
        script: script.slice(0, 60),
        timeout
      });
      resolve(JSX_ERROR);
    }, timeout);

    const done = (result: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(result);
    };

    try {
      cep.evalScript(script, done);
    } catch (error) {
      log.error('evalScript 抛异常', { error, script: script.slice(0, 60) });
      done(JSX_ERROR);
    }
  });
}

/** 执行 ExtendScript，返回字符串结果（串行 + 超时） */
export function evalScript(script: string, timeout = DEFAULT_TIMEOUT): Promise<string> {
  const task = evalQueue.then(() => runScript(script, timeout));

  evalQueue = task.then(
    () => undefined,
    () => undefined
  );
  return task;
}

/**
 * 按原面板约定拼参数：
 *   数字 / 布尔 → 裸传
 *   字符串 / 对象 → 先转成文本，再用**单引号**包裹
 *
 * 关键：对象传过去是**字符串**，不是对象字面量。
 * 官方 jsx 内部按字符串处理（replace / JSON.parse），传对象会直接抛异常，
 * 表现为 `EvalScript error.`。
 */
function toJsxArg(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  /* 先转义反斜杠再转义单引号，顺序不能反 */
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/**
 * jsx 调用结果。
 * 只区分「宿主层失败」和「拿到了返回值」；
 * 业务码（no-doc / not-shape 等）由各能力函数自己判，不在通用层定义。
 */
export type JsxCall = { ok: true; raw: string } | { ok: false; reason: string };

/**
 * 调用 jsx 函数。
 * 包 try/catch 是为了拿到真实异常：直接 evalScript 时函数内部抛错只得到 `EvalScript error.`。
 *
 * 宿主层失败（超时、脚本抛异常、函数不存在）统一走 ok: false，
 * 调用方不用再各自判 `JSX_ERROR` 和 `error:` 前缀——那是最容易抄错的地方。
 */
export async function callJsx(
  fn: string,
  args: unknown[] = [],
  options: { silent?: boolean; timeout?: number } = {}
): Promise<JsxCall> {
  args.forEach((arg, index) => {
    if (arg === undefined) {
      throw new Error(`jsx 参数第 ${index + 1} 个是 undefined（${fn}）`);
    }
  });

  const params = args.map(toJsxArg).join(', ');
  const script =
    `(function(){try{var __r = ${fn}(${params});` +
    `return (typeof __r === 'string') ? __r : JSON.stringify(__r);}` +
    `catch(e){return 'error:' + ((e && e.message) ? e.message : String(e));}})()`;

  const raw = await evalScript(script, options.timeout);

  /* 轮询类调用（图层状态）不记 info，否则每 0.8 秒一条，日志几小时就几 MB */
  if (!options.silent) log.info('jsx 调用', { fn, args, raw });

  if (raw === JSX_ERROR) {
    log.error('jsx 执行失败', { fn, raw });
    return { ok: false, reason: 'PS 脚本执行失败（超时或异常）' };
  }
  if (raw.startsWith('error:')) {
    log.error('jsx 内部异常', { fn, reason: raw.slice(6) });
    return { ok: false, reason: raw.slice(6) };
  }

  return { ok: true, raw };
}

/** 加载 jsx 文件到 PS */
export function loadJsx(relativePath: string): Promise<string> {
  /* Windows 路径含反斜杠，放进 evalScript 字符串会被当转义，必须转成正斜杠 */
  const base = getExtensionPath().replace(/\\/g, '/');
  if (!base) return Promise.resolve(JSX_ERROR);
  return evalScript(`$.evalFile("${base}/${relativePath}")`);
}

/**
 * CEP 桥返回的是 URI（`file:///C:/...`），Node fs 读不了。
 * 必须 decode + 转正斜杠 + 剥 file 前缀，才能当本地路径用。
 * 平台差异按形状判：盘符开头是 Windows，否则补前导斜杠（macOS）。
 */
export function toLocalPath(uri: string): string {
  if (!uri) return '';

  let text: string;
  try {
    text = decodeURI(uri);
  } catch {
    text = uri;
  }

  const path = text
    .replace(/\\/g, '/')
    .replace(/^file:\/*/, '')
    .replace(/\/+$/, '');

  if (!path) return '';
  if (!/^[A-Za-z]:\//.test(path) && !path.startsWith('/')) return `/${path}`;
  return path;
}

export function getExtensionPath(): string {
  return toLocalPath(window.__adobe_cep__?.getSystemPath('extension') ?? '');
}

export function getUserDataPath(): string {
  return toLocalPath(window.__adobe_cep__?.getSystemPath('userData') ?? '');
}

export function getExtensionId(): string {
  return window.__adobe_cep__?.getExtensionID() ?? '';
}

/** 监听应用级 CEP 事件 */
export function onAppEvent(type: string, handler: (data: unknown) => void): void {
  const cep = window.__adobe_cep__;
  if (!cep) return;
  cep.addEventListener(type, (event) => handler(event.data));
}

/** 广播应用级 CEP 事件 */
export function emitAppEvent(type: string, data: unknown): void {
  const CSEventCtor = window.CSEvent;
  const cep = window.__adobe_cep__;
  if (!CSEventCtor || !cep) return;
  const event = new CSEventCtor(type, 'APPLICATION');
  event.data = data;
  cep.dispatchEvent(event);
}

/* 文件读写统一走 core/storage，这里只保留通道能力 */
