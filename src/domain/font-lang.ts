/**
 * 字体家族名 → 中/英 的唯一判据（原版 `app.v4.js:47561` 的 `Ax`）。
 *
 * 规则是**ASCII 字符集**，不是「有没有汉字」：日文假名、全角符号、`°`
 * 都落在「非英文」一侧。别用 `[\u4e00-\u9fa5]` 代替——那会让同一个字体
 * 在预览里算英文、在筛选里算中文。
 *
 * 消费点：预览文案（英文名用英文样例）、语言筛选、字重预览用「A」还是「永」。
 */

const ASCII_FAMILY = /^[a-zA-Z0-9. -_?]*$/;

export function isAsciiFamily(family: string): boolean {
  return ASCII_FAMILY.test(family);
}

/** 预览/筛选用二分：`en` = 英文命名，`cn` = 其余 */
export function familyLang(family: string): 'en' | 'cn' {
  return isAsciiFamily(family) ? 'en' : 'cn';
}
