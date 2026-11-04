/**
 * 字体预览的 CSS 字体栈构造（**唯一入口**）。
 *
 * 字体管理页三处要把「这一项是哪个字体」交给 CSS：家族名（无预览档）、预览文案、字重字形。
 * 这件事只能由 JS 算 —— 字体名在数据里，CSS 表达不了；所以页面把结果塞进 CSS 变量
 * （`--mm-preview-family` / `--mm-glyph-font`），`font-family` 仍写在 `FontList.css`。
 *
 * 为什么用 **PostScript 名** 而不是家族名：家族名只对应 Regular，选了 Bold 预览还是常规体。
 *
 * 为什么必须转义：字体名里可能带双引号 / 反斜杠，裸拼 `"${ps}"` 会当场把整条声明拼废，
 * 而浏览器不报错 —— 只是静默回落默认字体，看起来和「没写 font-family」一模一样。
 */

/** 字体名进 `font-family` 前的转义（只此一处，别在调用点自己拼引号） */
function cssQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** `"PostScript名", "家族名"` —— 预览文案与字重字形共用同一份拼法 */
export function fontFamilyValue(postScriptName: string, family: string): string {
  return `${cssQuote(postScriptName)}, ${cssQuote(family)}`;
}
