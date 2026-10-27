import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * 目标环境：CEP 12（Chromium 103）。
 * file:// 加载，base 必须用相对路径。
 */
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'chrome103',
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        /* 带 hash，部署后 CEP 不会读到旧缓存 */
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    }
  },
  server: {
    port: 5173
  }
});
