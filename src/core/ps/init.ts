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
 * **两条通道，别混**：
 *   调度  `ps_onJsx({ f, arr, n })`        —— 渐变、图层样式（原版 jsxHistory）
 *   直调  `ys_checkUseFont` / `ys_useFont` —— 字体（原版 jsxWrite）
 *
 * 判断依据不是「是不是 ys_ 开头」，而是原版前端用 jsxHistory 还是 jsx。
 */
export const VENDOR_FUNCS = [
  'ps_onJsx',
  'ys_useGradient',
  'ps_ysBtnUseStyle',
  'ys_checkUseFont',
  'ys_useFont',
  'Sys_setSystemEnvInfo'
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

  const coreMissing = await probe(['mm_layer_getState', 'mm_style_applyColor', 'mm_doc_getInfo']);
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

/** 仅测试用：重置加载状态 */
export function resetPsReady(): void {
  pending = null;
}
