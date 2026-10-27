/**
 * 【范本】Node 模块唯一出口
 *
 * CEP 在 `--enable-nodejs` 下注入 `window.require` 或 `window.cep_node.require`。
 * 文件读写必须走这里，不能用 `window.cep.fs`——后者在 CEP 12 里只用于文件对话框，
 * 且 `readFile` 对普通路径不可靠（实测读不到）。
 */

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

/** 取 Node 内置模块；不可用或加载失败返回 null，不抛 */
export function nodeRequire<T>(name: string): T | null {
  const req = getRequire();
  if (!req) return null;
  try {
    return req(name) as T;
  } catch {
    return null;
  }
}
