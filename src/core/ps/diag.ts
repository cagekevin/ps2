/**
 * 【范本】PS 能力诊断
 *
 * 两件事：
 *   1. 只读探测：官方 jsx 的函数是否定义、官方配置是否存在、影响填充的开关值。
 *      用于区分「函数没加载」「函数执行失败」「配置导致跳过」三种情况。
 *   2. 诊断脚本：把一段 ExtendScript 原样发给宿主，看它返回什么。
 *
 * 第 2 条是**唯一**执行「页面递进来的代码」的入口，只给 `/debug` 用。
 * 业务要 PS 能力就去 `core/ps` 建函数 + jsx 镜像（`GOVERNANCE` §一），不许经这里绕过。
 */

import { callJsx, evalScript } from '../cep/bridge';
import { log } from '../logger';
import { MSG } from '../../types/messages';
import { fail, failWithDetail, ok, type Result } from '../../types/result';
import { gateFailed } from './capability';
import { ensurePsReady } from './init';
import { parseJsxRaw } from './raw';

export interface VendorDiag {
  /** 每个字段是 typeof 的结果，'function' 才算可用 */
  dispatch: string;
  useStyleColor: string;
  useGradient: string;
  btnUseStyle: string;
  setForegroundColor: string;
  useShapeFill: string;
  /** 动作页（`05`）：执行 PS 动作 / 取动作列表，jsxbin 里静态搜不到，只能这样探 */
  callAction: string;
  getActionList: string;
  /** 官方配置 sj_set.json 是否存在 */
  configSet: boolean;
  /** 官方配置 sj_interfaceSet.ini 是否存在 */
  configInterface: boolean;
  /** 影响填充行为的开关；null 表示没读到 */
  autoFillColor: boolean | string | null;
}

export async function diagVendor(): Promise<Result<VendorDiag>> {
  const capability = await ensurePsReady();
  if (!capability.core) {
    /*
     * 探测**本身**失败时如实报原始原因（超时 / 脚本异常）。
     * 统一说成「PS 脚本未加载」会让排障去找根本不存在的 jsx 文件。
     */
    const failure = capability.probeFailure;
    if (failure && failure.status === 'error') {
      return failWithDetail(failure.code, failure.reason, failure.detail);
    }
    return gateFailed('core');
  }

  const call = await callJsx('mm_diag_vendor');
  if (call.status === 'error') return call;

  const parsed = parseJsxRaw(call.value);
  if (parsed.status === 'error') return parsed;
  return ok(parsed.value as VendorDiag);
}

/**
 * 在 PS 里原样执行一段 ExtendScript，返回宿主输出。
 *
 * 为什么要有：真机问题的形态常常是「这台 PS 上某个 API 返不返回东西」，例如
 * `typeof app.activeDocument.activeLayers`。走正规流程要先加 jsx 探针 → 改探测清单 →
 * 重新部署，一次问答十分钟；这里直接把脚本发下去。
 *
 * 空脚本按 `VALIDATION` 拒绝：空 `evalScript` 的返回也是空串，与「执行成功但没有返回值」
 * 分不开，显示出来会让人以为代码跑过了。
 */
export async function runDebugScript(script: string): Promise<Result<string>> {
  const text = script.trim();
  if (!text) return fail('VALIDATION', MSG.home.scriptEmpty);

  /*
   * 必须包一层 `eval` + try/catch，不能直接 `evalScript(text)`：
   * 裸发脚本时，宿主一抛异常 CEP 只回一句 `EvalScript error.`，真实原因（未定义函数 /
   * 属性不存在在第几行）全部丢失 —— 诊断页存在就是为了看这句真实原因。
   * `eval` 让「表达式」和「语句」都能用：表达式回值，语句回空串但副作用照样生效。
   */
  const source = JSON.stringify(text)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const wrapped =
    `(function(){try{var __r=eval(${source});` +
    `return (__r===undefined)?'':(typeof __r==='string'?__r:String(__r));}` +
    `catch(e){return 'error:'+((e&&e.message)?e.message:String(e));}})()`;

  const result = await evalScript(wrapped);
  if (result.status === 'error') return result;

  const raw = result.value;
  if (raw.startsWith('error:')) {
    log.warn('诊断脚本抛异常', { script: text.slice(0, 200), raw });
    return failWithDetail('PS_ERROR', raw.slice(6), `raw:${raw}`);
  }

  /* 截断只影响日志：输入可能是几百行脚本，原文留在页面上给用户复制 */
  log.info('诊断脚本已执行', { script: text.slice(0, 200), raw });
  return ok(raw);
}
