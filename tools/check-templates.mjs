#!/usr/bin/env node
/**
 * 【范本】范本自检
 * 双向校验 docs/GOVERNANCE.md 第 4.1 节的范本清单：
 *   1. 清单里的文件存在，且前 30 行有【范本】标记
 *   2. 带【范本】标记的文件，必须在清单里登记
 * 防止文档与代码漂移，也防止乱标范本。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const govPath = join(root, 'docs', 'GOVERNANCE.md');

if (!existsSync(govPath)) {
  console.error('找不到 docs/GOVERNANCE.md');
  process.exit(1);
}

const md = readFileSync(govPath, 'utf8');
const start = md.indexOf('### 4.1');
const end = md.indexOf('### 4.2');
if (start < 0 || end < 0) {
  console.error('GOVERNANCE.md 缺少 4.1 范本清单章节');
  process.exit(1);
}

const section = md.slice(start, end);
const declared = [...new Set([...section.matchAll(/`((?:src|tools)\/[^`]+)`/g)].map((m) => m[1]))];

if (!declared.length) {
  console.error('4.1 范本清单为空');
  process.exit(1);
}

/* ---------- 方向一：清单 → 文件 ---------- */

const problems = [];

for (const rel of declared) {
  const full = join(root, rel);
  if (!existsSync(full)) {
    problems.push(`清单登记但文件不存在: ${rel}`);
    continue;
  }
  const head = readFileSync(full, 'utf8').split('\n').slice(0, 30).join('\n');
  if (!head.includes('【范本】')) {
    problems.push(`清单登记但缺少【范本】标记: ${rel}`);
  }
}

/* ---------- 方向二：文件 → 清单 ---------- */

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      out.push(...walk(full));
    } else if (/\.(ts|tsx|md|mjs|css)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const scanned = [...walk(join(root, 'src')), ...walk(join(root, 'tools'))]
  .filter((full) => {
    const head = readFileSync(full, 'utf8').split('\n').slice(0, 30).join('\n');
    return head.includes('【范本】');
  })
  .map((full) => relative(root, full).replace(/\\/g, '/'));

for (const rel of scanned) {
  if (!declared.includes(rel)) {
    problems.push(`标了【范本】但未登记到 4.1 清单: ${rel}`);
  }
}

if (problems.length) {
  console.error('范本自检失败:');
  for (const problem of problems) console.error('  -', problem);
  process.exit(1);
}

console.log(`范本自检通过：清单 ${declared.length} 个，标记文件 ${scanned.length} 个，双向一致`);
