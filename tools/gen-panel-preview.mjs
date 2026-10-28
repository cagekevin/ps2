/**
 * 生成字体面板的「保真」HTML 原型：图标从 src/components/icons 抽真 SVG，
 * 文案/结构照 React 组件，尺寸用一套统一值。只用于对视觉，不进构建。
 *
 * 用法：node tools/gen-panel-preview.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('src/components/icons/index.tsx', 'utf8');
const icons = {};
const re = /'([a-zA-Z0-9_-]+)':\s*\{\s*viewBox:\s*'([^']+)',\s*inner:\s*"((?:[^"\\]|\\.)*)"/g;
let m;
while ((m = re.exec(src))) icons[m[1]] = { vb: m[2], inner: m[3].replace(/\\"/g, '"') };

const ic = (name, size = 20) =>
  icons[name]
    ? `<svg viewBox="${icons[name].vb}" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${icons[name].inner}</svg>`
    : `<span class="miss" title="${name}"></span>`;

const ib = (name, size = 20, cls = '') => `<button class="icon-btn ${cls}">${ic(name, size)}</button>`;
const badge = (name, size = 20) =>
  `<button class="icon-btn icon-btn--badge">${ic(name, size)}<i class="badge"></i></button>`;

const TOP1 = ['iconfanyi', 'iconchaifen', 'iconanniu'];
const TOP2 = ['iconfuzhiwenziyangshi', 'iconniantiewenziyangshi', 'icongenggaiwenbenfangxiang'];
const B1 = ['iconzuoduiqi', 'iconchuizhiduiqi', 'iconyouduiqi', 'iconchuizhijuzhongfenbu'];
const B2 = ['iconbeijingchuizhiduiqi', 'iconchuizhifenbu'];
const B3 = ['icondingbuduiqi', 'iconshuipingduiqi', 'icondibuduiqi', 'iconshuipingjuzhongfenbu'];
const B4 = ['iconbeijingshuipingduiqi-', 'iconshuipingfenbu'];
const W = [1, 2, 3, 4, 5, 6, 7].map((i) => 'iconzihaodaxiao' + i);

const css = `
  :root {
    --sp-1: 4px; --sp-2: 8px; --sp-3: 12px;
    --pad-x: 10px;
    --h: 26px; --r: 4px;
    --fs: 13px; --fs-sm: 12px; --fs-xs: 11px;
    --bg-page: #2b2b2b; --bg-panel: #363636; --bg-input: #222; --bg-btn: #535353; --bg-btn-hover: #444;
    --bg-hover: rgba(255,255,255,.08);
    --text: #d6d6d6; --text-dim: #9a9a9a;
    --line: #333;
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 20px; background: #1b1b1b; font: var(--fs)/1.4 "Microsoft YaHei UI","Segoe UI",sans-serif; color: var(--text); }
  .device { width: 280px; height: 640px; display: flex; flex-direction: column; background: var(--bg-panel); }

  /* 面板根：块间距只由 gap 给，子块不写纵向 margin */
  .panel { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: var(--sp-2); padding-top: var(--sp-2); }

  .block { padding: 0 var(--pad-x); }
  .block--full { margin: 0 calc(-1 * var(--pad-x)); padding: var(--sp-3) var(--pad-x); background: var(--bg-input); }

  .select, .input { display: flex; align-items: center; gap: var(--sp-1); height: var(--h); padding: 0 var(--sp-2); border: 0; border-radius: var(--r); background: var(--bg-input); font-size: var(--fs); }
  .select { justify-content: space-between; cursor: pointer; }
  .select__label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .input { flex: 1; min-width: 0; }
  .input input { flex: 1; min-width: 0; border: 0; background: transparent; color: inherit; font: inherit; outline: none; }

  .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: var(--h); height: var(--h); flex: 0 0 auto; padding: 0; border: 0; border-radius: var(--r); background: transparent; color: var(--text); cursor: pointer; }
  .icon-btn:hover { background: var(--bg-hover); }
  .icon-btn--on { background: rgba(255,255,255,.12); }
  .icon-btn--badge { position: relative; }
  .badge { position: absolute; right: 3px; top: 3px; width: 4px; height: 4px; border-radius: 50%; background: var(--text-dim); }
  .miss { display: inline-block; width: 20px; height: 20px; background: #666; }

  .btn { height: var(--h); padding: 0 var(--sp-3); border: 0; border-radius: var(--r); background: var(--bg-btn); font-size: var(--fs); cursor: pointer; }
  .btn:hover { background: var(--bg-btn-hover); }

  .row { display: flex; align-items: center; gap: var(--sp-2); }
  .row + .row { margin-top: var(--sp-2); }
  .row--split > * { flex: 1; min-width: 0; }
  .label { flex: 0 0 auto; font-size: var(--fs-sm); color: var(--text-dim); }
  .line { height: 1px; margin: 0 calc(-1 * var(--pad-x)); background: var(--line); border: 0; }
  .divider-v { width: 1px; height: 13px; background: var(--line); flex: 0 0 auto; }
  .tools { display: flex; align-items: center; justify-content: space-between; }
  .grid-6 { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: var(--sp-2); }
  .grid-8 { display: grid; grid-template-columns: repeat(8, minmax(0,1fr)); gap: var(--sp-2); }
  .grid-6 .btn, .grid-8 .btn { padding: 0; }
  .swatch { width: 60px; height: var(--h); flex: 0 0 auto; border: 0; border-radius: var(--r); background: #d8d8d8; cursor: pointer; }
  .check { display: inline-flex; align-items: center; gap: var(--sp-1); font-size: var(--fs); }
  .check i { width: 12px; height: 12px; flex: 0 0 auto; border: 1px solid #6e6e6e; border-radius: 50%; }
  .check--box i { border-radius: 2px; }
  .check--on i { border-color: #3b82f6; box-shadow: inset 0 0 0 3px #3b82f6; }

  .footer { flex: 0 0 var(--h); display: flex; align-items: center; justify-content: flex-end; padding: 0 var(--pad-x); background: var(--bg-page); }
`;

const body = `
<div class="device">
  <div class="panel">

    <div class="block">
      <div class="select"><span class="select__label">思源黑体 CN</span>${ic('iconxiala', 12)}</div>
      <div class="row" style="gap:var(--sp-1);margin-top:var(--sp-2)">
        ${W.map((n) => ib(n, 20)).join('')}
      </div>
    </div>

    <div class="block">
      <div class="row row--split">
        <label class="input"><input value="46.79" /></label>
        <label class="input"><input value="55.2" /></label>
      </div>
      <div class="row row--split">
        <label class="input"><input value="0" /></label>
        <span class="check"><i></i>文字视觉调整</span>
      </div>
      <div class="row">
        <button class="swatch"></button>
        ${ib('iconzihaodaxiao7', 20)}
        ${ib('iconqingxie', 20)}
        ${ib('iconquanbudaxie', 20)}
      </div>
      <div class="row">
        ${ib('iconzuoduiqi', 20)}
        ${ib('iconchuizhiduiqi', 20)}
        ${ib('iconyouduiqi', 20)}
        ${ib('iconchuizhijuzhongfenbu', 20)}
      </div>
    </div>

    <hr class="line" />

    <div class="block">
      <div class="tools">
        ${badge(TOP1[0])}${badge(TOP1[1])}${badge(TOP1[2])}
        <span class="divider-v"></span>
        ${ib(TOP2[0])}${badge(TOP2[1])}${ib(TOP2[2])}
      </div>
    </div>

    <div class="block--full" style="display:flex;flex-direction:column;gap:var(--sp-2)">
      <div class="row" style="justify-content:space-between">
        <span class="check"><i></i>圆角</span>
        <span class="check check--on"><i></i>直角</span>
        <span class="check check--box"><i></i>线框</span>
      </div>
      <div class="row">
        <span class="label">自定义边距</span>
        <label class="input"><input value="28,12" /></label>
      </div>
      <div class="row">
        <span class="label">预设</span>
        <button class="btn">10,5</button><button class="btn">28,12</button><button class="btn">15=3:1</button>
      </div>
      <div class="grid-8">
        ${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<button class="btn">${n}</button>`).join('')}
      </div>
    </div>

    <div class="block">
      <div class="tools">
        ${B1.map((n) => ib(n, 20)).join('')}
        <span class="divider-v"></span>
        ${B2.map((n) => ib(n, 20)).join('')}
      </div>
    </div>
    <div class="block">
      <div class="tools">
        ${B3.map((n) => ib(n, 20)).join('')}
        <span class="divider-v"></span>
        ${B4.map((n) => ib(n, 20)).join('')}
      </div>
    </div>

    <hr class="line" />

    <div class="block">
      <div class="row">
        <div class="select" style="flex:1"><span class="select__label">常规</span>${ic('iconxiala', 12)}</div>
        ${ib('iconshuru', 14)}${ib('iconshanchu', 14)}${ib('iconchangguicengjiyushe', 14)}
      </div>
      <div class="grid-6" style="margin-top:var(--sp-2)">
        ${[6, 8, 10, 11, 12, 14].map((n) => `<button class="btn">${n}</button>`).join('')}
      </div>
    </div>

  </div>

  <div class="footer">
    ${ib('iconxianshi', 20)}${ib('iconzihaodaxiao1', 20)}
  </div>
</div>`;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>字体面板 · 保真原型</title>
<style>${css}</style>
</head>
<body>${body}
</body>
</html>`;

writeFileSync('docs/preview/font-panel-faithful.html', html, 'utf8');
console.log('icons parsed:', Object.keys(icons).length);
console.log('written bytes:', Buffer.byteLength(html));
