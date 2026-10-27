/** 统一颜色对象：hex 大写不带 #，cmyk 为 0-100 */
export interface Color {
  hex: string;
  c: number;
  m: number;
  y: number;
  k: number;
}
