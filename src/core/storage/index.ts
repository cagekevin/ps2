/**
 * 【范本】存储横切
 * 唯一允许读写本地数据的入口。组件和 feature 禁止直接用 fs。
 *
 * 走 Node 的 fs（`core/cep/node`），不用 `window.cep.fs`：
 * 后者在 CEP 12 里读不到普通文件路径，只适合文件对话框。
 *
 * 数据根（见 ROOTS）：
 *   data   = %APPDATA%\Maomao      本工具自己的数据
 *   legacy = %APPDATA%\SheJiZhuLi  官方客户端已有的数据（样式库等），只读兼容
 *   swatch = %APPDATA%\FengZiSeBan 原版色板面板的数据目录
 */

import { nodeRequire } from '../cep/node';
import { getUserDataPath } from '../cep/bridge';
import { log } from '../logger';
import { fail, failWithDetail, ok, type Result } from '../../types/result';

export type StorageRoot = 'data' | 'legacy' | 'swatch';

/**
 * 三个数据根。`paths.userAssetUrl` 也用 `legacy` 拼图片地址，别在那边再写一份 'SheJiZhuLi'。
 *
 * `swatch` = `/FengZiSeBan`：原版色板面板的数据目录（`sf.js:11` `g_FN.muLu`），
 * **不在** `/SheJiZhuLi` 里面——原版 `path.seBan` = `getUserDataPath() + '/FengZiSeBan/userColor.ini'`
 * （`app.v4.js:5222`），挂在 `%APPDATA%` 根下。
 */
export const ROOTS: Record<StorageRoot, string> = {
  data: '/Maomao',
  legacy: '/SheJiZhuLi',
  swatch: '/FengZiSeBan'
};

interface NodeFs {
  readFileSync(path: string, encoding: 'utf8'): string;
  writeFileSync(path: string, data: string, encoding: 'utf8'): void;
  existsSync(path: string): boolean;
  mkdirSync(path: string, options: { recursive: boolean }): void;
  unlinkSync(path: string): void;
}

function getFs(): NodeFs | null {
  return nodeRequire<NodeFs>('fs');
}

/** 去掉 UTF-8 BOM，官方写出的 ini/json 可能带 */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** 纯函数，便于单测 */
export function buildPath(userDataPath: string, root: StorageRoot, name: string): string {
  return `${userDataPath}${ROOTS[root]}/${name}`;
}

function filePath(root: StorageRoot, name: string): string {
  return buildPath(getUserDataPath(), root, name);
}

export function exists(name: string, root: StorageRoot = 'data'): boolean {
  const fs = getFs();
  if (!fs) return false;
  try {
    return fs.existsSync(filePath(root, name));
  } catch {
    return false;
  }
}

/**
 * 带失败码的读取：NOT_FOUND = 文件不存在，IO_ERROR = 存在但读不到。
 * repo 层用它，语义由码承载（全仓唯一结果形状，见 types/result.ts）。
 */
export function readTextResult(name: string, root: StorageRoot = 'data'): Result<string> {
  const fs = getFs();
  if (!fs) return failWithDetail('IO_ERROR', 'Node 文件模块不可用', 'fs:null');

  if (!exists(name, root)) return fail('NOT_FOUND', '文件不存在');

  try {
    return ok(stripBom(fs.readFileSync(filePath(root, name), 'utf8')));
  } catch (error) {
    log.warn('readText 失败', { name, root, error });
    return failWithDetail('IO_ERROR', '文件存在但读取失败', String(error));
  }
}

function writeText(name: string, text: string, root: StorageRoot = 'data'): boolean {
  const fs = getFs();
  if (!fs) return false;
  try {
    fs.mkdirSync(filePath(root, '').replace(/\/$/, ''), { recursive: true });
    fs.writeFileSync(filePath(root, name), text, 'utf8');
    return true;
  } catch (error) {
    log.error('writeText 失败', { name, root, error });
    return false;
  }
}

/**
 * 读 JSON。
 * 顶层可以是对象或数组——官方 sj_kuStoreInfo.ini 是 `{index, list}`，
 * 不能只接受数组。结构是否合法由调用方判断。
 */
export function readJson<T>(name: string, fallback: T, root: StorageRoot = 'data'): T {
  const result = readTextResult(name, root);
  if (result.status === 'error') return fallback;
  try {
    return JSON.parse(result.value) as T;
  } catch (error) {
    log.warn('readJson 解析失败', { name, root, error });
    return fallback;
  }
}

/** 同一文件的写操作串行化：并发写会互相覆盖 */
const writeQueues = new Map<string, Promise<Result<void>>>();

/**
 * 原子写：先备份原文件为 `<文件>.bak`，再写新内容；同一文件并发调用串行执行。
 *
 * **调用方必须先读成功再写**：读不到就写，等于把用户数据换成默认值。
 * 这条约束在 repo 层保证，storage 只负责「备份 + 原子替换 + 串行」。
 *
 * 回滚：把 `<文件>.bak` 复制回 `<文件>`。
 */
export function writeTextAtomic(
  name: string,
  text: string,
  root: StorageRoot = 'data'
): Promise<Result<void>> {
  const key = `${root}:${name}`;
  const previous = writeQueues.get(key) ?? Promise.resolve(ok(undefined));

  const task = previous.then(() => {
    const fs = getFs();
    if (!fs) return failWithDetail('IO_ERROR', 'Node 文件模块不可用', 'fs:null');

    const target = filePath(root, name);
    const backup = `${target}.bak`;

    try {
      if (fs.existsSync(target)) {
        fs.writeFileSync(backup, fs.readFileSync(target, 'utf8'), 'utf8');
      }
      fs.mkdirSync(filePath(root, '').replace(/\/$/, ''), { recursive: true });
      fs.writeFileSync(target, text, 'utf8');
      return ok(undefined);
    } catch (error) {
      log.error('writeTextAtomic 失败', { name, root, error });
      return failWithDetail('IO_ERROR', '写入失败', String(error));
    }
  });

  writeQueues.set(key, task);
  return task;
}

/** 删除文件；文件本来就不存在也算成功（目标已达成） */
export function removeFile(name: string, root: StorageRoot = 'data'): Result<void> {
  const fs = getFs();
  if (!fs) return failWithDetail('IO_ERROR', 'Node 文件模块不可用', 'fs:null');

  const target = filePath(root, name);
  try {
    if (!fs.existsSync(target)) return ok(undefined);
    fs.unlinkSync(target);
    return ok(undefined);
  } catch (error) {
    log.error('removeFile 失败', { name, root, error });
    return failWithDetail('IO_ERROR', '删除失败', String(error));
  }
}

export function writeJson(name: string, value: unknown, root: StorageRoot = 'data'): Result<void> {
  try {
    return writeText(name, JSON.stringify(value), root)
      ? ok(undefined)
      : failWithDetail('IO_ERROR', '写入失败', `file:${name}`);
  } catch (error) {
    log.error('writeJson 序列化失败', { name, root, error });
    return failWithDetail('IO_ERROR', '写入失败', String(error));
  }
}
