/**
 * 一键抠图的引擎域逻辑：找模型、跑脚本。
 *
 * **不 spawn**：进程原语在 `core/cep/process.ts`（全仓唯一 spawn 出口）。
 * **不建临时目录**：`core/temp` 是唯一出口（`CONVENTIONS` §5.1）。
 * **不写文案**：失败只给码 + 现场（`detail`），中文由命令层换成本域句子。
 *
 * 模型是外部大资产（RMBG-1.4，168MB），不进仓库：位置约定见 `CONVENTIONS` §5.2，
 * 与 DLSS 引擎目录同一条规则（用户指定 → 默认位置），形状差别只在「目录 + 找 exe」与「单个文件」。
 */

import { CUT_MODEL_NAME, CUT_PYTHON, CUT_TIMEOUT_MS } from '../../config';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import { getExtensionPath, getUserDataPath } from '../cep/bridge';
import { nodeRequire } from '../cep/node';
import { runProcess } from '../cep/process';

interface FsModule {
  existsSync(path: string): boolean;
}

interface PathModule {
  join(...parts: string[]): string;
}

interface NodeModules {
  fs: FsModule;
  path: PathModule;
}

/** 两个内置模块取一次就够：`nodeRequire` 每次都会走一遍 `window.require` 探测 */
let cached: NodeModules | null = null;

function nodeModules(): Result<NodeModules> {
  if (cached) return ok(cached);

  const fs = nodeRequire<FsModule>('fs');
  if (fs.status === 'error') return fs;
  const path = nodeRequire<PathModule>('path');
  if (path.status === 'error') return path;

  cached = { fs: fs.value, path: path.value };
  return ok(cached);
}

/** 脚本失败原因只在这里：尾部 12 行进 `detail`，丢了就没法排障 */
function tail(lines: string[], count: number): string {
  return lines.slice(Math.max(0, lines.length - count)).join('\n');
}

function isFile(fs: FsModule, candidate: string): boolean {
  try {
    return fs.existsSync(candidate);
  } catch {
    return false;
  }
}

/**
 * 探测模型文件。候选固定两条，顺序固定（`CONVENTIONS` §5.2）：
 * 用户指定（prefs `cut.model`）→ `%APPDATA%\\Maomao\\assets\\cut\\model.onnx`。
 *
 * `ok` + `path:null` = 找过了但没有；`IO_ERROR` = 连 Node 都拿不到。
 * 两者不能折成同一个 `null`（`ADR-0008`：失败与没有不许同形）。
 */
export function resolveModel(savedPath: string): Result<{ path: string | null; tried: string[] }> {
  const modules = nodeModules();
  if (modules.status === 'error') return modules;

  const { fs, path } = modules.value;
  const tried = [
    savedPath,
    path.join(getUserDataPath(), 'Maomao', 'assets', 'cut', CUT_MODEL_NAME)
  ].filter((candidate) => candidate.length > 0);

  for (const candidate of tried) {
    if (isFile(fs, candidate)) return ok({ path: candidate, tried });
  }
  return ok({ path: null, tried });
}

/** 推理脚本的绝对路径：`public/vendor/cut/` 由 Vite 拷进 `dist/vendor/cut/`（同 vtracer） */
function scriptPath(): Result<string> {
  const root = getExtensionPath();
  if (!root) return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, 'extension:empty');

  const path = nodeRequire<PathModule>('path');
  if (path.status === 'error') return path;
  return ok(path.value.join(root, 'dist', 'vendor', 'cut', 'cut.py'));
}

/**
 * 跑一次抠图：`python cut.py <in> <out> <model>`。
 *
 * 缩放、归一化、alpha 全在脚本里（`plan 21` §3）—— 本层只拼参数、判退出码。
 * 结果是原尺寸透明 PNG，放回原位由 jsx 侧负责（`mm_placePngIntoDoc`），
 * 所以这里不需要文档尺寸与图层坐标。
 *
 * 退出码非 0 时把脚本 stderr 的尾部带进 `detail`：那是用户唯一能看懂的原因。
 */
export async function runCut(
  inPath: string,
  outPath: string,
  modelPath: string
): Promise<Result<void>> {
  const script = scriptPath();
  if (script.status === 'error') return script;

  const ran = await runProcess(
    CUT_PYTHON,
    [script.value, inPath, outPath, modelPath],
    { timeoutMs: CUT_TIMEOUT_MS }
  );
  if (ran.status === 'error') return ran;

  const { code, lines } = ran.value;
  if (code !== 0) {
    return failWithDetail(
      'PS_ERROR',
      MSG.codeReason.PS_ERROR,
      `cut_exit_${String(code)}\n${tail(lines, 12)}`
    );
  }
  return ok(undefined);
}

