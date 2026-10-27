/**
 * 【范本】浏览器图片解码原语。
 *
 * `domain/image-color.ts` 是纯算法（canvas / decode 由调用方注入），
 * 这里的三个函数是**默认注入实现**——它们认识 DOM（FileReader / canvas / Image），
 * 页面不直接碰这些 API（`CONVENTIONS.md` §4.8：公共能力不进页面）。
 *
 * CEP 的 Chromium 有完整 canvas / Image 能力；jsdom 没有（见 image-color.ts 末尾的
 * 「jsdom 边界」），所以单测只覆盖纯算法，这三条只能在真机验证。
 */

/** File → dataURL（原版 drop 链路的 `FileReader.readAsDataURL`） */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

/** 默认 canvas 工厂：按目标尺寸建一个 2D 画布 */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
  return Object.assign(document.createElement('canvas'), { width, height });
}

/** dataURL → 已解码的 <img>（宽高就绪） */
export function decodeImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片解码失败'));
    image.src = dataUrl;
  });
}
