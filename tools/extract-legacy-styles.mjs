#!/usr/bin/env node
/**
 * 把原版 psz-panel-v4 的样式产物（app.css）全量提取成 HTML。
 * 分组按原版自己的类名前缀，不映射到本仓组件。
 * 默认 dry（只打印统计），--write 才生成 docs/legacy-styles.html。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const LEGACY =
  process.argv.find((a) => a.startsWith('--src='))?.slice(6) ??
  'C:/Users/xinye/Downloads/稿定设计助理-本地模式/源码工程/psz-panel-v4/原始产物/css/app.bf68b505.css';
const WRITE = process.argv.includes('--write');
const OUT = join(ROOT, 'docs/legacy-styles.html');

if (!existsSync(LEGACY)) {
  console.error('原版 CSS 不存在:', LEGACY);
  process.exit(1);
}

const raw = readFileSync(LEGACY, 'utf8');

function parseRules(text) {
  const rules = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m = re.exec(text);
  while (m) {
    const sel = m[1].replace(/\s+/g, ' ').trim();
    const body = m[2].trim();
    if (sel && !sel.startsWith('@') && body) rules.push({ sel, body });
    m = re.exec(text);
  }
  return rules;
}

const GENERIC = /^(icon|line|item|content|wrap|list|text|btn|box|name|value|title|body|head|main|inner|arrow|dot|tag|label|input|select|menu|panel|block|open|context|set)$/;

function groupKey(sel) {
  const first = sel.match(/\.([a-zA-Z][a-zA-Z0-9_-]*)/);
  if (!first) return '元素选择器';
  const name = first[1];
  const base = name.split('__')[0].split('--')[0];
  if (GENERIC.test(base)) return '通用：' + base;
  const segs = base.split(/[-_]/).filter(Boolean);
  return segs.slice(0, 2).join('-');
}

const rules = parseRules(raw);
const groups = new Map();
for (const r of rules) {
  const k = groupKey(r.sel);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}

const BIG = 10;
const big = [...groups.entries()].filter(([, v]) => v.length >= BIG).sort((a, b) => b[1].length - a[1].length);
const rest = [...groups.entries()].filter(([, v]) => v.length < BIG).sort((a, b) => a[0].localeCompare(b[0]));
const restCount = rest.reduce((n, [, v]) => n + v.length, 0);

const classCount = new Set([...raw.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)].map((m) => m[1])).size;
const colorCount = (raw.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) || []).length;

console.log(`规则 ${rules.length} 条 · 类名 ${classCount} 个 · 色值 ${colorCount} 处`);
console.log(`大组（>=${BIG} 条）${big.length} 个，覆盖 ${rules.length - restCount} 条；其余 ${rest.length} 组 ${restCount} 条`);
for (const [k, v] of big.slice(0, 15)) console.log(`  ${k}: ${v.length}`);

if (!WRITE) {
  console.log('\n[dry] 加 --write 才生成 docs/legacy-styles.html');
  process.exit(0);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const decls = (body) => body.split(';').map((d) => d.trim()).filter(Boolean);
const row = (r) => {
  const body = decls(r.body)
    .map((d) => {
      const i = d.indexOf(':');
      if (i < 0) return esc(d);
      return `<span class="k">${esc(d.slice(0, i).trim())}</span>${esc(d.slice(i + 1).trim())}`;
    })
    .join('<br>');
  return `<tr><td class="sel"><code>${esc(r.sel)}</code></td><td class="d">${body}</td></tr>`;
};

const parts = [];
parts.push(`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>原版 psz-panel-v4 · 样式全量提取</title>
<style>
  :root{--ink:#1a1a1a;--muted:#6b6b6b;--line:#d8d8d8;--soft:#f5f5f5}
  *{box-sizing:border-box}
  body{margin:0;padding:28px 34px 60px;font:13px/1.65 system-ui,"Microsoft Yahei",sans-serif;color:var(--ink);max-width:1280px}
  h1{font-size:21px;margin:0 0 4px}
  h2{font-size:15px;margin:30px 0 8px;padding-bottom:5px;border-bottom:1px solid var(--line)}
  h3{font-size:12.5px;margin:16px 0 4px;color:#333}
  .lead{color:var(--muted);margin:0 0 6px;font-weight:400}
  .stats{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
  .stat{border:1px solid var(--line);border-radius:5px;padding:8px 12px;min-width:104px}
  .stat b{display:block;font-size:18px}
  .stat span{color:var(--muted);font-size:11px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin:4px 0 0}
  th,td{text-align:left;padding:5px 8px;border-bottom:1px solid var(--line);vertical-align:top}
  th{background:var(--soft);white-space:nowrap}
  code{font:11px/1.5 ui-monospace,Consolas,monospace}
  td.sel{width:38%;word-break:break-all}
  .k{display:inline-block;min-width:104px;color:#555}
  .toc{columns:3;font-size:12px;margin:8px 0 0}
  .toc a{color:#0b57d0;text-decoration:none}
</style></head><body>
<h1>原版 psz-panel-v4 · 样式全量提取</h1>
<p class="lead">来源 <code>原始产物/css/app.bf68b505.css</code>（Vue 打包产物）。按原版自己的类名前缀分组，未改名、未合并、未筛选。</p>
<div class="stats">
  <div class="stat"><b>${rules.length}</b><span>规则</span></div>
  <div class="stat"><b>${classCount}</b><span>类名</span></div>
  <div class="stat"><b>${colorCount}</b><span>色值</span></div>
  <div class="stat"><b>${big.length}</b><span>大组</span></div>
  <div class="stat"><b>${rest.length}</b><span>其余组</span></div>
  <div class="stat"><b>${Math.round(raw.length / 1024)}</b><span>KB 原文</span></div>
</div>
<h2>分组索引</h2>
<div class="toc">
${big.map(([k, v]) => `<a href="#g-${encodeURIComponent(k)}">${esc(k)}</a>（${v.length}）`).join('<br>')}
<br><a href="#rest">其余模块</a>（${rest.length} 组 / ${restCount} 条）
</div>
`);

for (const [key, list] of big) {
  parts.push(`<h2 id="g-${encodeURIComponent(key)}">${esc(key)} <span class="lead">（${list.length} 条）</span></h2>`);
  parts.push('<table><tr><th>选择器</th><th>声明</th></tr>');
  for (const r of list) parts.push(row(r));
  parts.push('</table>');
}

parts.push(`<h2 id="rest">其余模块 <span class="lead">（${rest.length} 组 / ${restCount} 条，每组 &lt; ${BIG} 条）</span></h2>`);
for (const [key, list] of rest) {
  parts.push(`<h3>${esc(key)} <span class="lead">（${list.length}）</span></h3>`);
  parts.push('<table><tr><th>选择器</th><th>声明</th></tr>');
  for (const r of list) parts.push(row(r));
  parts.push('</table>');
}

parts.push(
  `<p class="lead" style="margin-top:30px">共 ${big.length + 1} 节 · ${rules.length} 条规则 · 提取脚本 <code>tools/extract-legacy-styles.mjs</code></p></body></html>`
);

const html = parts.join('\n');
writeFileSync(OUT, html, 'utf8');
console.log(`\n已生成 ${OUT} · ${Math.round(Buffer.byteLength(html) / 1024)} KB`);
