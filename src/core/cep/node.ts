/**
 * 【范本】Node 模块唯一出口
 *
 * CEP 在 `--enable-nodejs` 下注入 `window.require` 或 `window.cep_node.require`。
 * 文件读写必须走这里，不能用 `window.cep.fs`——后者在 CEP 12 里只用于文件对话框，
 * 且 `readFile` 对普通路径不可靠（实测读不到）。
 *
 * **失败必须带原因**：返回 `Result`，不返回 `null`。以前是 `catch {} → null`，
 * 把「没有 Node 环境」「内置模块取不到」「按路径加载的第三方包初始化抛错」抹成同一件事，
 * 上层只能报一句「引擎没加载成功」，真实原因（wasm 初始化失败 / 路径不对）全丢 ——
 * 真机 2026-11-02 矢量化就是这么被卡住的。`detail` 里带模块名与原始异常。
 */

import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';

type RequireFn = (name: string) => unknown;

interface NodeHost {
  require?: RequireFn;
  cep_node?: { require?: RequireFn };
}

function getRequire(): RequireFn | null {
  const host = window as unknown as NodeHost;
  if (typeof host.require === 'function') return host.require;
  if (typeof host.cep_node?.require === 'function') return host.cep_node.require;
  return null;
}

/** 取 Node 模块；失败给出原因（`detail` = `node:<模块名>` 或 `node:<模块名>:<异常>`） */
export function nodeRequire<T>(name: string): Result<T> {
  const req = getRequire();
  if (!req) return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, `node:no-host:${name}`);

  try {
    return ok(req(name) as T);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, `node:${name}:${message}`);
  }
}
