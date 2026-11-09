/**
 * DLSS 命令：导出整个画幅的可见合成 → 跑引擎 → 结果导回。
 *
 * 时序见 `docs/plan/23` §3.8，同 `commands/vectorize.ts` 的「失败原图不动」铁律：
 * 导出只读原图层，结果层是新增的，任一步失败都不碰原层。
 *
 * 三条硬规则同其它命令（`CONVENTIONS` §9）：不碰 DOM、不弹 toast、只返回 `Result<T>`。
 * 临时目录的建与删都在 `core/dlss/engine` —— 命令层不碰 `fs`。
 *
 * 超分作用于整个画幅：不需要「恰好 1 个图层」前置，也不需要图层名 ——
 * 导出载荷里的 `layerName` 是文档名，用来做结果名的底。
 */

import { DLSS_MAX_PIXELS } from '../config';
import type { DlssEngineInfo, DlssParams, DlssPlaced } from '../types/dlss';
import { MSG } from '../types/messages';
import { ok, type Result } from '../types/result';
import { chooseFolder } from '../core/dialog';
import { cleanupTemp, prepareTemp, probeEngine, resolveRuntime, runEngine } from '../core/dlss/engine';
import { getPref, savePref } from '../core/prefs';
import { exportLayer, finishResult } from '../core/ps/dlss';
import { dlssResultName } from '../domain/dlss-token';

/**
 * 找引擎目录的结论。
 *
 * `no-engine` 与「probe 失败」必须分开：前者是**路径不对**（用户能指定），
 * 后者是**这台机器跑不了**（换显卡才行）。合成一个「不可用」会把可修的情况判死刑。
 */
export type DlssEnginePath =
  | { state: 'ready'; dir: string; savedPath: string; tried: string[] }
  | { state: 'no-engine'; savedPath: string; tried: string[] };

/**
 * 只找目录，**不跑自检**（毫秒级）。
 *
 * 自检要 spawn 引擎、实测 4.4 秒，放进进页流程就是「打开页面先白等四秒」——
 * 原插件把自检做成按钮正是这个原因。所以进页只调这个，`verifyEngine` 交给后台或按钮。
 */
export function resolveEngine(): Result<DlssEnginePath> {
  const savedPath = getPref('dlss.runtime', '');
  const found = resolveRuntime(savedPath);
  if (found.status === 'error') return found;

  const { dir, tried } = found.value;
  return ok(
    dir
      ? { state: 'ready', dir, savedPath, tried }
      : { state: 'no-engine', savedPath, tried }
  );
}

/**
 * 跑一次引擎自检（`--probe-nr`），结果在 `core/dlss/engine` 里按目录缓存。
 * `force` 给「环境自检」按钮用：换显卡 / 装 NGX / 改驱动之后要能重跑。
 *
 * **不换码**：`PS_UNREADY` 由 `probeEngine` 一次定死，这里只把码级通用句换成本域中文
 * （`core` 不许写中文）。`code` / `detail` 原样，其它失败臂整个透传 —— `ADR-0003` 消费者只转发。
 */
export async function verifyEngine(
  dir: string,
  force = false
): Promise<Result<DlssEngineInfo>> {
  const probed = await probeEngine(dir, force);
  if (probed.status === 'ok' || probed.code !== 'PS_UNREADY') return probed;

  return {
    status: 'error',
    code: probed.code,
    reason: MSG.dlss.probeFailed,
    detail: probed.detail
  };
}

/** 让用户选一次引擎目录并存进偏好；取消返回 `null`（不是失败） */
export async function chooseRuntime(): Promise<Result<{ dir: string } | null>> {
  const picked = chooseFolder('选择 DLSS 引擎目录（含 video2dlssnr.exe）');
  if (!picked) return ok(null);

  await savePref('dlss.runtime', picked);
  return ok({ dir: picked });
}

/** 整个画幅 → 引擎 → 结果层 / 新文档；结果名带参数 token，可事后读回 */
export async function runDlss(params: DlssParams, runtimeDir: string): Promise<Result<DlssPlaced>> {
  const temp = prepareTemp();
  if (temp.status === 'error') return temp;

  const { dir, inPath } = temp.value;

  const exported = await exportLayer(inPath, DLSS_MAX_PIXELS);
  if (exported.status === 'error') {
    cleanupTemp(dir);
    return exported;
  }

  const ran = await runEngine(runtimeDir, { inPath, outDir: dir, params });
  if (ran.status === 'error') {
    cleanupTemp(dir);
    return ran;
  }

  const placed = await finishResult({
    pngPath: ran.value.outPath,
    left: exported.value.left,
    top: exported.value.top,
    regionW: exported.value.width,
    regionH: exported.value.height,
    outName: dlssResultName(exported.value.layerName, params)
  });

  cleanupTemp(dir);
  return placed;
}
