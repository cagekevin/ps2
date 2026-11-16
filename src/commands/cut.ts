/**
 * 抠图命令：当前图层 → 透明 PNG → Python 推理 → 透明 PNG → 作为新图层放回原位。
 *
 * 时序同 `commands/vectorize.ts` 的「失败原图不动」铁律：导出只读原层，结果层盖在
 * 原层上方，原层像素一个字节没动（不满意直接删结果层）。临时目录的建与删都在
 * `core/temp` —— 命令层不碰 `fs`。
 *
 * 三条硬规则同其它命令（`CONVENTIONS` §9）：不碰 DOM、不弹 toast、只返回 `Result<T>`。
 * 「当前必须是像素图层」不在这一层判：那是能力表的前置（`CAP.cutExport.require`
 * → `requirePixelLayer`），调用前由 `callCapability` 统一跑，判据只有一处。
 */

import { CUT_TEMP_DIR } from '../config';
import { MSG } from '../types/messages';
import { failWithDetail, ok, type Failure, type Result } from '../types/result';
import { openFile } from '../core/dialog';
import { cleanupTemp, prepareTemp } from '../core/temp';
import { resolveModel, runCut } from '../core/cut/engine';
import { exportLayer, placePng } from '../core/ps/cut';
import { getLayerState } from '../core/ps/layer';
import { getPref, savePref } from '../core/prefs';

/** 找模型的结论：`path: null` = 两条候选都试过了，`tried` 是报错时要列的全部绝对路径 */
export type CutModelPath =
  | { state: 'ready'; path: string; savedPath: string; tried: string[] }
  | { state: 'missing'; savedPath: string; tried: string[] };

/** 只找模型文件，不加载（毫秒级）。设置页用它显示「当前命中」 */
export function resolveCutModel(): Result<CutModelPath> {
  const savedPath = getPref('cut.model', '');
  const found = resolveModel(savedPath);
  if (found.status === 'error') return found;

  const { path, tried } = found.value;
  return ok(
    path
      ? { state: 'ready', path, savedPath, tried }
      : { state: 'missing', savedPath, tried }
  );
}

/** 让用户选一次模型文件并存进偏好；取消返回 `null`（不是失败） */
export async function chooseModel(): Promise<Result<{ path: string } | null>> {
  const picked = openFile('选择抠图模型（model.onnx）', ['onnx']);
  if (!picked) return ok(null);

  await savePref('cut.model', picked);
  return ok({ path: picked });
}

/**
 * 把脚本侧的失败翻成人话。
 *
 * 只在**两种已知原因**上换 `reason`，其余原样返回：`engine` 不给中文（它的文件头写着
 * 「不写文案」），而 `runProcess` 的两种失败靠 `detail` 前缀就能分开 ——
 * 起不来一定是 `spawn:`，依赖缺失一定是 stderr 里的 `ModuleNotFoundError`。
 * 别在这里按 code 猜：`IO_ERROR` 还可能是读图失败。
 */
function explainRunFailure<T>(failure: Failure): Result<T> {
  if (failure.code === 'IO_ERROR' && failure.detail.startsWith('spawn:')) {
    return { ...failure, reason: MSG.cut.noPython };
  }
  if (failure.detail.includes('ModuleNotFoundError')) {
    return { ...failure, reason: MSG.cut.missingDeps };
  }
  return failure;
}

/**
 * 抠当前图层：结果作为新图层盖在原位，原层像素不动。
 *
 * 结果层名取「原层名 + 抠图」，这样图层面板里一眼能看出它是抠出来的。
 */
export async function cutCurrentLayer(): Promise<Result<void>> {
  const found = resolveCutModel();
  if (found.status === 'error') return found;
  if (found.value.state === 'missing') {
    /* 两条候选都试过：把每一条绝对路径都报出去，别只说「没找到」（ADR-0008） */
    return failWithDetail('IO_ERROR', MSG.cut.noModel, found.value.tried.join('\n'));
  }

  const state = await getLayerState();
  if (state.status === 'error') return state;

  const temp = prepareTemp(CUT_TEMP_DIR);
  if (temp.status === 'error') return temp;

  const { dir, inPath } = temp.value;
  /* 输出路径与输入同目录：`prepareTemp` 已经保证 `<stamp>` 存在且整目录可删 */
  const outPath = inPath.replace(/in\.png$/i, 'out.png');

  const exported = await exportLayer(inPath);
  if (exported.status === 'error') {
    cleanupTemp(dir);
    return exported;
  }

  const ran = await runCut(inPath, outPath, found.value.path);
  if (ran.status === 'error') {
    cleanupTemp(dir);
    return explainRunFailure(ran);
  }

  const { bounds } = exported.value;
  const placed = await placePng(outPath, bounds.left, bounds.top, `${state.value.name} 抠图`);
  cleanupTemp(dir);
  return placed;
}
