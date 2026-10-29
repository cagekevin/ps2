#!/usr/bin/env node
/**
 * 生成 docs/legacy-components.html：
 * 1) 原版 171 个组件/菜单名总表（取自 app-main.COMPONENTS.md，人工命名）
 * 2) 页面级组件 → CSS 根类 → 上色预览
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const BASE = 'C:/Users/xinye/Downloads/稿定设计助理-本地模式/源码工程/psz-panel-v4';
const MD = join(BASE, 'src/entry/app-main.COMPONENTS.md');
const CSS = join(BASE, '原始产物/css/app.bf68b505.css');
const OUT = join(ROOT, 'docs/legacy-components.html');

for (const f of [MD, CSS]) {
  if (!existsSync(f)) {
    console.error('缺少输入:', f);
    process.exit(1);
  }
}

// 组件总表
const rows = readFileSync(MD, 'utf8')
  .split(/\r?\n/)
  .filter((l) => /^\|\s*.+\s*\|\s*\d+\s*\|/.test(l))
  .map((l) => {
    const p = l.split('|').map((s) => s.trim());
    return { name: p[1], line: p[2], v: p[3], range: p[4], type: p[5] };
  });

// CSS 索引
const cssText = readFileSync(CSS, 'utf8');
const styleMap = new Map();
for (const m of cssText.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const sel = m[1].replace(/\s+/g, ' ').trim();
  const cm = sel.match(/\.([a-zA-Z][a-zA-Z0-9_-]*)/);
  if (!cm) continue;
  const cls = cm[1];
  if (!styleMap.has(cls)) styleMap.set(cls, []);
  styleMap.get(cls).push({ sel, body: m[2].replace(/\s+/g, ' ').trim() });
}

// 页面级组件 → CSS 根类（人工对照，依据类名语义与原版页面）
const PAGES = [
  ['字体管理', 'font-manage', '字体列表页：搜索 / 筛选 / 标签 / 列表项 / 星级'],
  ['字体面板', 'font-manage__font-weight', '字重与字体属性面板'],
  ['字体快选', 'selectFont', '字体快选下拉'],
  ['粘贴文字属性', 'pasteFont', '粘贴属性面板'],
  ['样式面板', 'block', '样式库格子（70×44）'],
  ['颜色库', 'color-item', '色圈（14×14）与渐变条（42×22）'],
  ['常用功能', 'context-svg-wrap', '常用页功能格（50×50）'],
  ['模板库', 'template-preview', '模板预览卡'],
  ['下载任务列表', 'download-list-panel', '下载面板与进度'],
  ['翻译', 'translate-wrap', '翻译弹窗'],
  ['生成框架', 'overprint-add-wrap', '生成框架弹窗'],
  ['输入弹窗', 'input-box', '通用输入/确认弹窗'],
  ['右键菜单', 'menu', '菜单项与分隔线'],
  ['标题弹窗', 'titlePopup', '带标题的内容弹窗'],
  ['全局加载', 'global-loading', '全屏加载'],
  ['设备管理', 'device-input', '设备尺寸输入'],
  ['侧边导航', 'nav-item', '40×40 导航项'],
  ['底部条', 'bottom-nav', '26 高底栏'],
  ['搜索框', 'font-manage__search', '字体搜索框'],
  ['标签', 'font-manage__tag', '标签 chip 与弹层'],
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const KEEP = ['background', 'background-color', 'border', 'border-radius', 'width', 'height', 'color', 'font-size', 'padding', 'box-shadow', 'display', 'flex-direction', 'align-items', 'justify-content', 'gap'];

function paintOf(cls) {
  const list = styleMap.get(cls) || [];
  const out = [];
  for (const d of list) {
    for (const piece of d.body.split(';')) {
      const i = piece.indexOf(':');
      if (i < 0) continue;
      const p = piece.slice(0, i).trim();
      if (KEEP.includes(p)) out.push(`${p}:${piece.slice(i + 1).trim()}`);
    }
  }
  return out.slice(0, 14).join(';');
}

const cards = PAGES.map(([cn, cls, desc]) => {
  const paint = paintOf(cls) || 'padding:12px 16px;border:1px dashed #6b6b6b;color:#c3c3c3';
  const kids = [...styleMap.keys()].filter((k) => k.startsWith(cls + '__') || k.startsWith(cls + '-')).slice(0, 12);
  const ruleCount = (styleMap.get(cls) || []).length;
  return `<figure class="c">
  <figcaption><b>${esc(cn)}</b> <code>.${esc(cls)}</code></figcaption>
  <div class="stage"><div style="${esc(paint)}">${esc(cn)}</div></div>
  <p class="d">${esc(desc)}</p>
  <p class="k">子类 ${kids.length}${ruleCount ? ` · 根类 ${ruleCount} 条规则` : ''}${kids.length ? '：' + kids.map((k) => `<code>${esc(k.replace(cls, '~'))}</code>`).join(' ') : ''}</p>
</figure>`;
});

const table = rows.map((r) => `<tr><td>${esc(r.name)}</td><td><code>${esc(r.line)}</code></td><td><code>${esc(r.v)}</code></td><td>${esc(r.type)}</td></tr>`).join('\n');

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>原版 psz-panel-v4 · 组件清单</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:28px 34px 60px;font:13px/1.65 system-ui,"Microsoft Yahei",sans-serif;color:#1a1a1a;max-width:1320px}
  h1{font-size:21px;margin:0 0 4px}
  h2{font-size:15px;margin:30px 0 10px;padding-bottom:5px;border-bottom:1px solid #d8d8d8}
  .lead{color:#6b6b6b;margin:0 0 6px}
  .stats{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
  .stat{border:1px solid #d8d8d8;border-radius:5px;padding:8px 12px;min-width:104px}
  .stat b{display:block;font-size:18px}
  .stat span{color:#6b6b6b;font-size:11px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
  .c{border:1px solid #d8d8d8;border-radius:6px;padding:12px;margin:0}
  .c figcaption{font-size:12.5px;margin-bottom:8px}
  .stage{background:#363636;border-radius:4px;padding:16px;display:flex;align-items:center;justify-content:center;min-height:84px;overflow:hidden;font:12px/1.4 "Microsoft Yahei",sans-serif;color:#c3c3c3}
  .c .d{margin:8px 0 0;font-size:11px;color:#6b6b6b}
  .c .k{margin:4px 0 0;font-size:10.5px;color:#888;line-height:1.9;word-break:break-all}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{text-align:left;padding:4px 8px;border-bottom:1px solid #e5e5e5}
  th{background:#f5f5f5;position:sticky;top:0}
  code{font:11px/1.5 ui-monospace,Consolas,monospace}
</style></head><body>
<h1>原版 psz-panel-v4 · 组件清单</h1>
<p class="lead">组件名与行号取自原版工程自带的 <code>src/entry/app-main.COMPONENTS.md</code>（人工命名，非推测）；样式取自 <code>app.bf68b505.css</code>，预览底为原版面板 <code>#363636</code>。</p>
<div class="stats">
  <div class="stat"><b>${rows.length}</b><span>组件 / 菜单名</span></div>
  <div class="stat"><b>${rows.filter((r) => r.type === 'Vue 组件').length}</b><span>Vue 组件</span></div>
  <div class="stat"><b>${new Set(rows.map((r) => r.v)).size}</b><span>顶层变量</span></div>
  <div class="stat"><b>${PAGES.length}</b><span>页面级（有样式）</span></div>
</div>

<h2>一、页面级组件（上色预览）</h2>
<p class="lead">这 ${PAGES.length} 个是带独立样式的页面 / 面板 / 弹窗，预览按各自根类的真实 CSS 上色。</p>
<div class="grid">
${cards.join('\n')}
</div>

<h2>二、全部 ${rows.length} 个组件 / 菜单名</h2>
<p class="lead">行号可直接跳 <code>src/entry/app-main.js</code> 对应代码块；变量是该组件所在的顶层 <code>var</code>。</p>
<table>
<tr><th>名称</th><th>行号</th><th>变量</th><th>类型</th></tr>
${table}
</table>
<p class="lead" style="margin-top:24px">完整样式规则见 <code>docs/legacy-styles.html</code>（2477 条，按原版前缀分组）。生成脚本 <code>tools/gen-legacy-components.mjs</code>。</p>
</body></html>`;

writeFileSync(OUT, html, 'utf8');
console.log(`已生成 ${OUT} · ${Math.round(Buffer.byteLength(html) / 1024)} KB · 组件 ${rows.length} 条 · 页面级 ${PAGES.length} 个`);
