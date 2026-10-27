/**
 * 文字属性剪贴板（内存，不落盘）
 *
 * 为什么不用系统剪贴板：这里存的是 `ys_getFontInfo` 的整份结构（含 fonts 数组），
 * 不是用户能读的文本；原版也是内存变量，刷新面板就丢。
 *
 * 边界：`set` 存**深拷贝**（之后改剪贴板外的对象不会污染它），
 * `get` 返回内部引用——粘贴前必须自己再深拷贝一份再改，否则会把剪贴板改坏。
 */

let clipboard: Record<string, unknown> | null = null;

/** 存一份当前文字属性（深拷贝，调用方后续改动不影响这里） */
export function setFontClipboard(data: Record<string, unknown>): void {
  clipboard = structuredClone(data);
}

/** 取剪贴板内容；没有复制过返回 `null`（不返回空对象冒充「有数据」） */
export function getFontClipboard(): Record<string, unknown> | null {
  return clipboard;
}

/** 是否复制过：粘贴前唯一的判据，`getFontClipboard() !== null` 的语义包装 */
export function hasFontClipboard(): boolean {
  return clipboard !== null;
}
