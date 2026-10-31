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
import { runSerial } from '../serial';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';

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
  copyFileSync(from: string, to: string): void;
  existsSync(path: string): boolean;
  mkdirSync(path: string, options: { recursive: boolean }): void;
  unlinkSync(path: string): void;
  /** 只用于 `removeDir`：平铺目录逐个删子文件（不引 `fs.rm` / `recursive` —— CEP 的
   *  Node 版本跨版本不稳，`rmdirSync({recursive})` 在旧版上直接抛） */
  readdirSync(path: string): string[];
  rmdirSync(path: string): void;
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

/** 读文件正文的唯一实现：凡是「路径 → 文本」都走这里 */
function readTextFile(absPath: string, label: string): Result<string> {
  const fs = getFs();
  if (!fs) return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, 'fs:null');

  try {
    if (!fs.existsSync(absPath)) return failWithDetail('NOT_FOUND', MSG.codeReason.NOT_FOUND, `path:${absPath}`);
    return ok(stripBom(fs.readFileSync(absPath, 'utf8')));
  } catch (error) {
    log.warn('读取文件失败', { label, absPath, error });
    /* reason 只放用户话；路径是观测，进 detail（同一个名字不许装两种语义） */
    return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, `read:${absPath};${String(error)}`);
  }
}

/**
 * 带失败码的读取：NOT_FOUND = 文件不存在，IO_ERROR = 存在但读不到。
 * repo 层用它，语义由码承载（全仓唯一结果形状，见 types/result.ts）。
 */
export function readTextResult(name: string, root: StorageRoot = 'data'): Result<string> {
  return readTextFile(filePath(root, name), `${root}:${name}`);
}

/* 读 JSON 的唯一入口是 `repo/json-file.ts:readJsonFile`（Result 形状）。
 * `core/prefs` 是「偏好文件读不到就用默认值」的特例，它在自己文件内处理，
 * 不在这里再开一个吞失败的 `readJson`。 */

/** 读任意绝对路径（用户经文件对话框选中的导入文件）；只读，不写库 */
export function readTextAt(absPath: string): Result<string> {
  return readTextFile(absPath, absPath);
}

function dirnameOf(absPath: string): string {
  const index = Math.max(absPath.lastIndexOf('/'), absPath.lastIndexOf('\\'));
  return index <= 0 ? absPath : absPath.slice(0, index);
}

/** 写文件的唯一实现；`backup` 决定是否把原文复制到 `.bak` */
function writeTextFile(absPath: string, text: string, backup: boolean): Result<void> {
  const fs = getFs();
  if (!fs) return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, 'fs:null');

  try {
    if (backup && fs.existsSync(absPath)) {
      fs.writeFileSync(`${absPath}.bak`, fs.readFileSync(absPath, 'utf8'), 'utf8');
    }
    fs.mkdirSync(dirnameOf(absPath), { recursive: true });
    fs.writeFileSync(absPath, text, 'utf8');
    return ok(undefined);
  } catch (error) {
    log.error('写入文件失败', { absPath, backup, error });
    return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, `write:${absPath};${String(error)}`);
  }
}

/**
 * 回滚到上一版：把 `<文件>.bak` 写回 `<文件>`。
 *
 * - 有 `.bak` → 写回原文；
 * - 没有 `.bak` → 说明这个文件是**刚创建的**，删掉它，回到「不存在」状态；
 * - 回滚**不再轮换 `.bak`**（否则回滚本身会把唯一的退路毁掉）。
 *
 * 注意：`.bak` 只保留**上一版**。连续写两次之后，`.bak` 里是上一次的内容，
 * 更早的版本已经没有了——这不是 bug，是「单版本备份」的固有代价。
 */
export function restoreBackup(name: string, root: StorageRoot = 'data'): Result<void> {
  const fs = getFs();
  if (!fs) return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, 'fs:null');

  const target = filePath(root, name);
  const backup = `${target}.bak`;

  try {
    if (!fs.existsSync(backup)) {
      if (fs.existsSync(target)) fs.unlinkSync(target);
      return ok(undefined);
    }
    fs.writeFileSync(target, fs.readFileSync(backup, 'utf8'), 'utf8');
    return ok(undefined);
  } catch (error) {
    log.error('回滚失败', { name, root, error });
    return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, `rollback:${target};${String(error)}`);
  }
}

/** 二进制文件复制（导入覆盖前的旧文件回收；不能按 utf8 读图片/PSD） */
export function copyFileAt(fromAbs: string, toAbs: string): Result<void> {
  const fs = getFs();
  if (!fs) return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, 'fs:null');

  try {
    fs.mkdirSync(dirnameOf(toAbs), { recursive: true });
    fs.copyFileSync(fromAbs, toAbs);
    return ok(undefined);
  } catch (error) {
    log.warn('复制文件失败', { fromAbs, toAbs, error });
    return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, `copy:${String(error)}`);
  }
}

/**
 * 写任意绝对路径（导出产物）。导出文件由用户在系统对话框里确认，属**覆盖意图明确**的新文件，
 * 不生成 `.bak`；同路径写仍串行。
 */
export function writeTextAtAtomic(absPath: string, text: string): Promise<Result<void>> {
  return runSerial(`write:${absPath}`, () =>
    Promise.resolve(writeTextFile(absPath, text, false))
  );
}

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
  const target = filePath(root, name);
  return runSerial(`write:${target}`, () => Promise.resolve(writeTextFile(target, text, true)));
}

/**
 * 删除目录；目录本来就不存在也算成功（目标已达成）。
 *
 * 只处理**平铺目录**：逐个 `unlinkSync` 子文件，再 `rmdirSync`。
 * 遇到子目录会抛 → `IO_ERROR`（`detail` 带原始错误），**不递归**：
 * 递归删是「一次误点删一片」的入口，本仓唯一的递归删除需求（模板条目目录
 * `PSD/<id>.info/`）结构固定为平铺，用不上递归。
 */
export function removeDir(name: string, root: StorageRoot = 'data'): Result<void> {
  const fs = getFs();
  if (!fs) return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, 'fs:null');

  const target = filePath(root, name);
  try {
    if (!fs.existsSync(target)) return ok(undefined);
    for (const child of fs.readdirSync(target)) fs.unlinkSync(`${target}/${child}`);
    fs.rmdirSync(target);
    return ok(undefined);
  } catch (error) {
    log.error('删除目录失败', { name, root, error });
    return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, `rmdir:${String(error)}`);
  }
}

/** 删除文件；文件本来就不存在也算成功（目标已达成） */
export function removeFile(name: string, root: StorageRoot = 'data'): Result<void> {
  const fs = getFs();
  if (!fs) return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, 'fs:null');

  const target = filePath(root, name);
  try {
    if (!fs.existsSync(target)) return ok(undefined);
    fs.unlinkSync(target);
    return ok(undefined);
  } catch (error) {
    log.error('removeFile 失败', { name, root, error });
    return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, `remove:${String(error)}`);
  }
}


