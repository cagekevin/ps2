/**
 * 【范本】jsx 文本混淆编解码
 *
 * 字体应用要先把项 JSON 编码再发（原版 `Xv` / `qv`）。
 * 规则：每个字符加上前一个字符的码点，最后 `escape` 成 %XX；解码时反向减。
 *
 * 这不是加密，是原版用来避开 evalScript 字符串里的引号 / 中文转义问题。
 * 只给需要它的 jsx 函数用（目前只有字体），不要套到其他调用上。
 */

/** 原版 `Xv`：编码成可发送文本 */
export function encodeText(value: string): string {
  if (!value) return value;

  let out = String.fromCharCode(value.charCodeAt(0) + value.length);
  for (let i = 1; i < value.length; i++) {
    out += String.fromCharCode(value.charCodeAt(i) + value.charCodeAt(i - 1));
  }
  return escape(out);
}

/* 对应的解码是原版 `qv`：字符减去前一个字符的码点，再 unescape。
 * 目前没有调用方——jsx 返回值都是标准 JSON，不需要还原。
 * 真要解码时照 app 的 domain/translate.ts:52-60 抄回来，别自己推。 */
