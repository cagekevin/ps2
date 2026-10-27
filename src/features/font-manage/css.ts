/**
 * 字体页的 CSS 值构造（唯一的转义处）。
 *
 * 字体名/PostScript 名进 `font-family` 前必须转义反斜杠与双引号；
 * 旧写法直接拼 `"${ps}"`，名字里只要有一个引号，后面的声明就废了。
 */
export function cssQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** `"PostScript", "Family"` —— 预览与字重字形共用同一份拼法 */
export function fontFamilyValue(postScriptName: string, family: string): string {
  return `${cssQuote(postScriptName)}, ${cssQuote(family)}`;
}
