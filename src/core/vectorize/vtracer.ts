/**
 * vtracer（位图 → SVG）的唯一入口。
 *
 * 依赖以**源码形式进仓库**：`public/vendor/vtracer/`（692 KB，含 653 KB wasm），
 * 由 Vite 原样拷进 `dist/vendor/vtracer/`，所以扩展目录里一定有。
 *
 * **为什么不 import**：这是 wasm-bindgen 的 nodejs target，内部靠 `require('fs')` 和
 * `__dirname` 找 `.wasm`；经 Vite 打包后这两点都断。只能在运行时按扩展目录绝对路径 require。
 *
 * **为什么是 async**：vendor 的生成代码原本在 require 时同步 `new WebAssembly.Module(bytes)`，
 * 而 Chromium 主线程禁止对 >4KB 的 buffer 同步编译（CEP 面板就在主线程）——
 * 真机报 `WebAssembly.Compile is disallowed on the main thread`。
 * 现在 vendor 暴露 `init()`（异步编译），**用之前必须先 await 一次**，见
 * `public/vendor/vtracer/README-patch.md`。
 *
 * 失败不抛：加载 / 初始化 / 转换都折成 `Result`，原因一律进 `detail`。
 */

import { VECTORIZE_OPTIONS } from '../../config';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import { getExtensionPath } from '../cep/bridge';
import { nodeRequire } from '../cep/node';

interface VtracerModule {
  /** 初始化 wasm（幂等） */
  init(): Promise<void>;
  convertFile(input: string, output: string, options?: Record<string, unknown>): Promise<void>;
}

/** 加载过一次就记住（wasm 编译不便宜，初始化也只做一次） */
let cached: VtracerModule | null = null;

async function load(): Promise<Result<VtracerModule>> {
  if (cached) return ok(cached);

  const root = getExtensionPath();
  if (!root) return failWithDetail('IO_ERROR', MSG.vectorize.noEngine, 'extension:empty');

  /* `nodeRequire` 的失败原因原样带上（模块名 + 原始异常），不再折成一句「加载失败」 */
  const mod = nodeRequire<VtracerModule>(`${root}/dist/vendor/vtracer/index.js`);
  if (mod.status === 'error') {
    return failWithDetail('IO_ERROR', MSG.vectorize.noEngine, mod.detail);
  }
  if (typeof mod.value.init !== 'function' || typeof mod.value.convertFile !== 'function') {
    return failWithDetail('IO_ERROR', MSG.vectorize.noEngine, 'vendor:shape');
  }

  try {
    await mod.value.init();
  } catch (error) {
    return failWithDetail('IO_ERROR', MSG.vectorize.noEngine, `wasm:${String(error)}`);
  }

  cached = mod.value;
  return ok(mod.value);
}

/** 位图文件 → SVG 文件 */
export async function rasterToSvg(inputPath: string, outputPath: string): Promise<Result<void>> {
  const mod = await load();
  if (mod.status === 'error') return mod;

  try {
    await mod.value.convertFile(inputPath, outputPath, { ...VECTORIZE_OPTIONS });
    return ok(undefined);
  } catch (error) {
    return failWithDetail('IO_ERROR', MSG.vectorize.convertFailed, `vtracer:${String(error)}`);
  }
}
