/**
 * 把 vite dev 抓下来的真 DOM 变成静态 mockup：
 * 保留真 DOM + 真 CSS（dev 下样式是内联 <style>），去掉所有脚本。
 *
 * 用法：
 *   chrome --headless=new --virtual-time-budget=7000 --dump-dom "http://localhost:5173/#/font" > docs/preview/dom-font.html
 *   node tools/make-mockup.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const pages = [
  ['font', '字体面板'],
  ['manage', '字体管理'],
  ['common', '常用功能'],
  ['style', '样式面板'],
  ['set', '设置'],
  ['debug', '诊断']
];

const built = [];
for (const [key, title] of pages) {
  const src = `docs/preview/dom-${key}.html`;
  if (!existsSync(src)) {
    console.log('skip (缺 dump):', src);
    continue;
  }
  let html = readFileSync(src, 'utf8');
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/gi, '');
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title} · 高保真稿</title>`);
  writeFileSync(`docs/preview/mockup-${key}.html`, html, 'utf8');
  built.push([key, title]);
  console.log('written:', `docs/preview/mockup-${key}.html`, Buffer.byteLength(html), 'bytes');
}

const frames = built
  .map(
    ([key, title]) => `  <figure>
    <figcaption>${title}</figcaption>
    <iframe src="mockup-${key}.html" width="400" height="780" loading="lazy"></iframe>
  </figure>`
  )
  .join('\n');

writeFileSync(
  'docs/preview/index.html',
  `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>高保真稿 · 全部页面</title>
<style>
  body { margin: 0; padding: 20px; background: #1b1b1b; color: #d6d6d6;
         font: 13px/1.5 "Microsoft YaHei UI","Segoe UI",sans-serif; }
  h1 { font-size: 14px; font-weight: 400; margin: 0 0 4px; }
  p.note { margin: 0 0 16px; color: #9a9a9a; font-size: 12px; }
  .row { display: flex; flex-wrap: wrap; gap: 16px; }
  figure { margin: 0; }
  figcaption { font-size: 12px; color: #9a9a9a; margin-bottom: 6px; }
  iframe { border: 1px solid #333; border-radius: 4px; background: #2b2b2b; display: block; }
</style>
</head>
<body>
<h1>高保真稿 · 全部页面</h1>
<p class="note">真应用渲染后抓下来的 DOM + CSS（脚本已剥离），400×780 窗口。宽度与 PS 面板一致，内容溢出/被切会如实呈现。</p>
<div class="row">
${frames}
</div>
</body>
</html>`,
  'utf8'
);
console.log('written: docs/preview/index.html');
