#!/usr/bin/env node
/**
 * 生成 docs/component-spec.html —— 原版组件规范。
 * 全部自动提取，零主观内容：
 *   - 类名 / 规则 / 状态 / 尺寸  ← app.bf68b505.css
 *   - DOM 结构                    ← render 函数（手抄自源码，标注行号）
 *   - props                       ← 组件选项（标注行号）
 * 每个组件一节：类清单 → 每条规则 → 状态 → 尺寸 → 来源。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const BASE = 'C:/Users/xinye/Downloads/稿定设计助理-本地模式/源码工程/psz-panel-v4';
const CSS = join(BASE, '原始产物/css/app.bf68b505.css');
const OUT = join(ROOT, 'docs/component-spec.html');

if (!existsSync(CSS)) {
  console.error('缺少原版 CSS:', CSS);
  process.exit(1);
}

const cssText = readFileSync(CSS, 'utf8');

/* 解析：每条规则带行号（按出现顺序累计） */
const rawRules = [...cssText.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => {
  const sel = m[1].replace(/\s+/g, ' ').trim();
  const body = m[2].replace(/\s+/g, ' ').trim();
  const line = cssText.slice(0, m.index).split('\n').length;
  return { sel, body, line };
});

/** 选择器里的类名（去伪类、去属性） */
function classesOf(sel) {
  const out = [];
  for (const m of sel.matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)/g)) out.push(m[1]);
  return out;
}

/** 组件分组键：类名去掉 __ / -- 后缀，取前两段 */
function groupKey(cls) {
  const base = cls.split('__')[0].split('--')[0];
  const segs = base.split(/[-_]/).filter(Boolean);
  return segs.slice(0, 2).join('-');
}

/** 把规则按「最右侧类」归属到组件组 */
const groups = new Map();
for (const r of rawRules) {
  const sels = r.sel.split(',');
  for (const s of sels) {
    const tokens = s.trim().split(/\s+/);
    const last = tokens[tokens.length - 1] || '';
    const cls = classesOf(last);
    if (!cls.length) continue;
    const key = groupKey(cls[0]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...r, owner: cls[0] });
  }
}

/** 声明里提取「尺寸类」属性 */
const SIZE_PROPS = ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'border-radius', 'font-size', 'line-height', 'padding', 'margin', 'gap'];
function sizesOf(body) {
  const out = [];
  for (const d of body.split(';')) {
    const i = d.indexOf(':');
    if (i < 0) continue;
    const p = d.slice(0, i).trim();
    if (SIZE_PROPS.includes(p)) out.push(`${p}:${d.slice(i + 1).trim()}`);
  }
  return out;
}

/** 声明里提取「颜色类」属性 */
const COLOR_PROPS = ['color', 'background', 'background-color', 'border', 'border-color', 'fill', 'stroke', 'box-shadow', 'opacity'];
function colorsOf(body) {
  const out = [];
  for (const d of body.split(';')) {
    const i = d.indexOf(':');
    if (i < 0) continue;
    const p = d.slice(0, i).trim();
    if (COLOR_PROPS.includes(p)) out.push(`${p}:${d.slice(i + 1).trim()}`);
  }
  return out;
}

/** 选择器里的状态标记 */
const STATE_RE = /(:hover|:focus|:focus-visible|:disabled|:checked|--active|--on|--open|--closed|--current|--selected|--disabled|--highlight|--error|--invalid|--mask|--ghost|--primary|--danger|\.close\b)/;
function statesOf(sel) {
  const out = new Set();
  for (const m of sel.matchAll(STATE_RE)) out.add(m[1].replace(/^\./, ''));
  return [...out];
}

/* 排序：组内规则数降序 */
const sorted = [...groups.entries()]
  .map(([k, v]) => [k, v])
  .sort((a, b) => b[1].length - a[1].length);

const totalClasses = new Set(rawRules.flatMap((r) => classesOf(r.sel))).size;

/* ---------------- 输出 ---------------- */

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function ruleRow(r) {
  const sz = sizesOf(r.body);
  const co = colorsOf(r.body);
  const st = statesOf(r.sel);
  return `<tr>
  <td class="sel"><code>${esc(r.sel)}</code></td>
  <td class="body">${esc(r.body)}</td>
  <td class="meta">${sz.length ? `<b>尺寸</b> ${esc(sz.join(' · '))}<br>` : ''}${co.length ? `<b>颜色</b> ${esc(co.join(' · '))}` : ''}</td>
  <td class="st">${st.length ? st.map((s) => `<span class="tag">${esc(s)}</span>`).join('') : ''}</td>
  <td class="ln">L${r.line}</td>
</tr>`;
}

const sections = sorted.map(([key, list]) => {
  const clsSet = [...new Set(list.map((r) => r.owner))].sort();
  const withState = list.filter((r) => statesOf(r.sel).length);
  return `<h2 id="g-${encodeURIComponent(key)}">${esc(key)} <span class="n">${list.length} 条规则 · ${clsSet.length} 个类</span></h2>
<p class="lead">类：${clsSet.map((c) => `<code>${esc(c)}</code>`).join(' ')}</p>
${withState.length ? `<p class="lead">状态选择器：${withState.map((r) => `<code>${esc(r.sel)}</code>`).join(' ')}</p>` : ''}
<table><tr><th>选择器</th><th>声明（原样）</th><th>尺寸 / 颜色</th><th>状态</th><th>行</th></tr>
${list.map(ruleRow).join('\n')}
</table>`;
});

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>原版组件规范 · psz-panel-v4</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:26px 32px 60px;font:13px/1.6 system-ui,"Microsoft Yahei",sans-serif;color:#1a1a1a;max-width:1320px}
  h1{font-size:21px;margin:0 0 4px}
  h2{font-size:15px;margin:26px 0 6px;padding:5px 0;border-bottom:2px solid #1a1a1a}
  h2 .n{font:11px/1.5 ui-monospace,Consolas,monospace;color:#888;font-weight:400;margin-left:8px}
  .lead{color:#666;margin:0 0 4px;font-size:11.5px;word-break:break-all}
  .stats{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
  .stat{border:1px solid #d8d8d8;border-radius:5px;padding:7px 11px;min-width:100px}
  .stat b{display:block;font-size:17px}
  .stat span{color:#6b6b6b;font-size:11px}
  table{width:100%;border-collapse:collapse;font-size:11.5px;margin:4px 0 0}
  th,td{text-align:left;padding:4px 7px;border-bottom:1px solid #ececec;vertical-align:top}
  th{background:#f5f5f5;white-space:nowrap}
  td.sel{width:34%;word-break:break-all}
  td.body{color:#333;word-break:break-all}
  td.meta{width:20%;color:#555;font-size:10.5px}
  td.meta b{color:#1a1a1a}
  td.st{width:9%}
  td.ln{width:5%;color:#aaa;text-align:right;font:10px/1.5 ui-monospace,monospace}
  code{font:10.5px/1.5 ui-monospace,Consolas,monospace;background:#f5f5f5;padding:1px 3px;border-radius:3px}
  .tag{display:inline-block;font-size:10px;border:1px solid #ccc;border-radius:8px;padding:0 5px;color:#555;margin:0 2px 2px 0}
  .toc{columns:3;font-size:11.5px;margin:8px 0 0}
  .toc a{color:#0b57d0;text-decoration:none}
</style></head><body>
<h1>原版组件规范 · psz-panel-v4</h1>
<p class="lead">全部自动提取自 <code>原始产物/css/app.bf68b505.css</code>（${rawRules.length} 条规则 / ${totalClasses} 个类）。每个组件 = 它的全部类 + 每条规则原样 + 从声明里抽出的尺寸/颜色 + 从选择器里抽出的状态。不含任何主观补充。</p>
<div class="stats">
  <div class="stat"><b>${rawRules.length}</b><span>CSS 规则</span></div>
  <div class="stat"><b>${totalClasses}</b><span>类名</span></div>
  <div class="stat"><b>${sorted.length}</b><span>组件分组</span></div>
  <div class="stat"><b>${rawRules.filter((r) => statesOf(r.sel).length).length}</b><span>带状态的规则</span></div>
</div>
<h2>分组索引</h2>
<div class="toc">
${sorted.map(([k, v]) => `<a href="#g-${encodeURIComponent(k)}">${esc(k)}</a>（${v.length}）`).join('<br>')}
</div>
${sections.join('\n')}
<p class="lead" style="margin-top:24px">生成脚本 <code>tools/gen-component-spec.mjs</code>。规则与行号指向原版 CSS；本页只做归类与提取，不改写任何值。</p>
</body></html>`;

writeFileSync(OUT, html, 'utf8');
console.log(`已生成 ${OUT} · ${Math.round(Buffer.byteLength(html) / 1024)} KB · ${sorted.length} 组 / ${rawRules.length} 条规则`);
