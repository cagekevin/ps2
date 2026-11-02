# vtracer 补丁说明（本仓对 vendor 的唯一改动）

`public/vendor/vtracer/` 是 `vtracer` 的 npm 包（wasm-bindgen **nodejs target**）原样拷入。
我们只改了两处，升级包时必须重做（否则矢量化在 CEP 里必然失败）。

## 改了什么

| 文件 | 改动 | 为什么 |
|---|---|---|
| `pkg/vtracer_wasm.js` | 生成代码末尾的 `new WebAssembly.Module(bytes)`（同步编译）→ 导出 `__wbg_init()`，内部用 `await WebAssembly.compile(bytes)` + `WebAssembly.instantiate` | Chromium **主线程禁止对 >4KB 的 buffer 同步编译**（CEP 面板就在主线程）。真机 2026-11-02 报：`WebAssembly.Compile is disallowed on the main thread, if the buffer size is larger than 4KB.` |
| `index.js` | 导出 `init()`（幂等，转调 `__wbg_init`）；**删掉 `convertFileSync`** | 同步版在 CEP 里必失败，留着就是第二种写法。调用方一律 `await init()` → `await convertFile(...)` |

## 调用方式

```js
const vtracer = require('<扩展目录>/dist/vendor/vtracer/index.js');
await vtracer.init();
await vtracer.convertFile(inputPng, outputSvg, options);
```

唯一调用方：`src/core/vectorize/vtracer.ts`（`load()` 里 await 一次，之后复用缓存）。

## 不这么改的后果

不 await `init()` 直接调 `convertFile` → `wasm` 仍是 `null` → `Cannot read properties of null`。
