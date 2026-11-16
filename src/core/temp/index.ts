/**
 * 【范本】临时目录横切
 * 唯一允许建 / 删临时目录的入口。命令层与 `core/<域>` 禁止自己 `os.tmpdir()` 拼路径。
 *
 * 形状照 `core/dlss/engine` 里原来的 `prepareTemp` / `cleanupTemp`（2026-11-16 抽出）：
 * 每次给一个 `<stamp>` 子目录，输入与输出都放里面，跑完删一个目录就干净，不会漏中间文件。
 *
 * `domain` 由调用方传 `config` 里的域目录名（`DLSS_TEMP_DIR` / `CUT_TEMP_DIR`）：
 * 本模块不认识任何业务域、也不读 config —— 一认域就会长成第二张「临时目录登记表」。
 */

import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import { log } from '../logger';
import { nodeRequire } from '../cep/node';

interface FsModule {
  mkdirSync(path: string, options: { recursive: true }): void;
  rmSync(path: string, options: { recursive: boolean; force: boolean }): void;
}

interface PathModule {
  join(...parts: string[]): string;
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

/**
 * 建 `%TEMP%\<domain>\<stamp>\`，并给出约定的输入文件 `in.png`。
 *
 * 输入名固定 `in.png`：各域的 jsx 导出函数都产 PNG，命名交给本模块，
 * 调用方只拼参数、不猜文件名。
 */
export function prepareTemp(domain: string): Result<{ dir: string; inPath: string }> {
  const modules = nodeModules();
  if (modules.status === 'error') return modules;

  const { fs, path, os } = modules.value;
  const stamp = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const dir = path.join(os.tmpdir(), domain, stamp);

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
    log.warn('临时目录无法清理（没有 Node 环境）', { dir });
    return;
  }

  try {
    modules.value.fs.rmSync(dir, { recursive: true, force: true });
  } catch (error) {
    log.warn('临时目录删除失败', { dir, reason: messageOf(error) });
  }
}
