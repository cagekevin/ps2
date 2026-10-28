/**
 * 系统性重设计的高保真稿生成器。
 *
 * 规则先写在 CSS 里（只有一套值），页面按规则组装；图标取自 src/components/icons 的真 SVG，
 * 文案取自真实组件/常量。输出静态 HTML，可直接看、可直接发给别人。
 *
 * 用法：node tools/gen-redesign.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

/* ---------- 真图标 ---------- */
const iconSrc = readFileSync('src/components/icons/index.tsx', 'utf8');
const ICONS = {};
const re = /'([a-zA-Z0-9_-]+)':\s*\{\s*viewBox:\s*'([^']+)',\s*inner:\s*"((?:[^"\\]|\\.)*)"/g;
let m;
while ((m = re.exec(iconSrc))) ICONS[m[1]] = { vb: m[2], inner: m[3].replace(/\\"/g, '"') };

const ic = (name, size = 18) =>
  ICONS[name]
    ? `<svg viewBox="${ICONS[name].vb}" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${ICONS[name].inner}</svg>`
    : `<span class="missing" title="${name}"></span>`;

/* ---------- 设计系统 ---------- */
const CSS = `
:root{
  /* 间距：4 / 8 / 12 / 16，只有这四档 */
  --s1:4px; --s2:8px; --s3:12px; --s4:16px;
  /* 页面左右内边距：全站唯一 */
  --pad:12px;

  /* 控件：高 26、圆角 4、图标 18 */
  --h:26px; --r:4px; --icon:18px;
  --h-header:40px; --h-bar:28px; --h-row:22px;

  /* 字号：13 正文 / 12 次要 / 11 元信息 */
  --fs:13px; --fs2:12px; --fs3:11px;

  /* 表面：页面 → 面板 → 凹陷 → 按钮，四层 */
  --bg-page:#2b2b2b;
  --bg-panel:#363636;
  --bg-sunken:#222;
  --bg-btn:#4a4a4a;
  --bg-btn-hover:#555;
  --bg-tile:#494949;

  /* 交互 */
  --hover:rgba(255,255,255,.08);
  --on:rgba(255,255,255,.14);
  --accent:#3b82f6;
  --danger:#e05c5c;

  /* 文字：三级 */
  --t1:#d6d6d6; --t2:#9a9a9a; --t3:#6f6f6f;

  /* 线条：区块 #333 / 列表行 #2e2e2e，只此两种 */
  --line:#333; --line-row:#2e2e2e;
}

*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;background:#1b1b1b;color:var(--t1);
  font:var(--fs)/1.5 "Microsoft YaHei UI","Segoe UI",sans-serif;
  display:flex;align-items:flex-start;justify-content:center;padding:16px;
}
/* 固定面板框：稿子在任何窗口里都是同一个宽度 */
.shell{width:360px;height:720px}
button,input{font:inherit;color:inherit}
svg{display:block;flex:0 0 auto}
.missing{width:18px;height:18px;background:#666;border-radius:2px;display:inline-block}

/* ---------- 外壳：左导航 + 内容 ---------- */
.shell{display:flex;width:100%;height:100%;background:var(--bg-page)}
.nav{
  flex:0 0 48px;display:flex;flex-direction:column;align-items:center;
  gap:2px;padding:6px 0;background:var(--bg-page);border-right:1px solid var(--line);
}
.nav__btn{
  width:34px;height:34px;display:flex;align-items:center;justify-content:center;
  border:0;border-radius:var(--r);background:transparent;color:var(--t2);cursor:pointer;
}
.nav__btn:hover{background:var(--hover);color:var(--t1)}
.nav__btn.on{background:var(--on);color:var(--t1)}
.nav__sp{flex:1}
.main{flex:1;min-width:0;display:flex;flex-direction:column;background:var(--bg-panel)}

/* ---------- 页头 / 底栏 ---------- */
.header{
  flex:0 0 var(--h-header);display:flex;align-items:center;justify-content:space-between;
  padding:0 var(--pad);border-bottom:1px solid var(--line);
}
.header__title{font-size:var(--fs)}
.header__tools{display:flex;align-items:center;gap:var(--s1)}
.footer{
  flex:0 0 var(--h-bar);display:flex;align-items:center;justify-content:flex-end;
  gap:var(--s1);padding:0 var(--pad);border-top:1px solid var(--line);
}

/* ---------- 内容：纵向间距只由容器 gap 给 ---------- */
.body{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:var(--s2);padding:var(--s2) 0}
.block{padding:0 var(--pad)}
.block--full{
  margin:0 calc(-1 * var(--pad));padding:var(--s3) var(--pad);
  background:var(--bg-sunken);
}
.row{display:flex;align-items:center;gap:var(--s2)}
.row + .row{margin-top:var(--s2)}
.row--split > *{flex:1;min-width:0}
/* 行内控件必须能缩，否则窄面板会把整行顶出去 */
.row > .field{flex:1;min-width:0}
.label{flex:0 0 auto;font-size:var(--fs2);color:var(--t2)}
.line{height:1px;margin:0 calc(-1 * var(--pad));background:var(--line);border:0}
.line--in{margin:0}

/* ---------- 控件 ---------- */
.field{
  display:flex;align-items:center;gap:var(--s1);
  height:var(--h);padding:0 var(--s2);
  border:0;border-radius:var(--r);background:var(--bg-sunken);
}
.field > svg{color:var(--t2)}
.field input{
  flex:1;min-width:0;border:0;background:transparent;outline:none;
  font-size:var(--fs);text-align:right;
}
.field input::placeholder{color:var(--t3);text-align:left}
.field__unit{flex:0 0 auto;font-size:var(--fs3);color:var(--t3);width:12px;text-align:center}
.select{cursor:pointer}
.select__text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.select .chev{color:var(--t2)}

.icon-btn{
  width:var(--h);height:var(--h);flex:0 0 auto;
  display:inline-flex;align-items:center;justify-content:center;
  padding:0;border:0;border-radius:var(--r);background:transparent;
  color:var(--t1);cursor:pointer;
}
.icon-btn:hover{background:var(--hover)}
.icon-btn.on{background:var(--on)}
.icon-btn:disabled{opacity:.4;cursor:not-allowed}

.btn{
  height:var(--h);padding:0 var(--s3);
  border:0;border-radius:var(--r);background:var(--bg-btn);
  font-size:var(--fs);cursor:pointer;
}
.btn:hover{background:var(--bg-btn-hover)}
.btn--ghost{background:transparent;color:var(--accent);padding:0}
.btn--half{flex:1}

.grid-6{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:var(--s2)}
.grid-8{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:var(--s2)}
.grid-6 .btn,.grid-8 .btn{padding:0}

.check{display:inline-flex;align-items:center;gap:var(--s1);font-size:var(--fs);cursor:pointer}
.check i{width:13px;height:13px;flex:0 0 auto;border:1px solid var(--t3);border-radius:50%}
.check.on i{border-color:var(--accent);box-shadow:inset 0 0 0 3px var(--accent)}
.check--box i{border-radius:2px}
.check--box.on i{background:var(--accent);border-color:var(--accent);box-shadow:none}

.swatch{width:56px;height:var(--h);flex:0 0 auto;border:0;border-radius:var(--r);background:#d8d8d8;cursor:pointer}
.swatch--sm{width:25px;height:25px}
.divider-v{width:1px;height:14px;background:var(--line);flex:0 0 auto}

/* ---------- 字体面板 ---------- */
.weights{display:flex;gap:var(--s1)}
.tools{display:flex;align-items:center;justify-content:space-between}

/* ---------- 字体管理 ---------- */
.search{display:flex;align-items:center;gap:var(--s1)}
.chips{display:flex;flex-wrap:wrap;gap:var(--s1)}
.chip{
  height:var(--h-row);padding:0 var(--s2);
  border:1px solid transparent;border-radius:var(--r);
  background:var(--bg-btn);font-size:var(--fs2);cursor:pointer;
}
.chip:hover{border-color:var(--t3)}
.chip.on{border-color:var(--accent);color:#fff}
.count-row{
  display:flex;align-items:center;justify-content:space-between;
  height:var(--h-row);padding:0 var(--pad);
  border-top:1px solid var(--line-row);
  font-size:var(--fs3);color:var(--t2);
}
.font-item{padding:var(--s2) var(--pad);border-bottom:1px solid var(--line-row);cursor:pointer}
.font-item:hover{background:var(--hover)}
.font-item__head{display:flex;align-items:center;justify-content:space-between;height:18px}
.font-item__name{font-size:var(--fs2);color:var(--t2)}
.font-item__acts{display:flex;gap:var(--s1);color:var(--t3)}
.font-item__preview{
  margin:0;padding:var(--s1) 0 var(--s2);
  font-size:26px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.font-item__weights{display:flex;align-items:center;justify-content:space-between}
.glyphs{display:flex;gap:var(--s1)}
.glyph{
  width:var(--h-row);height:var(--h-row);border:0;border-radius:var(--r);
  background:transparent;font-size:var(--fs2);cursor:pointer;
}
.glyph:hover{background:var(--hover)}
.glyph.on{background:var(--bg-btn)}
.glyph-count{
  height:var(--h-row);min-width:var(--h-row);padding:0 var(--s1);
  border:0;border-radius:var(--r);background:var(--bg-btn);
  font-size:var(--fs3);cursor:pointer;
}

/* ---------- 常用 ---------- */
.collapse{
  display:flex;align-items:center;justify-content:space-between;
  height:var(--h);padding:0 var(--pad);font-size:var(--fs2);color:var(--t2);
}
.tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s2);padding:0 var(--pad)}
.tile{
  height:56px;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:var(--s1);border:0;border-radius:var(--r);background:var(--bg-tile);
  font-size:var(--fs3);color:var(--t1);cursor:pointer;
}
.tile:hover{background:var(--bg-btn-hover)}

/* ---------- 样式 ---------- */
.group{padding:0 var(--pad)}
.group__head{display:flex;align-items:center;justify-content:space-between;height:var(--h-row);font-size:var(--fs2);color:var(--t2)}
.swatches{display:flex;flex-wrap:wrap;gap:var(--s1)}

/* ---------- 设置 ---------- */
.set-row{display:flex;align-items:center;justify-content:space-between;height:var(--h)}
.switch{
  width:34px;height:18px;flex:0 0 auto;border:0;border-radius:9px;
  background:#555;position:relative;cursor:pointer;
}
.switch::after{
  content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;
  border-radius:50%;background:#bbb;
}
.switch.on{background:var(--accent)}
.switch.on::after{left:18px;background:#fff}

/* ---------- 诊断 ---------- */
.log{
  flex:1;min-height:0;margin:0;padding:var(--s2);
  background:var(--bg-sunken);border-radius:var(--r);
  font-family:Consolas,monospace;font-size:var(--fs3);line-height:1.7;
  color:var(--t2);white-space:pre-wrap;overflow:auto;
}
.link{border:0;background:transparent;color:var(--accent);font-size:var(--fs2);cursor:pointer;padding:0}
`;

/* ---------- 导航（真图标 + 真名称） ---------- */
const NAV = [
  ['icon-nav_changyonggongneng', '常用功能'],
  ['icon-nav_zitimianban', '字体面板'],
  ['icon-nav_zitiguanli', '字体管理'],
  ['icon-nav_yangshiku', '样式面板'],
  ['icon-nav_dongzuoku', '动作管理'],
  ['icon-nav_chongmingmingtuceng', '重命名图层']
];

const nav = (active) => `
<nav class="nav">
  ${NAV.map(
    ([name, title], i) =>
      `<button class="nav__btn${i === active ? ' on' : ''}" title="${title}">${ic(name, 18)}</button>`
  ).join('\n  ')}
  <span class="nav__sp"></span>
  <button class="nav__btn" title="设置">${ic('iconyonghushezhi', 18)}</button>
</nav>`;

/* ---------- 各页 ---------- */
const PAGE_FONT = `
<div class="main">
  <div class="body">
    <div class="block">
      <button class="btn--ghost" style="height:var(--h)">添加当前图层字体</button>
      <div class="select field" style="margin-top:var(--s2)">
        <span class="select__text">思源黑体</span>${ic('iconxiala', 12)}
      </div>
      <div class="weights" style="margin-top:var(--s2)">
        ${[1, 2, 3].map((i) => `<button class="icon-btn">${ic('iconzihaodaxiao' + i, 18)}</button>`).join('')}
      </div>
    </div>

    <div class="block">
      <div class="row">
        <div class="field" style="flex:1">
          ${ic('iconzihaodaxiao1', 14)}<input value="24" /><span class="field__unit">pt</span>${ic('iconxiala', 12)}
        </div>
        <div class="field" style="flex:1">
          ${ic('iconzihaodaxiao3', 14)}<input value="20" /><span class="field__unit">pt</span>${ic('iconxiala', 12)}
        </div>
      </div>
      <div class="row">
        <div class="field" style="flex:1">
          ${ic('iconzihaodaxiao5', 14)}<input value="12" /><span class="field__unit">pt</span>
        </div>
        <span class="check" style="flex:1"><i></i>视觉调整</span>
      </div>
      <div class="row">
        <button class="swatch"></button>
        <button class="icon-btn">${ic('iconzihaodaxiao7', 18)}</button>
        <button class="icon-btn">${ic('iconqingxie', 18)}</button>
        <button class="icon-btn">${ic('iconquanbudaxie', 18)}</button>
        <span class="divider-v"></span>
        <button class="icon-btn">${ic('iconzuoduiqi', 18)}</button>
        <button class="icon-btn">${ic('iconchuizhiduiqi', 18)}</button>
        <button class="icon-btn">${ic('iconyouduiqi', 18)}</button>
      </div>
    </div>

    <hr class="line" />

    <div class="block">
      <div class="tools">
        ${['iconfanyi', 'iconchaifen', 'iconanniu'].map((n) => `<button class="icon-btn">${ic(n, 18)}</button>`).join('')}
        <span class="divider-v"></span>
        ${['iconfuzhiwenziyangshi', 'iconniantiewenziyangshi', 'icongenggaiwenbenfangxiang']
          .map((n) => `<button class="icon-btn">${ic(n, 18)}</button>`)
          .join('')}
      </div>
    </div>

    <div class="block">
      <div class="tools">
        ${['iconzuoduiqi', 'iconchuizhiduiqi', 'iconyouduiqi', 'iconchuizhijuzhongfenbu']
          .map((n) => `<button class="icon-btn">${ic(n, 18)}</button>`)
          .join('')}
        <span class="divider-v"></span>
        ${['iconbeijingchuizhiduiqi', 'iconchuizhifenbu'].map((n) => `<button class="icon-btn">${ic(n, 18)}</button>`).join('')}
      </div>
    </div>

    <div class="block">
      <div class="tools">
        ${['icondingbuduiqi', 'iconshuipingduiqi', 'icondibuduiqi', 'iconshuipingjuzhongfenbu']
          .map((n) => `<button class="icon-btn">${ic(n, 18)}</button>`)
          .join('')}
        <span class="divider-v"></span>
        ${['iconbeijingshuipingduiqi-', 'iconshuipingfenbu'].map((n) => `<button class="icon-btn">${ic(n, 18)}</button>`).join('')}
      </div>
    </div>

    <hr class="line" />

    <div class="block">
      <div class="row">
        <div class="select field" style="flex:1"><span class="select__text">默认</span>${ic('iconxiala', 12)}</div>
        <button class="icon-btn">${ic('iconshuru', 16)}</button>
        <button class="icon-btn">${ic('iconshanchu', 16)}</button>
        <button class="icon-btn">${ic('iconchangguicengjiyushe', 16)}</button>
      </div>
      <div class="grid-6" style="margin-top:var(--s2)">
        ${[92, 48, 36, 24, 15, 12].map((n) => `<button class="btn">${n}</button>`).join('')}
      </div>
    </div>
  </div>

  <div class="footer">
    <button class="icon-btn">${ic('iconxianshi', 18)}</button>
    <button class="icon-btn">${ic('iconzihaodaxiao1', 18)}</button>
  </div>
</div>`;

const PAGE_MANAGE = `
<div class="main">
  <div class="header">
    <span class="header__title">我的字体</span>
    <div class="header__tools"><button class="icon-btn">${ic('icongengduocaidan', 18)}</button></div>
  </div>

  <div class="body">
    <div class="block">
      <div class="search">
        <div class="field" style="flex:1">
          ${ic('iconsousuo', 14)}<input placeholder="搜索字体" style="text-align:left" />
        </div>
        <button class="icon-btn">${ic('iconguolv', 18)}</button>
      </div>
    </div>

    <div class="block">
      <div class="chips">
        ${['中文', '英文', '标题', '正文', '手写'].map((t, i) => `<button class="chip${i === 0 ? ' on' : ''}">${t}</button>`).join('')}
        <button class="chip">+</button>
      </div>
    </div>

    <div class="count-row"><span>全部(259)</span><span>取消筛选</span></div>

    <div>
      ${[
        ['思源黑体 CN', 'Microsoft YaHei', ['永', '永', '永'], 9],
        ['思源宋体 CN', 'SimSun', ['永', '永'], 6],
        ['OPPOSans', 'Segoe UI', ['A', 'A', 'A'], 7]
      ]
        .map(
          ([name, fam, glyphs, count]) => `
      <div class="font-item">
        <div class="font-item__head">
          <span class="font-item__name">${name}</span>
          <span class="font-item__acts">${ic('iconbiaoqian', 14)}${ic('iconshuru', 14)}</span>
        </div>
        <p class="font-item__preview" style="font-family:'${fam}'">永远相信美好的事情即将发生</p>
        <div class="font-item__weights">
          <div class="glyphs">${glyphs.map((g, i) => `<button class="glyph${i === 0 ? ' on' : ''}">${g}</button>`).join('')}</div>
          <button class="glyph-count">${count}</button>
        </div>
      </div>`
        )
        .join('')}
    </div>
  </div>

  <div class="footer">
    <button class="icon-btn">${ic('iconxianshi', 18)}</button>
    <button class="icon-btn">${ic('iconzihaodaxiao1', 18)}</button>
  </div>
</div>`;

const PAGE_COMMON = `
<div class="main">
  <div class="header"><span class="header__title">常用功能</span></div>
  <div class="body">
    <div class="collapse"><span>缩放</span>${ic('iconxiala', 12)}</div>
    <div class="collapse"><span>变换</span>${ic('iconxiala', 12)}</div>
    <div class="collapse"><span>常用功能</span>${ic('iconxiala', 12)}</div>
    <div class="tiles">
      ${[
        ['icon-daochutupian', '导出图片'],
        ['icon-cankaoxiangongju', '参考线'],
        ['icon-youhuawendang', '优化文档'],
        ['icon-zidongtianchongyanse', '自动填充'],
        ['icon-xiuzhengmohu', '修正模糊'],
        ['icon-zidingyibianhuan', '自定义变换']
      ]
        .map(([name, label]) => `<button class="tile">${ic(name, 24)}<span>${label}</span></button>`)
        .join('')}
    </div>
  </div>
  <div class="footer"><button class="icon-btn">${ic('iconxianshi', 18)}</button></div>
</div>`;

const PAGE_STYLE = `
<div class="main">
  <div class="header"><span class="header__title">样式库</span></div>
  <div class="body">
    <div class="block">
      <div class="select field"><span class="select__text">默认样式库</span>${ic('iconxiala', 12)}</div>
    </div>
    <div class="group">
      <div class="group__head"><span>最近使用</span>${ic('iconxiala', 12)}</div>
      <div class="swatches">
        ${['#e14b4b', '#f0a04b', '#4bc47a', '#4b8fe1', '#8a4be1', '#e14bb0']
          .map((c) => `<button class="swatch swatch--sm" style="background:${c}"></button>`)
          .join('')}
      </div>
    </div>
    <div class="group">
      <div class="group__head"><span>形状</span>${ic('iconxiala', 12)}</div>
      <div class="swatches">
        ${['#494949', '#6e6e6e', '#2c2c2c', '#ffffff', '#000000']
          .map((c) => `<button class="swatch swatch--sm" style="background:${c}"></button>`)
          .join('')}
      </div>
    </div>
  </div>
  <div class="footer"><button class="icon-btn">${ic('iconxianshi', 18)}</button></div>
</div>`;

const PAGE_SET = `
<div class="main">
  <div class="header"><span class="header__title">设置</span></div>
  <div class="body">
    <div class="block">
      <div class="set-row"><span>显示快选区</span><button class="switch on"></button></div>
      <div class="set-row"><span>显示层级区</span><button class="switch on"></button></div>
      <div class="set-row"><span>粘贴保留字重</span><button class="switch"></button></div>
    </div>
    <hr class="line" />
    <div class="block">
      <div class="row">
        <span class="label" style="width:64px">默认字号</span>
        <div class="field" style="flex:1"><input value="12" /><span class="field__unit">pt</span></div>
      </div>
      <div class="row">
        <span class="label" style="width:64px">默认行距</span>
        <div class="field" style="flex:1"><input value="自动" /><span class="field__unit">pt</span></div>
      </div>
      <div class="row">
        <span class="label" style="width:64px">默认字距</span>
        <div class="field" style="flex:1"><input value="0" /><span class="field__unit">pt</span></div>
      </div>
    </div>
  </div>
</div>`;

const PAGE_DEBUG = `
<div class="main">
  <div class="header">
    <span class="header__title">诊断</span>
    <div class="header__tools"><span class="label">v0.1.0</span></div>
  </div>
  <div class="body" style="padding-bottom:var(--s2)">
    <div class="block" style="display:flex;align-items:center;justify-content:space-between">
      <span class="label">日志</span>
      <span style="display:flex;gap:var(--s3)">
        <button class="link">复制</button><button class="link">刷新</button><button class="link">清空</button>
      </span>
    </div>
    <div class="block" style="flex:1;min-height:0;display:flex">
      <pre class="log">2026-10-28T01:23:48.477Z INFO  PS 能力就绪 {"core":true,"vendor":true}
2026-10-28T01:23:58.871Z WARN  读取文字属性失败 {"code":"PS_NOT_TEXT","reason":"当前图层不是文字图层"}
2026-10-28T01:28:28.455Z INFO  jsx 调用 {"fn":"ztgl_setFont","raw":"{\\"err\\":1,\\"msg\\":\\"请选择文字图层\\"}"}</pre>
    </div>
  </div>
</div>`;

const PAGES = [
  ['font', '字体面板', 1, PAGE_FONT],
  ['manage', '字体管理', 2, PAGE_MANAGE],
  ['common', '常用功能', 0, PAGE_COMMON],
  ['style', '样式面板', 3, PAGE_STYLE],
  ['set', '设置', -1, PAGE_SET],
  ['debug', '诊断', -1, PAGE_DEBUG]
];

mkdirSync('docs/preview/redesign', { recursive: true });

const html = (title, active, page) => `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8" /><title>${title} · 重设计稿</title><style>${CSS}</style></head>
<body>
<div class="shell">
${nav(active)}
${page}
</div>
</body>
</html>`;

for (const [key, title, active, page] of PAGES) {
  writeFileSync(`docs/preview/redesign/${key}.html`, html(title, active, page), 'utf8');
}

const frames = PAGES.map(
  ([key, title]) => `  <figure><figcaption>${title}</figcaption>
    <iframe src="${key}.html" width="380" height="760" loading="lazy"></iframe></figure>`
).join('\n');

writeFileSync(
  'docs/preview/redesign/index.html',
  `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8" /><title>重设计稿 · 全部页面</title>
<style>
  body{margin:0;padding:20px;background:#1b1b1b;color:#d6d6d6;font:13px/1.6 "Microsoft YaHei UI","Segoe UI",sans-serif}
  h1{font-size:14px;font-weight:400;margin:0 0 6px}
  .note{margin:0 0 18px;color:#9a9a9a;font-size:12px;max-width:900px}
  .note code{color:#c9c9c9}
  .row{display:flex;flex-wrap:wrap;gap:18px}
  figure{margin:0}
  figcaption{font-size:12px;color:#9a9a9a;margin-bottom:6px}
  iframe{border:1px solid #333;border-radius:4px;background:#2b2b2b;display:block}
</style></head>
<body>
<h1>重设计稿 · 全部页面</h1>
<p class="note">
一套值：间距 <code>4/8/12/16</code>、左右内边距 <code>12</code>、控件高 <code>26</code>、圆角 <code>4</code>、
字号 <code>13/12/11</code>、表面四层（页面 <code>#2b2b2b</code> → 面板 <code>#363636</code> → 凹陷 <code>#222</code> → 按钮 <code>#4a4a4a</code>）、
线条两种（区块 <code>#333</code> / 列表行 <code>#2e2e2e</code>）。<br>
纵向间距只由容器 <code>gap</code> 给；满宽块左右外扩 <code>12</code>，背景铺到面板边缘。图标为真 SVG，文案为真文案。
</p>
<div class="row">
${frames}
</div>
</body></html>`,
  'utf8'
);

console.log('pages:', PAGES.length, '| icons:', Object.keys(ICONS).length);
