/**
 * 【范本】CEP 文件对话框（照 app `cep/dialog.ts`）。
 *
 * 原版走 `window.cep.fs.showSaveDialogEx / showOpenDialogEx`，不是 ExtendScript File。
 * 成功口径是 CEP 原生的 `err === 0`（与 jsx 的 `{err}` 不是同一套契约，别合并）。
 * 取消返回 null——调用方提示「已取消」，不当故障。
 */
interface CepFsLike {
  showOpenDialogEx(
    multiSelect: boolean,
    chooseDirectory: boolean,
    title: string,
    initialPath: string,
    extensions: string[]
  ): { err: number; data: string[] };
  showSaveDialogEx(
    title: string,
    initialPath: string,
    extensions: string[],
    defaultName: string,
    initialContent: string
  ): { err: number; data: string };
}

function cepFs(): CepFsLike | null {
  /* window.cep 的既有全局类型只声明了 util；fs 在真实 CEP 运行时存在，这里走窄化 */
  const cep = (window as unknown as { cep?: { fs?: unknown } }).cep;
  const fs = cep?.fs;
  if (!fs) return null;
  return fs as CepFsLike;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

/** 打开单个文件；取消返回 null */
export function openFile(title: string, extensions: string[]): string | null {
  const fs = cepFs();
  if (!fs || typeof fs.showOpenDialogEx !== 'function') return null;
  const result = fs.showOpenDialogEx(false, false, title, '', extensions);
  /* `{err:0, data:['']}` 是取消的另一种形态：空串不是路径 */
  if (result.err !== 0 || !result.data[0]) return null;
  return normalizePath(result.data[0]);
}

/** 选目录；取消返回 null（与 openFile / saveFile 同一取消语义）。选目录必须单选，否则 CEP 只回一个路径却选了多个 */
export function chooseFolder(title: string): string | null {
  const fs = cepFs();
  if (!fs || typeof fs.showOpenDialogEx !== 'function') return null;
  const result = fs.showOpenDialogEx(false, true, title, '', []);
  if (result.err !== 0 || !result.data[0]) return null;
  return normalizePath(result.data[0]);
}

/** 保存文件；取消返回 null。扩展名不存在时自动补第一个 */
export function saveFile(title: string, extensions: string[], defaultName: string): string | null {
  const fs = cepFs();
  if (!fs || typeof fs.showSaveDialogEx !== 'function') return null;
  const result = fs.showSaveDialogEx(title, '', extensions, defaultName, '');
  if (result.err !== 0 || !result.data) return null;

  let path = normalizePath(result.data);
  const suffix = `.${extensions[0] ?? ''}`;
  if (extensions.length && !path.toLowerCase().endsWith(suffix.toLowerCase())) {
    path += suffix;
  }
  return path;
}
