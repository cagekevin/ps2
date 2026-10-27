/// <reference types="vite/client" />

/**
 * Vite 客户端类型（`import.meta.env.DEV` 等）。
 *
 * 项目原本没有这个声明文件，`import.meta.env` 编译不过；
 * 目前只有 `main.tsx` 的开发态注入会用到它（`dev/preview.ts`）。
 */
