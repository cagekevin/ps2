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

export interface PsCapability {
  /** 自有能力是否可用 */
  core: boolean;
  /** 官方应用能力是否可用 */
  vendor: boolean;
}

const CORE_FILE = 'jsx/main.jsx';
const VENDOR_FILE = 'jsx/vendor.jsx';

/**
 * 官方 jsx 里我们会用到的入口，缺一个就算 vendor 不可用。
 *
 * **两条通道，别混**（实现只有一份，在 `./vendor.ts`）：
 *   调度 `ps_onJsx({ f, arr, n })` —— 渐变、图层样式，以及常用页里走调度的按钮（原版 jsxHistory*）
 *   直调 `fn(a, b)`               —— 字体（`ys_*`，参数 encodeText）、系统字体 / 文本属性 / 常用页另一半
 *
 * 判断依据不是「是不是 ys_ / zt_ / cy_ 开头」，而是原版前端用 jsxHistory 还是 jsx：
 * 同为 `cy_*`，`cy_zoom` 直调而 `cy_transformPosition` 走调度。
 *
 * 文本属性 26 个见 `docs/PS-CHANNEL-NOTES.md` §11.3、常用页 26 个见 §11.4，返回结构全部 UNVERIFIED。
 * `zt_changeTextBranchMerge` 可能是派发表 key 而不是函数（参考实现记录），
 * 真机探测若报缺失会整页不可用——处理方式写在 §11.3 第 7 条，不在这里兜。
 */
export const VENDOR_FUNCS = [
  'ps_onJsx',
  'ys_useGradient',
  'ps_ysBtnUseStyle',
  'ys_checkUseFont',
  'ys_useFont',
  'ys_getFontInfo',
  'ztgl_initSystemList',
  'ztgl_setFont',
  'Sys_setSystemEnvInfo',
  /* 文本属性：读 3（`zt_getTypeUnits` 已取消：面板不再显示单位后缀） */
  'zt_getFontSimpleInfo',
  'zt_getCurrentFontInfo',
  'zt_getCurrentText',
  /* 文本属性：写 23 */
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
  'zt_changeTextBranchMerge',
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

let pending: Promise<PsCapability> | null = null;

async function probe(fns: readonly string[]): Promise<string[]> {
  const expr = fns.map((name) => `typeof ${name}`).join(',');
  const raw = await evalScript(`(function(){return [${expr}].join(',');})()`);
  if (raw.status === 'error') return [...fns];

  const types = raw.value.split(',');
  return fns.filter((_, index) => types[index] !== 'function');
}

async function load(): Promise<PsCapability> {
  const capability: PsCapability = { core: false, vendor: false };

  const coreResult = await loadJsx(CORE_FILE);
  if (coreResult.status === 'error') {
    log.error('自有 jsx 加载失败', { file: CORE_FILE, reason: coreResult.reason });
    return capability;
  }

  const coreMissing = await probe(['mm_layer_getState', 'mm_style_applyColor']);
  if (coreMissing.length) {
    log.error('自有 jsx 函数缺失', { missing: coreMissing });
    return capability;
  }
  capability.core = true;

  const vendorResult = await loadJsx(VENDOR_FILE);
  if (vendorResult.status === 'error') {
    log.error('官方 jsx 加载失败，应用能力不可用', { file: VENDOR_FILE, reason: vendorResult.reason });
    return capability;
  }

  const vendorMissing = await probe(VENDOR_FUNCS);
  if (vendorMissing.length) {
    log.error('官方 jsx 函数缺失，应用能力不可用', { missing: vendorMissing });
    return capability;
  }

  /* 关键一步：不注入环境变量，ys_* 内部拼路径会抛异常 */
  const envResult = await injectEnv();
  if (envResult.status === 'error') {
    log.error('环境变量注入失败，应用能力不可用');
    return capability;
  }

  capability.vendor = true;
  log.info('PS 能力就绪', capability);
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
