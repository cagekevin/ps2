/**
 * 本域（宿主事件）以此为准：`src/core/cep/ps-events.ts` 的 `HostEventName` + `SPECS`。新增事件只加语义行（ID 列表 + 载荷判据），不开第二个订阅模块。
 *
 * 【范本】PS 宿主事件订阅（原版 `$psEvent.add` 的可读移植）。
 *
 * CEP 面板收 PS 脚本事件的两步（缺一步事件静默不来）：
 *   1. `registerPhotoshopEvent`：向桥 `dispatchEvent({type: PhotoshopRegisterEvent, data: 事件ID})`
 *   2. `onPhotoshopCallback`：监听 `PhotoshopJSONCallback<extensionId>`，`event.data` 是
 *      `JSON.parse(raw.substring(5))` 可解的载荷（前缀 5 字符，原版 `e.data.substring(5)`）
 *
 * **这两步全在 CEP 层，不需要 jsx**（旧注释「事件需要 jsx 侧 registerNotification」是错的）。
 *
 * ## 为什么不是一张「ID → 语义」的表
 *
 * 官方是 `switch (s) { case <ID>: if (载荷条件) handleKey(<语义>, …) }`
 * （`app.v4.js:69396-69475`）——**同一个 ID 会命中多个语义，每个语义有自己的载荷条件**：
 * `1298866208` 既是「切了文档」（载荷有 `documentID`），也是「文字图层变了」
 * （载荷 `null._ref === 'textLayer'`）。
 *
 * 所以本文件的模型是 **语义 → (事件 ID 列表 + 载荷判据)**：
 * - 一个语义可对应多个 ID（官方 `ztSelectLayer` 挂了 4 个）；
 * - 一个 ID 可被多个语义共用（**注册时按 ID 去重**——同一 ID 注册两次会让先注册的静默收不到）。
 *
 * 载荷判据要拿得到事件 ID（官方的条件按 ID 分支），所以 `matches` 收两个参数。
 *
 * ## 两个入口，按「常驻 / 一次性」分
 *
 * - 常驻监听（图层变了就重读）：`subscribeHostEvent`，返回 `Result<取消函数>`，由持有者负责退订。
 * - 一次性等待（吸色等用户取色）：`startHostEventWait`，订阅 / 超时 / 退订的生命周期都在这里，
 *   调用方只递判据。**别再在命令层自己拼订阅数组 + 超时 + 退订顺序**。
 */
import { getExtensionId } from './bridge';
import { log } from '../logger';
import { isRecord } from '../../types/guards';
import { parseJson } from '../../types/json';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';

/** CEP 桥；类型来自 bridge.ts 的 declare global，这里判空取用 */
function getBridge() {
  return window.__adobe_cep__;
}

/**
 * 我们关心的**语义**（不是事件 ID）。
 *
 * 命名按「发生了什么」而不是按 ID，因为一个 ID 可命中多个语义。
 */
export type HostEventName =
  /** 属性被修改（`setd`）：吸色完成、文字样式变了 */
  | 'setd'
  /** 选区变化（`slct`）原始投递：官方用它判「用户切走 → 取消吸色」 */
  | 'selection'
  /** 当前图层变了：官方 `ztSelectLayer` 的触发条件 */
  | 'layerChanged'
  /** 切了文档：官方 `tbSwitchDocument` 的触发条件 */
  | 'documentChanged'
  /** 拖入图片：常用页自动嵌入 / 转链接智能对象（开关在订阅方） */
  | 'imageDropped'
  /** 粘贴图片：常用页自动嵌入 */
  | 'imagePasted'
  /** 用剪贴蒙版：常用页自动嵌入 */
  | 'clipMaskCreated'
  /** 前景 / 背景色被改：常用页智能填色 */
  | 'fillColorChanged'
  /** 拖出参考线：常用页智能参考线 */
  | 'referenceDrawn';

export interface PhotoshopEventPayload {
  eventID?: number;
  eventData?: {
    /** `_path` 只在拖入类事件里有：被拖入文件的绝对路径（官方 `app.v4.js:69430` 一带） */
    null?: { _ref?: string; _property?: string; _path?: string };
    to?: { _obj?: string };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** 一个语义 = 事件 ID 列表 + 载荷判据 + 官方出处 */
interface HostEventSpec {
  /** 该语义对应的事件 ID；一个 ID 可被多个语义共用（注册时按 ID 去重） */
  ids: readonly string[];
  /**
   * 载荷判据：不满足就不投给这个语义。
   *
   * 第二个参数是事件 ID —— 官方的条件是**按 ID 分支**的
   * （`case 1416785510: 无条件` vs `case 1298866208: 载荷 null._ref === 'textLayer'`）。
   */
  matches: (payload: PhotoshopEventPayload, eventId: string) => boolean;
  /** 官方出处（`app.v4.js` 行号），写清楚免得下一个人重新推一遍 */
  origin: string;
}

/* 官方用到的 ID（`app.v4.js:69396-69475` 的 switch 里逐个 case） */
const ID_SETD = '1936028772'; // setd：属性被修改
const ID_SLCT = '1936483188'; // slct：选区变化
const ID_1416785510 = '1416785510'; // 官方无条件 → ztSelectLayer
const ID_1298866208 = '1298866208'; // 官方：documentID → 换文档；null._ref==='textLayer' → ztSelectLayer
const ID_1131180832 = '1131180832'; // 官方：documentID → 换文档
const ID_1332768288 = '1332768288'; // 官方：documentID → 换文档
const ID_437 = '437'; // 官方：documentID → 换文档
const ID_1349280544 = '1349280544'; // 拖入图片（常用页）
const ID_1885434740 = '1885434740'; // 粘贴图片（常用页）
const ID_1198682188 = '1198682188'; // 用剪贴蒙版（常用页）

/** 原版 `e.data.substring(5)` */
const PREFIX_LENGTH = 5;
const REGISTER_EVENT = 'com.adobe.PhotoshopRegisterEvent';
const CALLBACK_PREFIX = 'com.adobe.PhotoshopJSONCallback';

/** `slct` 载荷里的图层 id 数组（官方：`r.eventData.layerID`） */
function layerIdsOf(payload: PhotoshopEventPayload): string[] | null {
  const layerId = payload.eventData?.layerID;
  if (!Array.isArray(layerId)) return null;
  return layerId.map(String);
}

/** `slct` 载荷里有 `documentID` = 用户切了文档 */
function hasDocumentId(payload: PhotoshopEventPayload): boolean {
  return typeof payload.eventData?.documentID !== 'undefined';
}

/** 官方 `null._ref === 'textLayer'`（文字图层相关） */
function isTextLayerRef(payload: PhotoshopEventPayload): boolean {
  return payload.eventData?.null?._ref === 'textLayer';
}

/**
 * 官方 `setd` 的第三支：`to._obj === 'textStyle'`（`app.v4.js:69417`）。
 *
 * 命中时官方重读文字属性（`ztSelectLayer`）。漏掉它 = 用户在 PS 里改字号 / 字体后，
 * 面板显示旧值，而轮询的身份 key 是「类型 + 名字」，样式变化不改 key，兜不住。
 */
function isTextStyleSetd(payload: PhotoshopEventPayload): boolean {
  return payload.eventData?.to?._obj === 'textStyle';
}

/**
 * `setd` 的第二支：前景 / 背景色被改（官方两支分别喂 `cy_smartFillColor` / `cy_smartFillLineColor`）。
 * 返回具体是哪一个，好让订阅方一次判完就走对应分支——两个语义各自再判一遍就会分叉。
 */
export function fillColorOf(payload: PhotoshopEventPayload): 'foregroundColor' | 'backgroundColor' | null {
  const prop = payload.eventData?.null?._property;
  if (prop === 'foregroundColor' || prop === 'backgroundColor') return prop;
  return null;
}

/**
 * 拖入类载荷里的文件绝对路径（官方 `eventData.null._path`）。
 *
 * **归一化在通道层做**（`\` → `/`）：路径来自 PS，Windows 上是反斜杠；
 * 让每个订阅方自己 `replace` 一遍，就是第 2、3 份同样的字符串处理。
 * 空串 / 非字符串返回 null —— 「拿不到路径」与「路径是空串」对调用方是同一件事。
 */
const BACKSLASH = /\\/g;

export function droppedPathOf(payload: PhotoshopEventPayload): string | null {
  const raw = payload.eventData?.null?._path;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return raw.replace(BACKSLASH, '/');
}

/** `setd` 的参考线支：`to._obj` 是 `singleRow`（水平）或 `singleColumn`（竖直） */
export function referenceTargetOf(payload: PhotoshopEventPayload): 'singleRow' | 'singleColumn' | null {
  const obj = payload.eventData?.to?._obj;
  if (obj === 'singleRow' || obj === 'singleColumn') return obj;
  return null;
}

const SPECS: Record<HostEventName, HostEventSpec> = {
  /* 原始投递：官方在这两个 ID 上还判了载荷条件，我们把条件交给订阅方（吸色判 foregroundColor） */
  setd: {
    ids: [ID_SETD],
    matches: () => true,
    origin: 'app.v4.js:69412'
  },
  selection: {
    ids: [ID_SLCT],
    matches: () => true,
    origin: 'app.v4.js:69427'
  },

  /**
   * 当前图层变了 = 官方 `ztSelectLayer` 的触发条件（`app.v4.js:42472` 挂了 4 个 ID）：
   * - `1416785510`：**无条件**（官方 `case 1416785510: n.handleKey("ztSelectLayer", r)`）
   * - `1298866208`：载荷 `null._ref === 'textLayer'`
   * - `1936483188`（slct）：载荷有 `layerID` **且长度为 1**
   *   （官方多选时只触发 `ztSwitchLayer`，不触发 `ztSelectLayer`）
   * - `1936028772`（setd）：载荷 `to._obj === 'textStyle'`（官方 `:69417`）
   */
  layerChanged: {
    ids: [ID_SLCT, ID_1416785510, ID_1298866208, ID_SETD],
    matches: (payload, eventId) => {
      if (eventId === ID_1416785510) return true;
      if (eventId === ID_1298866208) return isTextLayerRef(payload);
      if (eventId === ID_SETD) return isTextStyleSetd(payload);
      const ids = layerIdsOf(payload);
      return ids !== null && ids.length === 1;
    },
    origin: 'app.v4.js:69427 / :69460 / :69448 / :69412'
  },

  /**
   * 切了文档 = 官方 `tbSwitchDocument` 的触发条件：
   * 载荷里有 `documentID`（官方在 4 个 ID 上都判这一条）。
   */
  documentChanged: {
    ids: [ID_SLCT, ID_1298866208, ID_1131180832, ID_1332768288, ID_437],
    matches: (payload) => hasDocumentId(payload),
    origin: 'app.v4.js:69427 / :69448 / :69424 / :69443 / :69455'
  },

  /*
   * 常用页三条拖入类语义：官方在这三个 ID 上**没有载荷判据**，
   * 是否动作由订阅方按设置开关门控（`13-常用-V2` §1.4）。
   * 通道层只投递，不判开关——判开关会让「开关的值从哪来」渗进通道层。
   */
  imageDropped: {
    ids: [ID_1349280544],
    matches: () => true,
    origin: 'app.v4.js:69408-69440（ID 与语义见 plan 13 §1.4）'
  },
  imagePasted: {
    ids: [ID_1885434740],
    matches: () => true,
    origin: 'app.v4.js:69408-69440（ID 与语义见 plan 13 §1.4）'
  },
  clipMaskCreated: {
    ids: [ID_1198682188],
    matches: () => true,
    origin: 'app.v4.js:69408-69440（ID 与语义见 plan 13 §1.4）'
  },
  /** 智能填色：与 `layerChanged` 共用 `setd`，判据不同（`_property` vs `to._obj`） */
  fillColorChanged: {
    ids: [ID_SETD],
    matches: (payload) => fillColorOf(payload) !== null,
    origin: 'app.v4.js:69412-69423'
  },
  /** 智能参考线：同上共用 `setd` */
  referenceDrawn: {
    ids: [ID_SETD],
    matches: (payload) => referenceTargetOf(payload) !== null,
    origin: 'app.v4.js:69412-69423'
  }
};

type Listener = (payload: PhotoshopEventPayload) => void;

const listeners = new Map<HostEventName, Set<Listener>>();
/** 已注册的**事件 ID**（不是语义名）：同一 ID 被多个语义共用时只注册一次 */
const registeredIds = new Set<string>();
let callbackInstalled = false;

function ensureCallback(): void {
  if (callbackInstalled) return;

  onPhotoshopCallback((payload) => {
    const eventId = String(payload.eventID ?? '');
    for (const [name, spec] of Object.entries(SPECS) as [HostEventName, HostEventSpec][]) {
      if (!spec.ids.includes(eventId)) continue;
      if (!spec.matches(payload, eventId)) continue;
      for (const listener of listeners.get(name) ?? []) listener(payload);
    }
  });

  callbackInstalled = true;
}

/**
 * 载荷守卫：这个类型所有字段都是可选的，能判的只有「是个对象」。
 * 写成守卫而不是 `as` —— 断言不做校验，守卫至少把判断留在一处。
 */
function isEventPayload(value: unknown): value is PhotoshopEventPayload {
  return isRecord(value);
}

/** 原版 `e.data.substring(5)` 后 JSON；解不开返回 null（调用方记日志丢弃） */
function decodeEventPayload(raw: unknown): PhotoshopEventPayload | null {
  if (typeof raw !== 'string') return null;
  const parsed = parseJson(raw.substring(PREFIX_LENGTH), 'PS 事件载荷');
  if (parsed.status !== 'ok' || !isEventPayload(parsed.value)) return null;
  return parsed.value;
}

/** 原版 `bindEvent`：桥收对象不是 JSON 字符串，不补 appId */
function registerPhotoshopEvent(typeId: string): boolean {
  const bridge = getBridge();
  const id = getExtensionId();
  if (!bridge?.dispatchEvent || !id) return false;

  bridge.dispatchEvent({
    type: REGISTER_EVENT,
    scope: 'APPLICATION',
    appId: undefined,
    extensionId: id,
    data: typeId
  });
  return true;
}

function onPhotoshopCallback(handler: (payload: PhotoshopEventPayload) => void): () => void {
  const bridge = getBridge();
  const id = getExtensionId();
  if (!bridge?.addEventListener || !id) return () => {};

  const type = `${CALLBACK_PREFIX}${id}`;
  const listener = (event: unknown) => {
    const data = isRecord(event) ? event.data : undefined;
    const payload = decodeEventPayload(data);
    if (!payload) {
      log.error('PS 回调载荷读不懂，已丢弃本次事件', { data });
      return;
    }
    handler(payload);
  };

  bridge.addEventListener(type, listener);
  /* 全局单例回调，永不注销；分发走自家的 listeners 表，表里删了就不再投递 */
  return () => {};
}

/**
 * `setd` 的官方判据（`app.v4.js:69412-69423` 第一支）：只有前景色被改才算吸色完成。
 *
 * **推导，不是第二份判据**：判据只有 `fillColorOf` 一张表，这里只回答「是不是前景那一支」。
 * 自己再读一遍 `_property` 就会出现两份比对，改一处漏一处。
 */
export function isForegroundSetd(payload: PhotoshopEventPayload): boolean {
  return fillColorOf(payload) === 'foregroundColor';
}

/**
 * 订阅宿主事件，返回 `Result<取消函数>`。
 *
 * **不抛异常**：订阅失败（非 CEP 环境 / 注册被宿主拒绝）是环境问题，不是代码 bug，
 * 必须由调用方决定「降级成轮询」还是「直接报错」。返回 no-op 会让调用方以为事件会来。
 */
export async function subscribeHostEvent(
  name: HostEventName,
  listener: Listener
): Promise<Result<() => void>> {
  const bridge = getBridge();
  const id = getExtensionId();
  if (!bridge || !id) {
    /* 浏览器 dev / 单测：订阅不成立，调用方必须知情（否则只剩轮询，且无任何标记） */
    log.warn('非 CEP 环境，无法订阅 PS 事件', { name });
    return failWithDetail('PS_UNREADY', MSG.codeReason.PS_UNREADY, 'subscribe:no-cep');
  }

  let set = listeners.get(name);
  if (!set) {
    set = new Set();
    listeners.set(name, set);
  }
  set.add(listener);

  const spec = SPECS[name];
  for (const eventId of spec.ids) {
    /* 按 ID 去重：同一 ID 被多个语义共用时只注册一次（重复注册会让先注册的静默收不到） */
    if (registeredIds.has(eventId)) continue;
    if (!registerPhotoshopEvent(eventId)) {
      /* 注册失败必须回滚 listener，否则残留死函数 */
      set.delete(listener);
      if (set.size === 0) listeners.delete(name);
      log.error('PS 事件注册失败', { name, typeId: eventId });
      return failWithDetail('PS_UNREADY', MSG.codeReason.PS_UNREADY, `register:${name} typeId:${eventId}`);
    }
    registeredIds.add(eventId);
  }

  if (!callbackInstalled) ensureCallback();

  log.info('PS 事件注册完成', { name, ids: spec.ids });

  return ok(() => {
    listeners.get(name)?.delete(listener);
  });
}

/** 等待结束的三种结局；`hit` 之外的两种由调用方翻译成业务失败码 */
export type HostEventWait =
  | { kind: 'hit'; name: HostEventName; payload: PhotoshopEventPayload }
  | { kind: 'cancelled'; by: HostEventName }
  | { kind: 'timeout' };

export interface WaitOptions {
  /** 超时毫秒，必填——「一直等下去」不是可接受的默认值 */
  timeoutMs: number;
  /** 这些语义一出现就提前结束，结局记 `cancelled`（典型：选区变化 = 用户切走了） */
  cancelOn?: readonly HostEventName[];
}

/** 已订阅好、正在等的把手 */
export interface HostEventWaiter {
  /** 结局；订阅失败在外层 `Result` 已表达，这里只会 resolve */
  result: Promise<HostEventWait>;
  /** 主动结束（按「取消」算），可以重复调用 */
  close: () => void;
}

/**
 * 等待**一次**宿主事件：订阅 → 由调用方做业务动作 → `await result`。
 *
 * 为什么不是「一个 await 到底」：订阅完成与业务动作之间必须留一个缝
 * （吸色要先订阅、再切工具，否则用户立刻吸色会漏事件）。所以返回把手而不是直接返回结局。
 *
 * 生命周期（订阅几个语义、谁先到、超时怎么算、什么时候退订）都封在这里，
 * 调用方只递判据。上一版这段逻辑住在 `commands/style.ts` 里，命令层要自己管
 * 订阅数组 + 超时 + 退订顺序 —— 那是通道层知识。
 */
export async function startHostEventWait(
  name: HostEventName,
  match: (payload: PhotoshopEventPayload) => boolean,
  options: WaitOptions
): Promise<Result<HostEventWaiter>> {
  const offs: (() => void)[] = [];

  /* Promise executor 同步执行，`fire` 在任何 await 之前已赋值 */
  let fire: (value: HostEventWait) => void = () => {};
  const settled = new Promise<HostEventWait>((resolve) => {
    fire = resolve;
  });

  let done = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const release = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    for (const off of offs.splice(0)) off();
  };

  const end = (value: HostEventWait) => {
    if (done) return;
    done = true;
    release();
    fire(value);
  };

  const listen = async (target: HostEventName, listener: Listener): Promise<Result<void>> => {
    const sub = await subscribeHostEvent(target, listener);
    if (sub.status === 'error') return sub;
    offs.push(sub.value);
    return ok(undefined);
  };

  const main = await listen(name, (payload) => {
    if (match(payload)) end({ kind: 'hit', name, payload });
  });
  if (main.status === 'error') {
    release();
    return main;
  }

  for (const cancelName of options.cancelOn ?? []) {
    const sub = await listen(cancelName, () => end({ kind: 'cancelled', by: cancelName }));
    if (sub.status === 'error') {
      release();
      return sub;
    }
  }

  timer = setTimeout(() => end({ kind: 'timeout' }), options.timeoutMs);

  return ok({
    result: settled,
    close: () => end({ kind: 'cancelled', by: name })
  });
}
