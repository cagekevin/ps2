/**
 * 【范本】PS 能力初始化
 *
 * 能力分两档，互不拖累：
 *   core    我们自己的 jsx/main.jsx（mm_*），图层/形状/文档，必需
 *   vendor  官方 jsx 副本（ys_*），应用类能力，可缺失
 *
 * 顺序很重要：
 *   1. 加载 main.jsx
 *   2. 加载 vendor.jsx
 *   3. **注入环境变量**（Sys_setSystemEnvInfo）—— 不注入，官方函数内部拼路径会抛异常
 *   4. 探函数是否存在
 */

import { evalScript, loadJsx } from '../cep/bridge';
import { log } from '../logger';
import { injectEnv } from './env';
import { failWithDetail, ok, type Result } from '../../types/result';

export interface PsCapability {
  /** 自有能力是否可用（= 必需函数都在） */
  core: boolean;
  /** 官方应用能力是否可用（= 必需函数都在且环境变量注入成功） */
  vendor: boolean;
  /**
   * 门可用、但**单个函数**缺失的名字。
   *
   * 以前是「缺一个 → 整门不可用」：`mm_diag_vendor` 缺失会让字体面板、样式页、常用页
   * 全部报 `PS_UNREADY`——只因为诊断页少个函数。现在缺哪个只禁用用它那个能力，
   * 由 `capability.ts` 在门之后按 `spec.fn` 查这张表。
   */
  missing: string[];
  /**
   * 探测脚本**本身**失败时的原始失败（`TIMEOUT` / `PS_ERROR` 等），不是「函数缺失」。
   *
   * 非 null ⇒ `core` / `vendor` 必为 false。诊断页据此区分「jsx 没加载 / 函数没有」
   * 与「探测没跑成」——两者排障方向相反。
   */
  probeFailure: Result<never> | null;
}

const CORE_FILE = 'jsx/main.jsx';
const VENDOR_FILE = 'jsx/vendor.jsx';

/**
 * 官方 jsx 里我们会用到的入口，缺一个就算 vendor 不可用。
 *
 * **两条通道，别混**（实现只有一份，在 `./capability.ts` + `./capabilities.ts` 的 `channel` 字段）：
 *   调度 `ps_onJsx({ f, arr, n })` —— 渐变、图层样式，以及常用页里走调度的按钮（原版 jsxHistory*）
 *   直调 `fn(a, b)`               —— 字体（`ys_*`，参数 encodeText）、系统字体 / 文本属性 / 常用页另一半
 *
 * 判断依据不是「是不是 ys_ / zt_ / cy_ 开头」，而是原版前端用 jsxHistory 还是 jsx：
 * 同为 `cy_*`，`cy_zoom` 直调而 `cy_transformPosition` 走调度。
 *
 * 文本属性 25 个见 `docs/PS-CHANNEL-NOTES.md` §11.3、常用页 26 个见 §11.4，返回结构全部 UNVERIFIED。
 * `zt_changeTextBranchMerge` 已确认为派发表 key、不是函数（真机一调就抛「没有这种元素」），
 * 已从本清单与能力表移除——**别再登记**，否则一调就整页报错。
 */
/**
 * 自有 jsx（`jsx/main.jsx`）里**能力层实际在用**的函数清单。
 *
 * 与 `VENDOR_FUNCS` 对称，`core/ps/init.test.ts` 会校验「表里每个 `gate: 'core'` 的能力都在
 * 这里」。以前这段是 `load()` 里的内联数组，只有 3 项，漏了 `mm_style_applyShapeFill` /
 * `mm_style_applyBorderColor` / `mm_style_getForegroundColor`——函数缺失时 `core` 仍判为
 * 可用，用户点下去才拿到 `EvalScript error`。
 *
 * **这张表是「全部要探的」，不是「全部必需」**：只有 `CORE_REQUIRED` 里的缺了才整门不可用，
 * 其余缺了只禁用对应能力（见 `PsCapability.missing`）。
 */
export const CORE_FUNCS = [
  /* 图层：类型 / 名称 / 选中数量 */
  'mm_layer_getState',
  'mm_layer_getSelection',
  /* 样式：应用颜色 / 形状填充 / 线框色 / 取前景色 */
  'mm_style_applyColor',
  'mm_style_applyShapeFill',
  'mm_style_applyBorderColor',
  'mm_style_getForegroundColor',
  /* 诊断：官方能力探测 */
  'mm_diag_vendor'
] as const;

/**
 * `CORE_FUNCS` 里**缺了整门就没意义**的那些。
 *
 * 只有 `mm_layer_getState`：它同时是图层轮询和所有图层前置的判据，缺了的话「当前是什么图层」
 * 都答不出来，别的能力留着也用不了。
 *
 * 其余都**不是必需**：`mm_style_*` 缺了只影响样式页，`mm_diag_vendor` 缺了只影响诊断页，
 * `mm_layer_getSelection` 缺了只影响 4 个多选能力——都不该让字体面板一起变红。
 */
export const CORE_REQUIRED: readonly string[] = ['mm_layer_getState'];

export const VENDOR_FUNCS = [
  'ps_onJsx',
  'ys_useGradient',
  'ps_ysBtnUseStyle',
  'ys_checkUseFont',
  'ys_useFont',
  'ys_getFontInfo',
  /* 读当前图层渐变；一直漏登记，2026-10-28 由「表 → 清单」守卫抓出（与 `Tool_set` 同一类） */
  'ys_getGradientInfo',
  'ztgl_initSystemList',
  'ztgl_setFont',
  'Sys_setSystemEnvInfo',
  /* 工具切换（样式页快速吸色 `Tool_set('eyedropperTool')`）；一直漏登记，2026-10-28 由
     `init.test.ts` 的「表 → 清单」守卫抓出 */
  'Tool_set',
  /* 文本属性：读 3（`zt_getTypeUnits` 已取消：面板不再显示单位后缀） */
  'zt_getFontSimpleInfo',
  'zt_getCurrentFontInfo',
  'zt_getCurrentText',
  /* 文本属性：写 22 */
  'zt_setFontName',
  'layer_font_setFontSize',
  'zt_setFontSize',
  'layer_font_setLeading',
  'zt_setFontWordSpacing',
  'zt_setFontColor',
  'zt_setFontAllCaps',
  'zt_setFontVision',
  'zt_setFauxItali',
  'zt_setFontAddBold',
  'zt_setFontJustified',
  'zt_setTextAlignment',
  'zt_setHorizontalCenters',
  'zt_verticalCenter',
  'zt_setUpDownAlign',
  'zt_setBackrgoudAlign',
  'zt_alignHorizontal',
  'cy_distributedByPitch',
  'zt_textBranchMerge',
  'zt_createButton',
  'zt_switchFontDirection',
  'zt_setTranslateText',
  /* 常用页 26（`docs/PS-CHANNEL-NOTES.md` §11.4）：v1 覆盖 11（12 条命令）+ 2 只登记，其余 13 条排 v2；
     按真实函数名登记，三处原版拼写照抄（Bacth / 大写 L / 大写 E）。
     `cy_distributedByPitch` 已在上面文本属性块里登记过（两个面板两种参数、同一个函数），这里不重复 */
  'cy_zoom',
  'cy_transformPosition',
  'cy_locationTrade',
  'cy_LayerReplace',
  'cy_exchangeLayerColor',
  'cy_correctRectangleBlur',
  'cy_swapWireframeFill',
  'cy_createSafeAreaGuide',
  'cy_guideFunction',
  'cy_openDirectory',
  'cy_getImagePath',
  'cy_getPsdForFolder',
  'cy_insertionImage',
  'Layer_placedLayerRelinkToFile',
  'cy_embedMultipleImage',
  'cy_smartToLinkSmartObject',
  'cy_linkSmartObjectToSmartObject',
  'cy_importMultipleImage',
  'cy_optimizeDoc',
  'cy_batchOptimizeDoc',
  'cy_customBuildTransform',
  'cy_ExportImage',
  'cy_BatchExportLayer',
  'cy_BatchExportSecondLayer',
  'cy_BacthExportPsdToImage'
] as const;

/**
 * `VENDOR_FUNCS` 里**缺了整门就没意义**的那些。
 *
 * - `ps_onJsx`：调度通道的宿主，缺了所有调度能力（翻转/对换/渐变/样式）全废；
 * - `Sys_setSystemEnvInfo`：不注入环境变量，`ys_*` 内部拼路径会抛异常。
 *
 * 其余 60 项都不是必需：缺哪个只禁用用它那个能力。这也是 `08` §1.5 想解决的问题——
 * 那两个「没人调用」的函数留在清单里就行，不用为了少两个失败点去删表行和包装函数。
 */
export const VENDOR_REQUIRED: readonly string[] = ['ps_onJsx', 'Sys_setSystemEnvInfo'];

let pending: Promise<PsCapability> | null = null;

/**
 * 探「清单里哪些函数不存在」。
 *
 * **探测脚本失败 ≠ 函数不存在**：失败时不许把清单里全部函数当成缺失 ——
 * 一次 evalScript 超时就会让 62 个 vendor 函数全判缺失，`funcMissing` 随后报
 * 「「某函数」未加载」，真正的原因（探测本身失败）没有痕迹。失败原样上抛，由 `load()` 关门。
 */
async function probe(fns: readonly string[]): Promise<Result<string[]>> {
  const expr = fns.map((name) => `typeof ${name}`).join(',');
  const raw = await evalScript(`(function(){return [${expr}].join(',');})()`);
  if (raw.status === 'error') {
    /* 不在这里记日志：`load()` 知道是哪扇门、会记一条带上下文的（同一失败只记一次） */
    return failWithDetail(raw.code, raw.reason, raw.detail);
  }

  const types = raw.value.split(',');
  return ok(fns.filter((_, index) => types[index] !== 'function'));
}

async function load(): Promise<PsCapability> {
  const capability: PsCapability = { core: false, vendor: false, missing: [], probeFailure: null };

  const coreResult = await loadJsx(CORE_FILE);
  if (coreResult.status === 'error') {
    log.error('自有 jsx 加载失败', { file: CORE_FILE, reason: coreResult.reason });
    return capability;
  }

  /* 分两级：必需缺了整门不可用；可选缺了只记名字，由 capability 逐个禁用 */
  const coreProbe = await probe(CORE_FUNCS);
  if (coreProbe.status === 'error') {
    log.error('自有 jsx 能力探测失败，core 门关闭', {
      code: coreProbe.code,
      reason: coreProbe.reason,
      detail: coreProbe.detail
    });
    capability.probeFailure = failWithDetail(coreProbe.code, coreProbe.reason, coreProbe.detail);
    return capability;
  }
  const coreRequiredMissing = coreProbe.value.filter((fn) => CORE_REQUIRED.includes(fn));
  if (coreRequiredMissing.length) {
    log.error('自有 jsx 必需函数缺失', { missing: coreRequiredMissing });
    return capability;
  }
  capability.core = true;
  capability.missing.push(...coreProbe.value);

  const vendorResult = await loadJsx(VENDOR_FILE);
  if (vendorResult.status === 'error') {
    log.error('官方 jsx 加载失败，应用能力不可用', { file: VENDOR_FILE, reason: vendorResult.reason });
    return capability;
  }

  const vendorProbe = await probe(VENDOR_FUNCS);
  if (vendorProbe.status === 'error') {
    log.error('官方 jsx 能力探测失败，vendor 门关闭', {
      code: vendorProbe.code,
      reason: vendorProbe.reason,
      detail: vendorProbe.detail
    });
    capability.probeFailure = failWithDetail(vendorProbe.code, vendorProbe.reason, vendorProbe.detail);
    return capability;
  }
  const vendorRequiredMissing = vendorProbe.value.filter((fn) => VENDOR_REQUIRED.includes(fn));
  if (vendorRequiredMissing.length) {
    log.error('官方 jsx 必需函数缺失，应用能力不可用', { missing: vendorRequiredMissing });
    return capability;
  }

  /* 关键一步：不注入环境变量，ys_* 内部拼路径会抛异常 */
  const envResult = await injectEnv();
  if (envResult.status === 'error') {
    log.error('环境变量注入失败，应用能力不可用');
    return capability;
  }

  capability.vendor = true;
  capability.missing.push(...vendorProbe.value);

  if (capability.missing.length) {
    /* 不是错误：这些能力单独不可用，其余照常。诊断页能看到清单 */
    log.warn('部分 jsx 函数缺失，对应能力单独不可用', { missing: capability.missing });
  }
  log.info('PS 能力就绪', {
    core: capability.core,
    vendor: capability.vendor,
    missing: capability.missing.length
  });
  return capability;
}

export function ensurePsReady(): Promise<PsCapability> {
  if (!pending) pending = load();
  return pending;
}

/** 需要自有能力（图层/形状/文档）的调用方用这个 */
export async function requireCore(): Promise<boolean> {
  const capability = await ensurePsReady();
  return capability.core;
}

/** 需要官方应用能力（颜色/渐变/样式）的调用方用这个 */
export async function requireVendor(): Promise<boolean> {
  const capability = await ensurePsReady();
  return capability.vendor;
}

/**
 * 某个 jsx 函数是否缺失（门可用、但这一个没有）。
 *
 * 门只管「整门能不能用」，不管「这一个能力能不能用」。旧 jsx 缺一个新函数时，
 * 以前是整门变红；现在只有用到它的那个能力报 `PS_UNREADY` + `detail: fn:<名字>`。
 */
export async function funcMissing(fn: string): Promise<boolean> {
  const capability = await ensurePsReady();
  return capability.missing.includes(fn);
}
