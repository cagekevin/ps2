/**
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
 */
import { getExtensionId } from './bridge';
import { log } from '../logger';
import { parseJson } from '../../types/json';

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
  | 'documentChanged';

export interface PhotoshopEventPayload {
  eventID?: number;
  eventData?: {
    null?: { _ref?: string; _property?: string };
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
   */
  layerChanged: {
    ids: [ID_SLCT, ID_1416785510, ID_1298866208],
    matches: (payload, eventId) => {
      if (eventId === ID_1416785510) return true;
      if (eventId === ID_1298866208) return isTextLayerRef(payload);
      const ids = layerIdsOf(payload);
      return ids !== null && ids.length === 1;
    },
    origin: 'app.v4.js:69427 / :69460 / :69448'
  },

  /**
   * 切了文档 = 官方 `tbSwitchDocument` 的触发条件：
   * 载荷里有 `documentID`（官方在 4 个 ID 上都判这一条）。
   */
  documentChanged: {
    ids: [ID_SLCT, ID_1298866208, ID_1131180832, ID_1332768288, ID_437],
    matches: (payload) => hasDocumentId(payload),
    origin: 'app.v4.js:69427 / :69448 / :69424 / :69443 / :69455'
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

/** 原版 `e.data.substring(5)` 后 JSON；解不开返回 null（调用方记日志丢弃） */
function decodeEventPayload(raw: unknown): PhotoshopEventPayload | null {
  if (typeof raw !== 'string') return null;
  const parsed = parseJson(raw.substring(PREFIX_LENGTH), 'PS 事件载荷');
  if (parsed.status !== 'ok' || !parsed.value || typeof parsed.value !== 'object') return null;
  return parsed.value as PhotoshopEventPayload;
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
    const data = (event as { data?: unknown } | undefined)?.data;
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

/** `setd` 的官方判据（`app.v4.js:69412-69423` 第一支）：只有前景色被改才算吸色完成 */
export function isForegroundSetd(payload: PhotoshopEventPayload): boolean {
  return payload.eventData?.null?._property === 'foregroundColor';
}

/**
 * `slct` 事件里的**图层 id 数组**（官方判据，见 `app.v4.js:69408` 一带的 `switch (s)`）。
 *
 * 官方用载荷里的三个字段区分三种「用户动作」：
 * - `documentID` 存在 → 切了文档
 * - `layerID` 存在 → 选区里的图层变了（**数组**；多选时长度 > 1，官方只触发 `ztSwitchLayer`）
 * - `null._ref` 存在 → 只是切了工具（官方用它取消吸色）
 *
 * **PS 的图层 id 是全局唯一的**（跨文档不撞）——这是它作为身份的优点。
 * 但**我们没有用它判图层身份**：官方也没用（`selectLayer` 无参，id 只进了 `E.layer.id`），
 * 我们的身份仍是「类型 + 图层名」，改名时会多读一次文字属性（**官方也一样重读**）。
 * 这个函数目前只暴露给需要原始 id 的调用方，不参与身份判定。
 */
export function selectionLayerIds(payload: PhotoshopEventPayload): string[] | null {
  return layerIdsOf(payload);
}

/** `slct` 事件带 `documentID` = 用户切了文档（官方同一个判据） */
export function selectionSwitchedDocument(payload: PhotoshopEventPayload): boolean {
  return hasDocumentId(payload);
}

/** 官方在 `slct` 的 `null._ref` 分支里用它取消吸色（用户切到了别的工具） */
export function selectionToolChanged(payload: PhotoshopEventPayload): boolean {
  return typeof payload.eventData?.null?._ref !== 'undefined';
}

/** 订阅宿主事件，返回取消函数。非 CEP 环境返回 no-op */
export async function subscribeHostEvent(
  name: HostEventName,
  listener: Listener
): Promise<() => void> {
  const bridge = getBridge();
  const id = getExtensionId();
  if (!bridge || !id) {
    log.warn('非 CEP 环境，跳过事件订阅', { name });
    return () => {};
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
      throw new Error(`PS 事件注册失败：${name}`);
    }
    registeredIds.add(eventId);
  }

  if (spec.ids.length && !callbackInstalled) ensureCallback();

  log.info('PS 事件注册完成', { name, ids: spec.ids });

  return () => {
    listeners.get(name)?.delete(listener);
  };
}
