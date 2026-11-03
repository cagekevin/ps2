/**
 * 颜色类型：全仓唯一出处。
 *
 * 为什么在 `types` 而不在 `domain`：`core/ps` 也要用它（设前景/背景色），
 * 而 `core` 不许 import `domain`（`CONVENTIONS` §3 依赖方向表）。
 *
 * 通道值一律 0–255 的整数；CMYK 不在这里 —— 那是 vendor 上色要的形状（`core/ps/style.AppColor`），
 * 前端换算的入口只有 `domain/image-color.hexToCmyk`。
 */

/** 一个 RGB 色值 */
export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/** 一对配色：`foreground` 是主色（填充 / 描边 / 文字），`background` 是陪衬色（擦除 / 蒙版 / 渐变底） */
export interface ColorPair {
  foreground: RgbColor;
  background: RgbColor;
}
