/**
 * vtracer（位图 → SVG）的唯一入口。
 *
 * 依赖以**源码形式进仓库**：`public/vendor/vtracer/`（692 KB，含 653 KB wasm），
 * 由 Vite 原样拷进 `dist/vendor/vtracer/`，所以扩展目录里一定有。
 *
 * **为什么不 import**：这是 wasm-bindgen 的 nodejs target，内部靠 `require('fs')` 和
 * `__dirname` 找 `.wasm`；经 Vite 打包后这两点都断。只能在运行时按扩展目录绝对路径 require。
 *
 * 失败不抛：认不出 / 加载不到都折成 `Result`，让命令层统一处理。
 */

import { VECTORIZE_OPTIONS } from '../../config';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import { getExtensionPath } from '../cep/bridge';
import { nodeRequire } from '../cep/node';

interface VtracerModule {
  convertFileSync(input: string, output: string, options?: Record<string, unknown>): void;
}

/** 加载过一次就记住（wasm 实例化不便宜） */
let cached: VtracerModule | null = null;

function load(): Result<VtracerModule> {
  if (cached) return ok(cached);

  const root = getExtensionPath();
  if (!root) return failWithDetail('IO_ERROR', MSG.vectorize.noEngine, 'extension:empty');

  try {
    const mod = nodeRequire<VtracerModule>(`${root}/dist/vendor/vtracer/index.js`);
    if (!mod || typeof mod.convertFileSync !== 'function') {
      return failWithDetail('IO_ERROR', MSG.vectorize.noEngine, 'vendor:shape');
    }
    cached = mod;
    return ok(mod);
  } catch (error) {
    /* 常见原因：deploy 没带 vendor、或扩展被移动后路径变了 */
    return failWithDetail('IO_ERROR', MSG.vectorize.noEngine, `vendor:${String(error)}`);
  }
}

/** 位图文件 → SVG 文件（同步；vtracer 本身是同步 API） */
export function rasterToSvg(inputPath: string, outputPath: string): Result<void> {
  const mod = load();
  if (mod.status === 'error') return mod;

  try {
    mod.value.convertFileSync(inputPath, outputPath, { ...VECTORIZE_OPTIONS });
    return ok(undefined);
  } catch (error) {
    return failWithDetail('IO_ERROR', MSG.vectorize.convertFailed, `vtracer:${String(error)}`);
  }
}
