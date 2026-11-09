/**
 * DLSS 神经渲染引擎域逻辑：找 runtime、自检、跑图、临时产物。
 *
 * **不 spawn**：进程原语在 `core/cep/process.ts`（全仓唯一 spawn 出口）。
 * **不认 token**：入参就是 `DlssParams`，`--nr-*` 名字的映射只在本文件一处 ——
 * 包括「`w` 优先于 `sc`」这条判据（`ADR-0003` 判据 2：同一知识只出现一处）。
 *
 * runtime 是外部大资产，不进仓库：位置约定见 `CONVENTIONS` §5.2。
 */

import { DLSS_EXE, DLSS_PROBE_TIMEOUT_MS, DLSS_TEMP_DIR, DLSS_TIMEOUT_MS } from '../../config';
import type { DlssEngineInfo, DlssParams } from '../../types/dlss';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import { log } from '../logger';
import { getExtensionPath, getUserDataPath } from '../cep/bridge';
import { nodeRequire } from '../cep/node';
import { runProcess } from '../cep/process';

interface FsModule {
  existsSync(path: string): boolean;
  mkdirSync(path: string, options: { recursive: true }): void;
  readdirSync(path: string): string[];
  rmSync(path: string, options: { recursive: boolean; force: boolean }): void;
}

interface PathModule {
  join(...parts: string[]): string;
  basename(path: string): string;
}

interface OsModule {
  tmpdir(): string;
}

interface NodeModules {
  fs: FsModule;
  path: PathModule;
  os: OsModule;
}

/** 三个内置模块取一次就够：`nodeRequire` 每次都会走一遍 `window.require` 探测 */
let cached: NodeModules | null = null;

function nodeModules(): Result<NodeModules> {
  if (cached) return ok(cached);

  const fs = nodeRequire<FsModule>('fs');
  if (fs.status === 'error') return fs;
  const path = nodeRequire<PathModule>('path');
  if (path.status === 'error') return path;
  const os = nodeRequire<OsModule>('os');
  if (os.status === 'error') return os;

  cached = { fs: fs.value, path: path.value, os: os.value };
  return ok(cached);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 引擎失败原因只在这里：尾部 12 行进 `detail`，丢了就没法排障 */
function tail(lines: string[], count: number): string {
  return lines.slice(Math.max(0, lines.length - count)).join('\n');
}

/** 目录里是否有 `video2dlssnr.exe` */
function isRuntime(fs: FsModule, path: PathModule, dir: string): boolean {
  try {
    return fs.existsSync(path.join(dir, DLSS_EXE));
  } catch {
    return false;
  }
}

/**
 * 探测引擎目录。
 *
 * `ok` + `dir:null` = 找过了但没有；`IO_ERROR` = 连 Node 都拿不到。
 * 两者不能折成同一个 `null`（`ADR-0008`：失败与没有不许同形）。
 */
export function resolveRuntime(savedPath: string): Result<{ dir: string | null; tried: string[] }> {
  const modules = nodeModules();
  if (modules.status === 'error') return modules;

  const { fs, path } = modules.value;
  const extension = getExtensionPath();
  const tried = [
    savedPath,
    path.join(getUserDataPath(), 'Maomao', 'assets', 'dlss'),
    path.join(extension, '..', 'runtime')
  ].filter((candidate) => candidate.length > 0);

  for (const candidate of tried) {
    if (isRuntime(fs, path, candidate)) return ok({ dir: candidate, tried });
  }
  return ok({ dir: null, tried });
}

/**
 * probe 结果按目录缓存：一次实测 **4.4 秒**（引擎要加载 214MB DLL 并初始化 NGX），
 * 每次进页都付这个代价是原插件没有的开销 —— 它把自检做成按钮，不是启动流程。
 *
 * 缓存只在本会话有效；换显卡 / 装 NGX / 改驱动之后用 `force` 重跑（页面「环境自检」）。
 */
const probeCache = new Map<string, Result<DlssEngineInfo>>();
let probeInFlight: { dir: string; promise: Promise<Result<DlssEngineInfo>> } | null = null;

/** 从 `--probe-nr` 的行里取环境信息；缺行给 `—`（core 不产中文文案） */
function pickLine(lines: string[], key: string): string {
  const line = lines.find((text) => text.trim().toLowerCase().startsWith(key));
  return line ? line.trim().slice(key.length).trim() : '—';
}

function engineInfoOf(lines: string[]): DlssEngineInfo {
  const gpu = pickLine(lines, 'gpu:')
    .replace(/^NVIDIA GeForce\s+/i, '')
    .replace(/\s*\(\d+ MB\).*$/, '');
  const driver = pickLine(lines, 'driver:').split(/\s+/)[0] ?? '—';
  const version = pickLine(lines, 'dlssnr:').split(/\s+/)[0] ?? '—';
  return { gpu: gpu || '—', driver, version };
}

/**
 * 引擎自检：`--probe-nr` 输出里必须有 `Neural Rendering RAN`。
 *
 * 拿不到这一行就是这台机器跑不了（无 RTX / 驱动旧 / NGX 没装），尾部进 `detail`。
 * 一次 spawn 同时回显卡 / 驱动 / 引擎版本 —— 不需要第二个「刷新信息」的进程。
 * 同一目录并发调用复用同一个进程（切页来回不重复 spawn）。
 */
export function probeEngine(
  runtimeDir: string,
  force = false
): Promise<Result<DlssEngineInfo>> {
  if (!force) {
    const cached = probeCache.get(runtimeDir);
    if (cached) return Promise.resolve(cached);
  }
  if (probeInFlight && probeInFlight.dir === runtimeDir) return probeInFlight.promise;

  const promise = probeUncached(runtimeDir).then((result) => {
    probeCache.set(runtimeDir, result);
    probeInFlight = null;
    return result;
  });
  probeInFlight = { dir: runtimeDir, promise };
  return promise;
}

async function probeUncached(runtimeDir: string): Promise<Result<DlssEngineInfo>> {
  const modules = nodeModules();
  if (modules.status === 'error') return modules;

  const { path } = modules.value;
  const run = await runProcess(path.join(runtimeDir, DLSS_EXE), ['--probe-nr'], {
    cwd: runtimeDir,
    timeoutMs: DLSS_PROBE_TIMEOUT_MS
  });
  if (run.status === 'error') return run;

  const lines = run.value.lines;
  if (!/Neural Rendering RAN/i.test(lines.join('\n'))) {
    return failWithDetail(
      'IO_ERROR',
      MSG.codeReason.IO_ERROR,
      `probe:no-ran\n${tail(lines, 12)}`
    );
  }
  return ok(engineInfoOf(lines));
}

/** 引擎命令行参数：键名映射与「宽度优先」都只在这里 */
function buildArgs(input: { inPath: string; outDir: string; params: DlssParams }): string[] {
  const { params } = input;
  const args = ['--nr-run', '--in', input.inPath, '--out', input.outDir];

  if (params.w !== undefined && params.w > 0) args.push('--nr-width', String(Math.round(params.w)));
  else args.push('--nr-scale', String(params.sc ?? 1));

  args.push('--nr-style', String(params.st));
  /* 模型档位只有内置那一套：原插件 `collectOptions` 就是硬编码 0，别和 `st`（风格）混 */
  args.push('--nr-preset', '0');
  args.push('--nr-intensity', String(params.i));
  args.push('--nr-detail', String(params.d));
  args.push('--nr-color', String(params.c));
  args.push('--nr-local-structure', String(params.ls));
  args.push('--nr-local-tone', String(params.lt));
  args.push('--nr-skin', String(params.sk));
  args.push('--nr-ui-correction', params.ui ? '1' : '0');
  if (params.am) args.push('--nr-auto-mask');
  if (params.sr !== 'default') args.push('--nr-sr-preset', params.sr);

  return args;
}

/** 引擎把结果写成 `<输入文件名>_nr.png`；按名找不到就扫目录（同名冲突时的退化） */
function findOutput(
  fs: FsModule,
  path: PathModule,
  outDir: string,
  inPath: string
): string | null {
  const expected = path.join(outDir, path.basename(inPath) + '_nr.png');
  try {
    if (fs.existsSync(expected)) return expected;
  } catch {
    /* 目录不可读时走下面的扫描，让「有没有结果」由扫描回答 */
  }

  try {
    const hit = fs
      .readdirSync(outDir)
      .filter((name) => /_nr\.png$/i.test(name))
      .sort()[0];
    return hit ? path.join(outDir, hit) : null;
  } catch {
    return null;
  }
}

/**
 * 跑一次引擎：成功时 `outPath` 是结果 PNG，`log` 是引擎输出（给页面显示最后一行）。
 *
 * 退出码 ≠ 0 与「没产出结果」都是 `PS_ERROR`，尾部 12 行进 `detail`。
 */
export async function runEngine(
  runtimeDir: string,
  input: { inPath: string; outDir: string; params: DlssParams }
): Promise<Result<{ outPath: string; log: string[] }>> {
  const modules = nodeModules();
  if (modules.status === 'error') return modules;

  const { fs, path } = modules.value;
  try {
    fs.mkdirSync(input.outDir, { recursive: true });
  } catch (error) {
    return failWithDetail(
      'IO_ERROR',
      MSG.codeReason.IO_ERROR,
      `mkdir:${input.outDir}:${messageOf(error)}`
    );
  }

  const run = await runProcess(path.join(runtimeDir, DLSS_EXE), buildArgs(input), {
    cwd: runtimeDir,
    timeoutMs: DLSS_TIMEOUT_MS
  });
  if (run.status === 'error') return run;

  const { code, lines } = run.value;
  if (code !== 0) {
    return failWithDetail(
      'PS_ERROR',
      MSG.codeReason.PS_ERROR,
      `engine_exit_${String(code)}\n${tail(lines, 12)}`
    );
  }

  const outPath = findOutput(fs, path, input.outDir, input.inPath);
  if (!outPath) {
    return failWithDetail(
      'PS_ERROR',
      MSG.codeReason.PS_ERROR,
      `engine_no_output\n${tail(lines, 12)}`
    );
  }

  return ok({ outPath, log: lines });
}

/**
 * 建 `%TEMP%\maomao-dlss\<stamp>\`，输入 PNG 就放里面。
 *
 * 输入与输出同目录：跑完删一个目录就干净，不会漏掉中间文件。
 */
export function prepareTemp(): Result<{ dir: string; inPath: string }> {
  const modules = nodeModules();
  if (modules.status === 'error') return modules;

  const { fs, path, os } = modules.value;
  const stamp = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const dir = path.join(os.tmpdir(), DLSS_TEMP_DIR, stamp);

  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (error) {
    return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, `mkdir:${dir}:${messageOf(error)}`);
  }
  return ok({ dir, inPath: path.join(dir, 'in.png') });
}

/** 删整个 `<stamp>` 目录；删不掉只记日志（清理路径可以尽力而为，`ADR-0008` 例外） */
export function cleanupTemp(dir: string): void {
  const modules = nodeModules();
  if (modules.status === 'error') {
    log.warn('DLSS 临时目录无法清理（没有 Node 环境）', { dir });
    return;
  }

  try {
    modules.value.fs.rmSync(dir, { recursive: true, force: true });
  } catch (error) {
    log.warn('DLSS 临时目录删除失败', { dir, reason: messageOf(error) });
  }
}
