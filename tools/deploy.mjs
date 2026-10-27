#!/usr/bin/env node
/**
 * 部署到 CEP 扩展目录
 * 用法：npm run deploy
 * 唯一发布入口：先删后复制，杜绝嵌套和残留。
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const manifestPath = join(root, 'CSXS', 'manifest.xml');
if (!existsSync(manifestPath)) {
  console.error('找不到 CSXS/manifest.xml');
  process.exit(1);
}

const manifest = readFileSync(manifestPath, 'utf8');
const bundleId = /ExtensionBundleId="([^"]+)"/.exec(manifest)?.[1];
const menu = /<Menu>([^<]+)<\/Menu>/.exec(manifest)?.[1];
if (!bundleId) {
  console.error('manifest 缺少 ExtensionBundleId');
  process.exit(1);
}

const CEP_DIRS = {
  win32: join(homedir(), 'AppData', 'Roaming', 'Adobe', 'CEP', 'extensions'),
  darwin: join(homedir(), 'Library', 'Application Support', 'Adobe', 'CEP', 'extensions')
};

const cepDir = CEP_DIRS[platform()];
if (!cepDir) {
  console.error(`不支持的平台: ${platform()}`);
  process.exit(1);
}

const target = join(cepDir, bundleId);

if (!existsSync(join(root, 'dist', 'index.html'))) {
  console.error('dist 不存在，请先 npm run build');
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

for (const dir of ['CSXS', 'dist', 'jsx']) {
  cpSync(join(root, dir), join(target, dir), { recursive: true });
}

/* 校验：缺文件或出现嵌套目录直接失败 */
const required = ['CSXS/manifest.xml', 'dist/index.html', 'jsx/main.jsx'];
const missing = required.filter((file) => !existsSync(join(target, file)));
if (missing.length) {
  console.error('部署失败，缺少:', missing.join(', '));
  process.exit(1);
}

if (existsSync(join(target, 'jsx', 'jsx'))) {
  console.error('部署失败：jsx 目录出现嵌套');
  process.exit(1);
}

function countFiles(dir) {
  return readdirSync(dir).reduce((total, name) => {
    const full = join(dir, name);
    return total + (statSync(full).isDirectory() ? countFiles(full) : 1);
  }, 0);
}

console.log(`已部署: ${bundleId}${menu ? `（${menu}）` : ''}`);
console.log(`目标: ${target}`);
console.log(`文件: ${countFiles(target)} 个`);
console.log('下一步: 关闭面板重新打开；若改了 manifest 需重启 Photoshop');
