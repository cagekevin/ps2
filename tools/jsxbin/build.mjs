#!/usr/bin/env node
/**
 * 编译 jsxbin 解码器：converter/ 下的 .cs → converter/jsxbin_to_jsx.exe
 *
 * 为什么自己编：上游（codecopy/jsxbin-to-jsx-converter）只给 2015 年的源码，
 * 我们在里面打了 7 条补丁（`docs/JSXBIN-解码指南.md` §3），只有从源码编出来的 exe 才带补丁。
 * 本机没有 dotnet SDK，用 Windows 自带的 csc.exe（Framework 4.x）。
 *
 * 用法：node tools/jsxbin/build.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dir = resolve(import.meta.dirname, 'converter');
const exe = join(dir, 'jsxbin_to_jsx.exe');

function walk(path, out = []) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.cs')) out.push(full);
  }
  return out;
}

function findCsc() {
  const win = process.env.WINDIR ?? 'C:\\Windows';
  return [
    join(win, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
    join(win, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe')
  ].find((path) => existsSync(path));
}

const csc = findCsc();
if (!csc) {
  console.error('找不到 csc.exe：需要 .NET Framework 4.x（Windows 自带，不需要 SDK）');
  process.exit(1);
}

const files = walk(dir);
if (files.length === 0) {
  console.error(`converter 目录里没有 .cs：${dir}`);
  process.exit(1);
}

const result = spawnSync(
  csc,
  [
    '/nologo',
    '/target:exe',
    `/out:${exe}`,
    '/r:System.Xml.Linq.dll',
    '/r:System.Core.dll',
    '/r:System.dll',
    '/r:Microsoft.CSharp.dll',
    ...files
  ],
  { encoding: 'utf8' }
);

if (result.status !== 0) {
  console.error(result.stdout || '');
  console.error(result.stderr || '');
  console.error(`编译失败（exit ${result.status}）`);
  process.exit(result.status ?? 1);
}

console.log(`已编译 ${exe}（${files.length} 个 .cs）`);
