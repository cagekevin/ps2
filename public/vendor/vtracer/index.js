'use strict';

// Node package: image decoding + vectorization happen in wasm (no native
// dependency); this layer only adds file I/O and a camelCase API.
//
// 【本仓改动】wasm 初始化改成**显式异步** `init()`：生成代码原本在 require 时同步
// `new WebAssembly.Module(...)`，而 Chromium 主线程禁止对 >4KB 的 buffer 同步编译
// （CEP 面板就在主线程），真机报 `WebAssembly.Compile is disallowed on the main thread`。
// 因此：先 `await init()`，再用 `convertFile` / `convertBuffer` / `convertPixels`。
// 同步版 `convertFileSync` 已删 —— 留着就是「两种写法」，而它在 CEP 里必失败。

const fs = require('fs');
const fsp = require('fs/promises');
const wasm = require('./pkg/vtracer_wasm.js');

/** 初始化 wasm（幂等）；调用任何导出函数前必须先 await 一次 */
function init() {
  return wasm.__wbg_init();
}

/**
 * Vectorize an encoded image (PNG/JPEG/GIF/BMP) Buffer/Uint8Array to an SVG string.
 * @param {Uint8Array} buffer
 * @param {object} [options]
 * @returns {string}
 */
function convertBuffer(buffer, options = {}) {
  return wasm.vectorize_bytes(buffer, options);
}

/**
 * Vectorize a raw RGBA8 buffer (width*height*4 bytes) to an SVG string.
 * @param {Uint8Array} rgba
 * @param {number} width
 * @param {number} height
 * @param {object} [options]
 * @returns {string}
 */
function convertPixels(rgba, width, height, options = {}) {
  return wasm.vectorize_rgba(rgba, width, height, options);
}

/**
 * Read an image file, vectorize it, and write the SVG to disk.
 * @returns {Promise<void>}
 */
async function convertFile(inputPath, outputPath, options = {}) {
  const data = await fsp.readFile(inputPath);
  const svg = wasm.vectorize_bytes(data, options);
  await fsp.writeFile(outputPath, svg);
}

module.exports = { init, convertBuffer, convertPixels, convertFile };
