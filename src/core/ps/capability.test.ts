import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MSG } from '../../types/messages';
import { failWithDetail, ok } from '../../types/result';
import { callJsx, LONG_TIMEOUT, READ_TIMEOUT, WRITE_TIMEOUT } from '../cep/bridge';
import { CAP } from './capabilities';
import { callCapability, type CapabilitySpec } from './capability';
import { requireShapeLayer, requireTextLayer } from './layer';
import { lenientVoid, parseSystemFontList } from './raw';
import { funcMissing, requireVendor } from './init';
import type * as BridgeModule from '../cep/bridge';

/* 通道与门都 mock 掉：执行器只关心「有没有调、调了什么、结果怎么翻译」 */
vi.mock('../cep/bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof BridgeModule>();
  return { ...actual, callJsx: vi.fn() };
});

vi.mock('./init', () => ({
  requireVendor: vi.fn(async () => true),
  requireCore: vi.fn(async () => true),
  funcMissing: vi.fn(async () => false)
}));

const SPEC = {
  fn: 'zt_demo',
  gate: 'vendor' as const,
  channel: 'direct' as const,
  timeout: 1000,
  parse: lenientVoid('兜底文案')
};

beforeEach(() => {
  vi.mocked(callJsx).mockReset();
  vi.mocked(requireVendor).mockResolvedValue(true);
  vi.mocked(funcMissing).mockResolvedValue(false);
});

describe('callCapability', () => {
  it('门失败：PS_UNREADY + detail 带门名，不调用 jsx', async () => {
    vi.mocked(requireVendor).mockResolvedValue(false);

    const result = await callCapability(SPEC, [1]);

    /* 文案来自唯一表；门名只在 `detail`（`vendor:false` / `core:false`） */
    expect(result).toEqual(failWithDetail('PS_UNREADY', MSG.codeReason.PS_UNREADY, 'vendor:false'));
    expect(callJsx).not.toHaveBeenCalled();
  });

  it('单个函数缺失：只禁这一个能力，detail 带函数名，不调用 jsx', async () => {
    /* 门是好的，只是这个 jsx 函数没加载（旧 jsx）——不许静默跳过，也不许牵连整门 */
    vi.mocked(funcMissing).mockResolvedValueOnce(true);

    const result = await callCapability(SPEC, [1]);

    /* 函数名进 `detail`（`fn:zt_demo`），不再拼进文案 */
    expect(result).toEqual(failWithDetail('PS_UNREADY', MSG.codeReason.PS_UNREADY, 'fn:zt_demo'));
    expect(callJsx).not.toHaveBeenCalled();
  });

  it('前置失败原样透传，不调用 jsx', async () => {
    const guard = failWithDetail(
      'PS_WRONG_LAYER',
      '当前图层是「普通图层」，需要「文字图层」',
      'kind:normal'
    );
    const spec = { ...SPEC, require: async () => guard };

    const result = await callCapability(spec);

    expect(result).toEqual(guard);
    expect(callJsx).not.toHaveBeenCalled();
  });

  it('直调：超时与 silent 交给 callJsx，解析结果原样返回', async () => {
    vi.mocked(callJsx).mockResolvedValue(ok('{"err":0}'));
    const spec = { ...SPEC, silent: true };

    const result = await callCapability(spec, ['hjm', 1]);

    expect(callJsx).toHaveBeenCalledWith(
      'zt_demo',
      ['hjm', 1],
      expect.objectContaining({ timeout: 1000, silent: true })
    );
    expect(result).toEqual(ok(undefined));
  });

  it('没传 silent 时不静默（照常记 info 日志）', async () => {
    vi.mocked(callJsx).mockResolvedValue(ok('{"err":0}'));

    await callCapability(SPEC);

    expect(vi.mocked(callJsx).mock.calls[0]?.[2]?.silent).toBeUndefined();
  });

  it('调度：包成 ps_onJsx({ f, arr, n })', async () => {
    vi.mocked(callJsx).mockResolvedValue(ok('1'));
    const spec = { ...SPEC, channel: 'dispatch' as const, label: '填充渐变' };

    await callCapability(spec, [1, 2]);

    expect(callJsx).toHaveBeenCalledWith(
      'ps_onJsx',
      [{ f: 'zt_demo', arr: [1, 2], n: '填充渐变' }],
      expect.objectContaining({ timeout: 1000 })
    );
  });

  it('调度：没给 label 时 payload 不带 n', async () => {
    vi.mocked(callJsx).mockResolvedValue(ok('1'));
    const spec = { ...SPEC, channel: 'dispatch' as const };

    await callCapability(spec);

    expect(callJsx).toHaveBeenCalledWith(
      'ps_onJsx',
      [{ f: 'zt_demo', arr: [] }],
      expect.objectContaining({ timeout: 1000 })
    );
  });

  it('宿主层失败直接上抛，不再解析 raw', async () => {
    const host = failWithDetail('TIMEOUT', 'evalScript 超时，队列放行（PS 侧可能仍在执行）', 'raw:x');
    vi.mocked(callJsx).mockResolvedValue(host);

    expect(await callCapability(SPEC)).toEqual(host);
  });
});

describe('CapabilitySpec 类型闭合', () => {
  /* 编译期断言：tsc 若不再报错，`@ts-expect-error` 会变成 unused directive 让 typecheck 红 */
  it('core 门不允许走调度通道', () => {
    // @ts-expect-error mm_* 自有 jsx 只有直调，ps_onJsx 属于官方副本
    const spec: CapabilitySpec<unknown> = {
      fn: 'mm_demo',
      gate: 'core',
      channel: 'dispatch',
      timeout: 1000,
      parse: lenientVoid('兜底')
    };

    expect(spec.gate).toBe('core');
  });
});

describe('CAP', () => {
  it('setFont：直调 + 写超时 + 文字图层前置', () => {
    expect(CAP.setFont.fn).toBe('ztgl_setFont');
    expect(CAP.setFont.gate).toBe('vendor');
    expect(CAP.setFont.channel).toBe('direct');
    expect(CAP.setFont.timeout).toBe(WRITE_TIMEOUT);
    expect(CAP.setFont.require).toBe(requireTextLayer);
  });

  it('textInfo：读超时 + 文字图层前置', () => {
    expect(CAP.textInfo.fn).toBe('zt_getFontSimpleInfo');
    expect(CAP.textInfo.timeout).toBe(READ_TIMEOUT);
    expect(CAP.textInfo.require).toBe(requireTextLayer);
  });

  it('applyFont：写超时 + 文字图层前置，与 setFont 同一套严格判据', () => {
    expect(CAP.applyFont.timeout).toBe(WRITE_TIMEOUT);
    expect(CAP.applyFont.require).toBe(requireTextLayer);
  });

  it('systemFontList：300s（扫全机字体，不能按「读」的 30s），哨兵与数组在解析器里判', () => {
    expect(CAP.systemFontList.timeout).toBe(LONG_TIMEOUT);
    /* 消费者不再自己判 `ok` 哨兵 / `Array.isArray`：两态判定收在 `raw.parseSystemFontList` */
    expect(CAP.systemFontList.parse).toBe(parseSystemFontList);
  });

  it('文字属性类能力全部带文字图层前置（执行器第一步，不通过就终止）', () => {
    /* 真机依据：非文字图层上这批写函数不报错、返回 `undefined`、什么都不做 */
    const textRows = Object.values(CAP).filter(
      (spec) =>
        spec.channel === 'direct' &&
        (spec.fn.startsWith('zt_') ||
          spec.fn.startsWith('layer_font_') ||
          spec.fn === 'ztgl_setFont' ||
          spec.fn === 'ys_useFont')
    );

    expect(textRows.length).toBeGreaterThan(20);
    for (const spec of textRows) {
      expect('require' in spec ? spec.require : undefined).toBe(requireTextLayer);
    }
  });

  it('调度通道默认 30s；长任务例外必须点名（白名单只有 callAction）', () => {
    /**
     * 例外**只许一个**：`callAction` 执行的是 PS 动作，可能跑几分钟（Vue 版同样给长超时）。
     * 30s 会先报超时、而 PS 还在执行——那比多等更糟。新增例外必须同时改这张表和这条断言。
     */
    const LONG_RUN_DISPATCH = new Set(['callAction']);

    const dispatches = Object.entries(CAP).filter(([, spec]) => spec.channel === 'dispatch');

    expect(dispatches.length).toBeGreaterThan(0);
    for (const [name, spec] of dispatches) {
      expect(spec.timeout, name).toBe(LONG_RUN_DISPATCH.has(name) ? LONG_TIMEOUT : READ_TIMEOUT);
    }
  });

  it('多选类能力共用同一个前置（位置对换 / 颜色互换 / 元素替换 / 两个分布形态）', () => {
    const shared = CAP.locationTrade.require;

    expect(CAP.exchangeLayerColor.require).toBe(shared);
    /* 元素替换按「成对」处理，标 UNVERIFIED：真机若是「1 图层 + 外部元素」就去掉这一行 */
    expect(CAP.layerReplace.require).toBe(shared);
    expect(CAP.distribute.require).toBe(shared);
    expect(CAP.distributeByPitch.require).toBe(shared);

    /* 不是文字图层前置：对换与分布的对象是多个图层，不限于文字 */
    expect(shared).not.toBe(requireTextLayer);
  });

  it('单图层就能用的常用页能力不许加多选前置', () => {
    /* 翻转 / 缩放 / 修正模糊 / 填充线框互换都是选中一个图层就能做 */
    for (const spec of [CAP.flip, CAP.zoom, CAP.correctBlur, CAP.swapWireframeFill]) {
      expect('require' in spec).toBe(false);
    }
  });

  it('形状专属能力带形状前置（jsx 的 `not-shape` 提前到第一步）', () => {
    expect(CAP.applyShapeFill.require).toBe(requireShapeLayer);
    expect(CAP.applyBorderColor.require).toBe(requireShapeLayer);
  });

  it('任意图层有效的能力不许加前置（真机：渐变与图层样式对文字图层也有效）', () => {
    for (const spec of [CAP.useStyleColor, CAP.foregroundColor, CAP.setTool, CAP.applyGradient, CAP.applyStyle]) {
      expect('require' in spec).toBe(false);
    }
  });

  it('文本属性写全部 60s（写操作不能按「读」的 30s）', () => {
    const writes = [
      CAP.setFontName,
      CAP.setLeading,
      CAP.distributeByPitch,
      CAP.setTextAlignment,
      CAP.setTranslateText,
      CAP.createButton
    ];

    for (const spec of writes) expect(spec.timeout).toBe(WRITE_TIMEOUT);
  });
});
