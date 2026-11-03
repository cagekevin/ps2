#!/usr/bin/env node
/**
 * jsxbin → jsx/vendor.jsx（一条命令）
 *
 * 做的事：抽 jsxbin（明文或 base64 外壳）→ 调 converter 解码 → 加文件头 → 写 jsx/vendor.jsx → 校验。
 * 校验三条，任一不过就 exit 1：
 *   1. 能编译（`new Function`）：解码器补丁没打全时产物连语法都过不了
 *   2. `VENDOR_FUNCS` 里每个名字都有 `function` 声明
 *   3. 产物是 UTF-8 带 BOM + 纯 CRLF（ExtendScript 读中文靠 BOM，混换行会让 diff 全是噪声）
 *
 * 用法：node tools/jsxbin/decode.mjs <jsxbin|.svg|.js>
 *   converter 的 exe 不存在时会先自动跑 `build.mjs` 编译。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const outPath = join(root, 'jsx', 'vendor.jsx');
const initPath = join(root, 'src', 'core', 'ps', 'init.ts');
const exePath = join(import.meta.dirname, 'converter', 'jsxbin_to_jsx.exe');

/* 文件头随产物一起写：说明来历、唯一入口与禁止项。改这里等于改 jsx/vendor.jsx 的开头 12 行 */
const HEADER = `/*
 * 官方「稿定设计助理」PS 侧脚本（第三方代码，仅本地自用，不得分发）。
 *
 * 是什么：官方 jsxbin（@JSXBIN@ES@2.0@…，338,105 字节）的解码源码，由打过补丁的
 * jsxbin_to_jsx.exe 一次解出，没有手工改动。补了什么、怎么重新解码见同目录 vendor.README.md。
 *
 * 唯一入口：core/ps/init.ts 的 loadJsx('jsx/vendor.jsx')，即 $.evalFile 顶层执行 ——
 * 函数声明落在全局作用域。包进 IIFE 会随函数返回销毁，所有 ys_* / zt_* 都变 undefined。
 *
 * 禁止：重排 / 美化 / 改函数名 / 删「看起来没用到」的函数。需要哪些函数由 core/ps/init.ts
 * 的 VENDOR_FUNCS 决定，不在这里删。
 */

`;

const input = process.argv[2];
if (!input) {
  console.error('用法：node tools/jsxbin/decode.mjs <jsxbin|.svg|.js>');
  process.exit(1);
}

/* 输入有两种壳：直接是 @JSXBIN@ 明文，或 base64 包在 .svg / .js 里 */
function extractJsxbin(buffer) {
  if (buffer.subarray(0, 8).toString('latin1') === '@JSXBIN@') return buffer;
  const text = buffer
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^\uFEFF/, '');
  if (text.startsWith('@JSXBIN@')) return Buffer.from(text, 'latin1');
  return Buffer.from(text.replace(/[^A-Za-z0-9+/=]/g, ''), 'base64');
}

const jsxbin = extractJsxbin(readFileSync(resolve(input)));
if (jsxbin.subarray(0, 8).toString('latin1') !== '@JSXBIN@') {
  console.error('输入不是 jsxbin（既不是 @JSXBIN@ 明文，也不是能 base64 出它的壳）');
  process.exit(1);
}

if (!existsSync(exePath)) {
  console.log('converter 的 exe 不存在，先编译');
  const built = spawnSync(process.execPath, [join(import.meta.dirname, 'build.mjs')], { stdio: 'inherit' });
  if (built.status !== 0) process.exit(built.status ?? 1);
}

const work = mkdtempSync(join(tmpdir(), 'jsxbin-'));
const tmpBin = join(work, 'input.jsxbin');
const tmpJsx = join(work, 'output.jsx');
writeFileSync(tmpBin, jsxbin);

const decoded = spawnSync(exePath, [tmpBin, tmpJsx], { encoding: 'utf8' });
if (decoded.status !== 0 || !existsSync(tmpJsx)) {
  console.error(decoded.stdout || '');
  console.error(decoded.stderr || '');
  console.error('解码失败');
  process.exit(decoded.status ?? 1);
}

const body = readFileSync(tmpJsx, 'utf8').replace(/^\uFEFF/, '');
const output = '\uFEFF' + HEADER.replace(/\r?\n/g, '\r\n') + body;

/* ---------- 校验 ---------- */

const problems = [];

try {
  new Function(body);
} catch (error) {
  problems.push(`语法过不了：${error.message}（解码器补丁没打全？见 docs/JSXBIN-解码指南.md §3）`);
}

const declCount = new Set([...body.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1])).size;

const init = readFileSync(initPath, 'utf8');
const block = init.match(/export const VENDOR_FUNCS = \[([\s\S]*?)\] as const/);
if (!block) {
  problems.push('读不到 src/core/ps/init.ts 的 VENDOR_FUNCS');
} else {
  /* 清单里夹着注释（例如 `Tool_set('eyedropperTool')`），先剥掉再取名字 */
  const names = [...block[1].replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const missing = names.filter((name) => !new RegExp(`function\\s+${name}\\s*\\(`).test(body));
  if (missing.length > 0) problems.push(`VENDOR_FUNCS 里这些名字没有 function 声明：${missing.join(', ')}`);
  console.log(`清单 ${names.length} 项 / 声明 ${declCount} 个`);
}

if (output.includes('\n') && /[^\r]\n/.test(output)) problems.push('产物里混了 LF（应为纯 CRLF）');

if (problems.length > 0) {
  for (const line of problems) console.error(`✗ ${line}`);
  process.exit(1);
}

writeFileSync(outPath, output, 'utf8');
console.log(`✓ 写入 ${outPath}`);
console.log(`  jsxbin ${jsxbin.length} 字节 → 产物 ${Buffer.byteLength(output, 'utf8')} 字节 / ${declCount} 个 function`);
