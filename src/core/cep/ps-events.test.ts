/**
 * PS 宿主事件订阅的测试
 *
 * 为什么必须有：这是**底层基础设施**（原版 `$psEvent.add` 的移植），判据全是从官方
 * `app.v4.js:69396-69475` 的 `switch (s)` 逐条抄来的——抄错一个条件，用户就会遇到
 * 「换了图层面板不更新」或「切了文档没反应」，而且**没有报错可查**。
 *
 * 测什么：
 * 1. **载荷判据**（官方 `switch` 的每个 case + if 条件）——最容易抄错的部分；
 * 2. **一个 ID 多语义**（官方 `1298866208` 既是「换文档」又是「文字图层变了」）
 *    → 注册必须按 ID 去重，否则先注册的会静默收不到；
 * 3. 载荷解不开 → 记日志并丢弃，**不投递给监听方**（不静默当成功）。
 *
 * 环境：本仓 vitest 是 `environment: 'node'` 且**没装 jsdom**（`domain/image-color.ts`
 * 里的「jsdom 测不了」指的就是这个），所以这里用**最小 `window` 桩**——
 * 本模块只碰 `window.__adobe_cep__`，不需要真 DOM。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const CALLBACK_PREFIX = 'com.adobe.PhotoshopJSONCallback';

const ID_SETD = '1936028772';
const ID_SLCT = '1936483188';
const ID_1416785510 = '1416785510';
const ID_1298866208 = '1298866208';
const ID_1131180832 = '1131180832';
const ID_437 = '437';

/** 假 CEP 桥：记录注册过的 ID，并留一个能触发回调的把手 */
function makeBridge() {
  const registered: string[] = [];
  const handlers = new Map<string, (event: unknown) => void>();
  return {
    registered,
    api: {
      getExtensionID: () => 'ext-1',
      dispatchEvent: (event: { type: string; data: string }) => {
        registered.push(event.data);
      },
      addEventListener: (type: string, listener: (event: unknown) => void) => {
        handlers.set(type, listener);
      }
    },
    /** 造一条官方格式的回调：`5 字符前缀 + JSON` */
    fire(payload: unknown): void {
      const raw = `xxxxx${JSON.stringify(payload)}`;
      handlers.get(`${CALLBACK_PREFIX}ext-1`)?.({ data: raw });
    },
    fireRaw(raw: unknown): void {
      handlers.get(`${CALLBACK_PREFIX}ext-1`)?.({ data: raw });
    }
  };
}

/** 最小 `window` 桩：node 环境没有 `window`，本模块读 `window.__adobe_cep__` */
function setWindow(cep: unknown): void {
  (globalThis as unknown as { window?: unknown }).window = { __adobe_cep__: cep };
}

/** 每个用例一份全新模块：事件模块有模块级状态（监听表 / 已注册 ID） */
async function load() {
  vi.resetModules();
  const bridge = makeBridge();
  setWindow(bridge.api);
  const mod = await import('./ps-events');
  return { mod, bridge };
}

beforeEach(() => {
  /* 非 CEP 环境：桥存在但没有 `__adobe_cep__` */
  setWindow(undefined);
});

describe('载荷判据（官方 switch 的每个 case）', () => {
  it('layerChanged：slct 带一个 layerID → 命中（官方 length==1 才 ztSelectLayer）', async () => {
    const { mod, bridge } = await load();
    const hits: unknown[] = [];

    await mod.subscribeHostEvent('layerChanged', (payload) => hits.push(payload));
    bridge.fire({ eventID: ID_SLCT, eventData: { layerID: [7] } });

    expect(hits).toHaveLength(1);
  });

  it('layerChanged：slct 带两个 layerID → 不命中（官方多选只触发 ztSwitchLayer）', async () => {
    const { mod, bridge } = await load();
    const hits: unknown[] = [];

    await mod.subscribeHostEvent('layerChanged', (payload) => hits.push(payload));
    bridge.fire({ eventID: ID_SLCT, eventData: { layerID: [7, 8] } });

    expect(hits).toHaveLength(0);
  });

  it('layerChanged：1416785510 → 无条件命中（官方 case 1416785510 直接 handleKey）', async () => {
    const { mod, bridge } = await load();
    const hits: unknown[] = [];

    await mod.subscribeHostEvent('layerChanged', (payload) => hits.push(payload));
    bridge.fire({ eventID: ID_1416785510, eventData: {} });

    expect(hits).toHaveLength(1);
  });

  it('layerChanged：1298866208 只在 null._ref === "textLayer" 时命中', async () => {
    const { mod, bridge } = await load();
    const hits: unknown[] = [];

    await mod.subscribeHostEvent('layerChanged', (payload) => hits.push(payload));
    bridge.fire({ eventID: ID_1298866208, eventData: { null: { _ref: 'textLayer' } } });
    bridge.fire({ eventID: ID_1298866208, eventData: { null: { _ref: 'shapeLayer' } } });

    expect(hits).toHaveLength(1);
  });

  it('documentChanged：带 documentID → 命中（官方在 4 个 ID 上都判这一条）', async () => {
    const { mod, bridge } = await load();
    const hits: unknown[] = [];

    await mod.subscribeHostEvent('documentChanged', (payload) => hits.push(payload));
    for (const id of [ID_SLCT, ID_1298866208, ID_1131180832, ID_437]) {
      bridge.fire({ eventID: id, eventData: { documentID: 3 } });
    }

    expect(hits).toHaveLength(4);
  });

  it('documentChanged：没有 documentID → 不命中', async () => {
    const { mod, bridge } = await load();
    const hits: unknown[] = [];

    await mod.subscribeHostEvent('documentChanged', (payload) => hits.push(payload));
    bridge.fire({ eventID: ID_SLCT, eventData: { layerID: [7] } });

    expect(hits).toHaveLength(0);
  });
});

describe('一个 ID 多个语义', () => {
  it('同一 ID 被两个语义订阅 → 只注册一次（重复注册会让先注册的静默收不到）', async () => {
    const { mod, bridge } = await load();

    await mod.subscribeHostEvent('selection', () => {});
    await mod.subscribeHostEvent('layerChanged', () => {});

    const slctRegistrations = bridge.registered.filter((id) => id === ID_SLCT);
    expect(slctRegistrations).toHaveLength(1);
  });

  it('同一 ID 命中多个语义 → 各自投给各自的监听方', async () => {
    const { mod, bridge } = await load();
    const selectionHits: unknown[] = [];
    const layerHits: unknown[] = [];

    await mod.subscribeHostEvent('selection', (payload) => selectionHits.push(payload));
    await mod.subscribeHostEvent('layerChanged', (payload) => layerHits.push(payload));
    bridge.fire({ eventID: ID_SLCT, eventData: { layerID: [7] } });

    expect(selectionHits).toHaveLength(1);
    expect(layerHits).toHaveLength(1);
  });
});

describe('坏载荷', () => {
  it('解不开 JSON → 丢弃本次事件，不投递给监听方（不静默当成功）', async () => {
    const { mod, bridge } = await load();
    const hits: unknown[] = [];

    await mod.subscribeHostEvent('layerChanged', (payload) => hits.push(payload));
    bridge.fireRaw('这不是 JSON');

    expect(hits).toHaveLength(0);
  });

  it('不是字符串 → 同样丢弃', async () => {
    const { mod, bridge } = await load();
    const hits: unknown[] = [];

    await mod.subscribeHostEvent('layerChanged', (payload) => hits.push(payload));
    bridge.fireRaw(42);

    expect(hits).toHaveLength(0);
  });
});

describe('判据辅助函数', () => {
  it('isForegroundSetd：只有前景色被改才算吸色完成（官方第一支）', async () => {
    const { mod } = await load();

    expect(mod.isForegroundSetd({ eventData: { null: { _property: 'foregroundColor' } } })).toBe(true);
    expect(mod.isForegroundSetd({ eventData: { null: { _property: 'backgroundColor' } } })).toBe(false);
  });

  it('selectionLayerIds：取出图层 id 数组；没有就 null', async () => {
    const { mod } = await load();

    expect(mod.selectionLayerIds({ eventData: { layerID: [7, 8] } })).toEqual(['7', '8']);
    expect(mod.selectionLayerIds({ eventData: {} })).toBeNull();
  });

  it('selectionSwitchedDocument：带 documentID 才是换文档', async () => {
    const { mod } = await load();

    expect(mod.selectionSwitchedDocument({ eventData: { documentID: 3 } })).toBe(true);
    expect(mod.selectionSwitchedDocument({ eventData: { layerID: [7] } })).toBe(false);
  });

  it('selectionToolChanged：null._ref 存在 = 用户切了工具（官方用它取消吸色）', async () => {
    const { mod } = await load();

    expect(mod.selectionToolChanged({ eventData: { null: { _ref: 'textLayer' } } })).toBe(true);
    expect(mod.selectionToolChanged({ eventData: { layerID: [7] } })).toBe(false);
  });
});

describe('非 CEP 环境', () => {
  it('没有桥 → 订阅返回 no-op，不抛错（单测 / 浏览器开发都能跑）', async () => {
    const { mod } = await load();
    setWindow(undefined);

    const off = await mod.subscribeHostEvent('layerChanged', () => {});

    expect(typeof off).toBe('function');
    expect(() => off()).not.toThrow();
  });

  it('setd 语义仍可用（官方 ID 1936028772）', async () => {
    const { mod, bridge } = await load();
    const hits: unknown[] = [];

    await mod.subscribeHostEvent('setd', (payload) => hits.push(payload));
    bridge.fire({ eventID: ID_SETD, eventData: { null: { _property: 'foregroundColor' } } });

    expect(hits).toHaveLength(1);
  });
});
