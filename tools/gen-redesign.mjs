/**
 * PS 原生风格高保真稿生成器。
 *
 * 是什么：按一套深色面板设计系统重画六页界面 + 一页控件对照，输出静态 HTML 到 docs/preview/redesign/。
 * 唯一入口：改视觉只改本文件的 CSS 常量，重跑后所有页面同步变；打开方式见 docs/preview/README.md。
 * 谁在用：设计评审，浏览器直接打开 docs/preview/redesign/index.html；npm run check:preview 校验产物与生成器一致。
 * 禁止：不改 src/、不进构建、不用占位方块代替图标（图标取自 src/components/icons/index.tsx 的真 SVG）；
 *       不许手改产物 HTML（--check 会红，下次生成也会被覆盖）。
 *
 * 用法：node tools/gen-redesign.mjs          生成七页 + 索引
 *       node tools/gen-redesign.mjs --check  只比对不写文件，不一致退出码 1
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

/* ---------- 真图标 ---------- */
const iconSrc = readFileSync('src/components/icons/index.tsx', 'utf8');
const ICONS = {};
const re = /'([a-zA-Z0-9_-]+)':\s*\{\s*viewBox:\s*'([^']+)',\s*inner:\s*"((?:[^"\\]|\\.)*)"/g;
let m;
while ((m = re.exec(iconSrc))) ICONS[m[1]] = { vb: m[2], inner: m[3].replace(/\\"/g, '"') };

const ic = (name, size = 16) =>
  ICONS[name]
    ? `<svg viewBox="${ICONS[name].vb}" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${ICONS[name].inner}</svg>`
    : `<span class="missing" title="${name}"></span>`;

/* ---------- 设计系统：PS 深色面板 ---------- */
const CSS = `
:root{
  /* 间距只有 4 / 8 / 12 / 16；PS 面板不留大空白 */
  --s1:4px; --s2:8px; --s3:12px; --s4:16px;
  --pad:8px;

  /* 控件高 22、直角、图标 16；标题栏与底栏 24，行 20 */
  --h:22px; --r:0px; --h-header:24px; --h-bar:24px; --h-row:20px;

  /* 字号 12 正文 / 11 次要与元信息 */
  --fs:12px; --fs2:11px; --fs3:11px;

  /* 表面按亮度单调：面板与内容区同一个底，不叠第二层 */
  --bg-page:#2b2b2b;
  --bg-panel:#2b2b2b;
  --bg-bar:#262626;
  --bg-well:#242424;
  --bg-sunken:#1e1e1e;
  --bg-btn:#383838;
  --bg-btn-hover:#434343;
  --bg-tile:#303030;
  --bg-on:#3d3d3d;

  /* 交互：hover 只叠一层白，蓝只给焦点 / 选中 / 主操作 */
  --hover:rgba(255,255,255,.06);
  --on:rgba(255,255,255,.10);
  --accent:#2680eb;
  --danger:#e5685c;

  --t1:#d4d4d4; --t2:#9c9c9c; --t3:#747474;

  /* 线条两档：暗线分隔 / 亮线控件边 */
  --line:#1f1f1f; --line-row:#1f1f1f; --line-strong:#4a4a4a;
}

*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;background:#181818;color:var(--t1);
  font:var(--fs)/1.5 "Segoe UI","Microsoft YaHei UI",sans-serif;
  display:flex;align-items:flex-start;justify-content:center;padding:16px;
}
button,input{font:inherit;color:inherit}
svg{display:block;flex:0 0 auto}
.missing{width:16px;height:16px;background:var(--line-strong);display:inline-block}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-thumb{background:#4a4a4a}
::-webkit-scrollbar-track{background:transparent}

/* ---------- 外壳：左工具栏 + 内容 ---------- */
/* PS 面板左侧是窄竖工具栏，不是网页侧栏；选中靠左侧蓝条表达，不靠整块圆角底 */
.shell{display:flex;width:320px;height:680px;background:var(--bg-page);border:1px solid var(--line-strong);overflow:hidden}
.nav{
  flex:0 0 32px;display:flex;flex-direction:column;align-items:center;
  padding:2px 0;background:var(--bg-page);border-right:1px solid var(--line);
}
.nav__btn{
  width:32px;height:28px;display:flex;align-items:center;justify-content:center;
  border:0;border-left:2px solid transparent;border-radius:0;background:transparent;
  color:var(--t2);cursor:pointer;
}
.nav__btn:hover{background:var(--hover);color:var(--t1)}
.nav__btn.on{background:var(--bg-on);border-left-color:var(--accent);color:var(--t1)}
.nav__sp{flex:1}
.main{flex:1;min-width:0;display:flex;flex-direction:column;background:var(--bg-panel)}

/* ---------- 面板标题栏 / 底栏 ---------- */
.header{
  flex:0 0 var(--h-header);display:flex;align-items:center;
  padding:0 var(--pad);background:var(--bg-bar);border-bottom:1px solid var(--line);
}
.header::before{
  content:"";width:0;height:0;margin-right:var(--s1);
  border-left:4px solid var(--t2);border-top:3px solid transparent;border-bottom:3px solid transparent;
}
.header__title{flex:1;font-size:var(--fs2);color:var(--t2)}
.header__tools{display:flex;align-items:center;gap:var(--s1)}
.footer{
  flex:0 0 var(--h-bar);display:flex;align-items:center;justify-content:flex-end;
  gap:var(--s1);padding:0 var(--pad);background:var(--bg-bar);border-top:1px solid var(--line);
}
.footer .icon-btn{color:var(--t2)}
.footer .icon-btn:hover{color:var(--t1)}

/* ---------- 内容：纵向间距只由容器 gap 给 ---------- */
.body{
  flex:1;min-height:0;overflow-y:auto;scrollbar-gutter:stable;
  display:flex;flex-direction:column;gap:var(--s2);padding:var(--s2) var(--pad);
}
.block{min-width:0}
.block > *{min-width:0}
.block--full{
  margin:0 calc(-1 * var(--pad));padding:var(--s2) var(--pad);
  background:var(--bg-well);border-top:1px solid var(--line);border-bottom:1px solid var(--line);
}
.row{display:flex;align-items:center;gap:var(--s2)}
.row + .row{margin-top:var(--s2)}
.row--split > *{flex:1;min-width:0}
.row > .field{flex:1;min-width:0}
.row--pair{display:grid;grid-template-columns:1fr 1fr;gap:var(--s2)}
.row--pair > *{min-width:0}
.spacer{flex:1}
.label{flex:0 0 auto;font-size:var(--fs2);color:var(--t2)}
.line{height:1px;margin:0 calc(-1 * var(--pad));background:var(--line);border:0}
.line--in{margin:0}

/* ---------- 控件：直角 + 1px 亮线，输入位比面板深一档 ---------- */
.field{
  display:flex;align-items:center;gap:var(--s1);
  height:var(--h);padding:0 var(--s1);
  border:1px solid var(--line-strong);border-radius:0;background:var(--bg-sunken);
}
.field:focus-within{border-color:var(--accent)}
.field > svg{color:var(--t2)}
.field input{
  flex:1;min-width:0;border:0;background:transparent;outline:none;
  font-size:var(--fs2);text-align:right;
}
.field input::placeholder{color:var(--t3);text-align:left}
.field__unit{flex:0 0 auto;font-size:var(--fs3);color:var(--t3);width:12px;text-align:center}
.select{cursor:pointer}
.select__text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.select .chev{color:var(--t2)}

.icon-btn{
  width:var(--h);height:var(--h);flex:0 0 auto;
  display:inline-flex;align-items:center;justify-content:center;
  padding:0;border:0;border-radius:0;background:transparent;
  color:var(--t1);cursor:pointer;
}
.icon-btn:hover{background:var(--hover)}
.icon-btn.on{background:var(--bg-on)}
.icon-btn:disabled{opacity:.4;cursor:not-allowed}

.btn{
  height:var(--h);padding:0 var(--s2);
  border:1px solid var(--line-strong);border-radius:0;background:var(--bg-btn);
  font-size:var(--fs2);cursor:pointer;
}
.btn:hover{background:var(--bg-btn-hover)}
.btn:disabled{opacity:.4;cursor:not-allowed}
.btn--ghost{background:transparent;border-color:transparent;color:var(--accent);padding:0}
.btn--half{flex:1}
.btn--primary{background:var(--accent);border-color:var(--accent);color:#fff}

.grid-6{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:var(--s1)}
.grid-8{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:var(--s1)}
.grid-6 .btn,.grid-8 .btn{padding:0}

.check{display:inline-flex;align-items:center;gap:var(--s1);font-size:var(--fs2);cursor:pointer}
.check i{width:13px;height:13px;flex:0 0 auto;border:1px solid var(--line-strong);border-radius:50%}
.check.on i{border-color:var(--accent);box-shadow:inset 0 0 0 3px var(--accent)}
.check--box i{border-radius:2px}
.check--box.on i{background:var(--accent);border-color:var(--accent);box-shadow:none}

.swatch{width:56px;height:var(--h);flex:0 0 auto;border:1px solid var(--line-strong);border-radius:0;background:#d8d8d8;cursor:pointer}
.swatch--sm{width:22px;height:22px}
.divider-v{width:1px;height:14px;background:var(--line-strong);flex:0 0 auto}

/* ---------- 控件对照页 ---------- */
.sec{
  display:flex;align-items:center;gap:var(--s1);height:var(--h-row);
  font-size:var(--fs2);color:var(--t2);border-bottom:1px solid var(--line);
}
.sec::before{
  content:"";width:0;height:0;
  border-left:4px solid var(--t2);border-top:3px solid transparent;border-bottom:3px solid transparent;
}
.kv{display:grid;grid-template-columns:72px 1fr;align-items:center;gap:var(--s2);min-height:var(--h)}
.kv > span{font-size:var(--fs2);color:var(--t2)}
.seg{display:flex;height:var(--h)}
.seg button{
  flex:1;border:1px solid var(--line-strong);border-right:0;border-radius:0;
  background:var(--bg-sunken);font-size:var(--fs2);cursor:pointer;
}
.seg button:last-child{border-right:1px solid var(--line-strong)}
.seg button.on{background:var(--bg-on);color:#fff}
.popover{
  border:1px solid var(--line-strong);background:var(--bg-tile);
  box-shadow:0 4px 12px rgba(0,0,0,.5);padding:var(--s1) 0;
}
.popover__item{
  display:flex;align-items:center;justify-content:space-between;
  height:var(--h);padding:0 var(--s2);font-size:var(--fs2);
}
.popover__item:hover{background:var(--hover)}
.popover__item.on{background:var(--bg-on);color:#fff}
.msgbar{
  display:flex;align-items:center;justify-content:space-between;gap:var(--s1);
  height:var(--h-row);padding:0 var(--s2);
  background:var(--bg-well);border:1px solid var(--line);
  font-size:var(--fs2);color:var(--t2);
}
.msgbar--err{color:var(--danger)}

/* ---------- 各页私有 ---------- */
.weights{display:flex;gap:var(--s1)}
.tools{display:flex;align-items:center;justify-content:space-between}
.search{display:flex;align-items:center;gap:var(--s1)}
.chips{display:flex;flex-wrap:wrap;gap:var(--s1)}
.chip{
  height:var(--h-row);padding:0 var(--s2);
  border:1px solid var(--line-strong);border-radius:0;
  background:var(--bg-btn);font-size:var(--fs2);cursor:pointer;
}
.chip:hover{background:var(--bg-btn-hover)}
.chip.on{background:var(--bg-on);color:#fff;border-color:var(--line-strong)}
.count-row{
  display:flex;align-items:center;justify-content:space-between;
  height:var(--h-row);padding:0;
  border-top:1px solid var(--line-row);border-bottom:1px solid var(--line-row);
  font-size:var(--fs3);color:var(--t2);
}
.font-item{padding:var(--s2) 0;border-bottom:1px solid var(--line-row);cursor:pointer}
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
  width:var(--h-row);height:var(--h-row);border:1px solid var(--line-strong);border-radius:0;
  background:transparent;font-size:var(--fs2);cursor:pointer;
}
.glyph:hover{background:var(--hover)}
.glyph.on{background:var(--bg-on);color:#fff}
.glyph-count{
  height:var(--h-row);min-width:var(--h-row);padding:0 var(--s1);
  border:1px solid var(--line-strong);border-radius:0;background:var(--bg-btn);
  font-size:var(--fs3);cursor:pointer;
}
.collapse{
  display:flex;align-items:center;justify-content:space-between;
  height:var(--h-row);padding:0;font-size:var(--fs2);color:var(--t2);
  background:var(--bg-bar);border-bottom:1px solid var(--line);
}
.tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--line);margin:0 calc(-1 * var(--pad))}
.tile{
  height:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:var(--s1);border:0;border-radius:0;background:var(--bg-panel);
  font-size:var(--fs3);color:var(--t1);cursor:pointer;
}
.tile:hover{background:var(--bg-tile)}
.group{padding:0}
.group__head{
  display:flex;align-items:center;justify-content:space-between;
  height:var(--h-row);font-size:var(--fs2);color:var(--t2);border-bottom:1px solid var(--line);
}
.swatches{display:flex;flex-wrap:wrap;gap:var(--s1);padding:var(--s1) 0}
.set-row{display:flex;align-items:center;justify-content:space-between;height:var(--h)}
.switch{
  width:13px;height:13px;flex:0 0 auto;
  border:1px solid var(--line-strong);border-radius:2px;background:var(--bg-sunken);
  position:relative;cursor:pointer;
}
.switch::after{
  content:"";position:absolute;left:3px;top:0;width:4px;height:8px;
  border:solid #fff;border-width:0 1px 1px 0;transform:rotate(45deg);opacity:0;
}
.switch.on{background:var(--accent);border-color:var(--accent)}
.switch.on::after{opacity:1}
.log{
  flex:1;min-height:0;margin:0;padding:var(--s2);
  background:var(--bg-sunken);border:1px solid var(--line-strong);border-radius:0;
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
      `<button class="nav__btn${i === active ? ' on' : ''}" title="${title}">${ic(name, 16)}</button>`
  ).join('\n  ')}
  <span class="nav__sp"></span>
  <button class="nav__btn" title="设置">${ic('iconyonghushezhi', 16)}</button>
</nav>`;

/* ---------- 控件对照：把设计语言摊开看 ---------- */
const PAGE_CONTROLS = `
<div class="main">
  <div class="header">
    <span class="header__title">控件对照</span>
    <div class="header__tools"><button class="icon-btn">${ic('icongengduocaidan', 16)}</button></div>
  </div>
  <div class="body">
    <div class="sec">输入位</div>
    <div class="kv">
      <span>字号</span>
      <div class="field">${ic('iconzihaodaxiao1', 14)}<input value="24" /><span class="field__unit">pt</span>${ic('iconxiala', 12)}</div>
    </div>
    <div class="kv">
      <span>焦点态</span>
      <div class="field" style="border-color:var(--accent)">${ic('iconsousuo', 14)}<input value="思源黑体" style="text-align:left" /></div>
    </div>
    <div class="kv">
      <span>不可用</span>
      <div class="field" style="opacity:.4"><input value="自动" style="text-align:left" /></div>
    </div>

    <div class="sec">下拉（深色浮层，不反白）</div>
    <div class="select field"><span class="select__text">默认样式库</span>${ic('iconxiala', 12)}</div>
    <div class="popover">
      <div class="popover__item on"><span>默认样式库</span><span>当前</span></div>
      <div class="popover__item"><span>标题样式</span></div>
      <div class="popover__item"><span>电商常用</span></div>
    </div>

    <div class="sec">段选 / 勾选</div>
    <div class="seg"><button class="on">默认</button><button>替换</button><button>追加</button></div>
    <div class="row" style="gap:var(--s3)">
      <span class="check check--box on"><i></i>显示快选区</span>
      <span class="check"><i></i>单选</span>
    </div>

    <div class="sec">按钮</div>
    <div class="row" style="gap:var(--s1)">
      <button class="btn btn--half">取消</button>
      <button class="btn btn--primary btn--half">应用</button>
    </div>
    <div class="row" style="gap:var(--s1)">
      <button class="icon-btn">${ic('iconzuoduiqi', 16)}</button>
      <button class="icon-btn on">${ic('iconshuipingduiqi', 16)}</button>
      <button class="icon-btn">${ic('iconyouduiqi', 16)}</button>
      <button class="icon-btn" disabled>${ic('icondibuduiqi', 16)}</button>
      <span class="spacer"></span>
    </div>

    <div class="sec">消息行</div>
    <div class="msgbar"><span>当前不是文字图层，字号不可编辑</span></div>
    <div class="msgbar msgbar--err"><span>样式库索引读取失败</span><button class="link">重试</button></div>
  </div>
  <div class="footer"><button class="icon-btn">${ic('iconxianshi', 16)}</button></div>
</div>`;

/* ---------- 各页 ---------- */
const PAGE_FONT = `
<div class="main">
  <div class="header">
    <span class="header__title">字体面板</span>
    <div class="header__tools"><button class="icon-btn">${ic('icongengduocaidan', 16)}</button></div>
  </div>
  <div class="body">
    <div class="block">
      <button class="btn btn--ghost">添加当前图层字体</button>
      <div class="select field" style="margin-top:var(--s2)">
        <span class="select__text">思源黑体</span>${ic('iconxiala', 12)}
      </div>
      <div class="weights" style="margin-top:var(--s2)">
        ${[1, 2, 3].map((i) => `<button class="icon-btn">${ic('iconzihaodaxiao' + i, 16)}</button>`).join('')}
      </div>
    </div>

    <div class="block">
      <div class="row--pair">
        <div class="field">
          ${ic('iconzihaodaxiao1', 14)}<input value="24" /><span class="field__unit">pt</span>${ic('iconxiala', 12)}
        </div>
        <div class="field">
          ${ic('iconzihaodaxiao3', 14)}<input value="20" /><span class="field__unit">pt</span>${ic('iconxiala', 12)}
        </div>
      </div>
      <div class="row" style="margin-top:var(--s2)">
        <div class="field" style="flex:1">
          ${ic('iconzihaodaxiao5', 14)}<input value="12" /><span class="field__unit">pt</span>
        </div>
        <span class="check" style="flex:1"><i></i>视觉调整</span>
      </div>
      <div class="row">
        <button class="swatch"></button>
        <span class="divider-v"></span>
        <button class="icon-btn">${ic('iconzihaodaxiao7', 16)}</button>
        <button class="icon-btn">${ic('iconqingxie', 16)}</button>
        <button class="icon-btn">${ic('iconquanbudaxie', 16)}</button>
      </div>
      <div class="row">
        <button class="icon-btn">${ic('iconzuoduiqi', 16)}</button>
        <button class="icon-btn">${ic('iconchuizhiduiqi', 16)}</button>
        <button class="icon-btn">${ic('iconyouduiqi', 16)}</button>
        <button class="icon-btn">${ic('iconchuizhijuzhongfenbu', 16)}</button>
        <span class="spacer"></span>
      </div>
    </div>

    <hr class="line" />

    <div class="block">
      <div class="tools">
        ${['iconfanyi', 'iconchaifen', 'iconanniu'].map((n) => `<button class="icon-btn">${ic(n, 16)}</button>`).join('')}
        <span class="divider-v"></span>
        ${['iconfuzhiwenziyangshi', 'iconniantiewenziyangshi', 'icongenggaiwenbenfangxiang']
          .map((n) => `<button class="icon-btn">${ic(n, 16)}</button>`)
          .join('')}
      </div>
    </div>

    <div class="block">
      <div class="tools">
        ${['iconzuoduiqi', 'iconchuizhiduiqi', 'iconyouduiqi', 'iconchuizhijuzhongfenbu']
          .map((n) => `<button class="icon-btn">${ic(n, 16)}</button>`)
          .join('')}
        <span class="divider-v"></span>
        ${['iconbeijingchuizhiduiqi', 'iconchuizhifenbu'].map((n) => `<button class="icon-btn">${ic(n, 16)}</button>`).join('')}
      </div>
    </div>

    <div class="block">
      <div class="tools">
        ${['icondingbuduiqi', 'iconshuipingduiqi', 'icondibuduiqi', 'iconshuipingjuzhongfenbu']
          .map((n) => `<button class="icon-btn">${ic(n, 16)}</button>`)
          .join('')}
        <span class="divider-v"></span>
        ${['iconbeijingshuipingduiqi-', 'iconshuipingfenbu'].map((n) => `<button class="icon-btn">${ic(n, 16)}</button>`).join('')}
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
    <button class="icon-btn">${ic('iconxianshi', 16)}</button>
    <button class="icon-btn">${ic('iconzihaodaxiao1', 16)}</button>
  </div>
</div>`;

const PAGE_MANAGE = `
<div class="main">
  <div class="header">
    <span class="header__title">我的字体</span>
    <div class="header__tools"><button class="icon-btn">${ic('icongengduocaidan', 16)}</button></div>
  </div>

  <div class="body">
    <div class="block">
      <div class="search">
        <div class="field" style="flex:1">
          ${ic('iconsousuo', 14)}<input placeholder="搜索字体" style="text-align:left" />
        </div>
        <button class="icon-btn">${ic('iconguolv', 16)}</button>
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
    <button class="icon-btn">${ic('iconxianshi', 16)}</button>
    <button class="icon-btn">${ic('iconzihaodaxiao1', 16)}</button>
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
        ['icondaochutupian', '导出图片'],
        ['iconcankaoxiangongju', '参考线'],
        ['iconyouhuawendang', '优化文档'],
        ['iconzidongtianchongyanse', '自动填充'],
        ['iconxiuzhengmohu', '修正模糊'],
        ['iconzidingyibianhuan', '自定义变换']
      ]
        .map(([name, label]) => `<button class="tile">${ic(name, 20)}<span>${label}</span></button>`)
        .join('')}
    </div>
  </div>
  <div class="footer"><button class="icon-btn">${ic('iconxianshi', 16)}</button></div>
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
  <div class="footer"><button class="icon-btn">${ic('iconxianshi', 16)}</button></div>
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
  ['controls', '控件对照', -1, PAGE_CONTROLS],
  ['font', '字体面板', 1, PAGE_FONT],
  ['manage', '字体管理', 2, PAGE_MANAGE],
  ['common', '常用功能', 0, PAGE_COMMON],
  ['style', '样式面板', 3, PAGE_STYLE],
  ['set', '设置', -1, PAGE_SET],
  ['debug', '诊断', -1, PAGE_DEBUG]
];

/* 产物出口只有这一处：生成与校验共用同一段模板，校验不另写一份实现。 */
const OUT_DIR = 'docs/preview/redesign';
const CHECK = process.argv.includes('--check');
const drift = [];

function emit(name, text) {
  const expected = text.replace(/\r\n/g, '\n');
  if (CHECK) {
    const path = `${OUT_DIR}/${name}.html`;
    /* Windows 检出会把 LF 转成 CRLF；只归一换行，不掩盖内容差异。 */
    const actual = existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n/g, '\n') : null;
    if (actual !== expected) drift.push(name);
  } else {
    writeFileSync(`${OUT_DIR}/${name}.html`, expected, 'utf8');
  }
}

if (!CHECK) mkdirSync(OUT_DIR, { recursive: true });

const html = (title, active, page) => `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8" /><title>${title} · PS 原生风格稿</title><style>${CSS}</style></head>
<body>
<div class="shell">
${nav(active)}
${page}
</div>
</body>
</html>`;

for (const [key, title, active, page] of PAGES) {
  emit(key, html(title, active, page));
}

const frames = PAGES.map(
  ([key, title]) => `  <figure><figcaption>${title}</figcaption>
    <iframe src="${key}.html" width="380" height="700" loading="lazy"></iframe></figure>`
).join('\n');

emit(
  'index',
  `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8" /><title>PS 原生风格 · 重设计稿</title>
<style>
  body{margin:0;padding:20px;background:#181818;color:#d4d4d4;font:12px/1.6 "Segoe UI","Microsoft YaHei UI",sans-serif}
  h1{font-size:14px;font-weight:400;margin:0 0 6px}
  .note{margin:0 0 18px;color:#9c9c9c;font-size:12px;max-width:900px;line-height:1.8}
  .note code{color:#d4d4d4}
  .row{display:flex;flex-wrap:wrap;gap:18px}
  figure{margin:0}
  figcaption{font-size:11px;color:#9c9c9c;margin-bottom:6px}
  iframe{border:1px solid #333;background:#2b2b2b;display:block}
</style></head>
<body>
<h1>PS 原生风格 · 重设计稿</h1>
<p class="note">
预览稿：不参与构建、不改 <code>src/</code>，只用来定视觉方向。与现行界面的差别：<br>
① 直角 + <code>1px</code> 细线，去掉 4 / 6 圆角与实心灰按钮的浮起感；
② 面板与内容区同一个底 <code>#2b2b2b</code>，只靠暗线分区，不叠第二层底；<br>
③ 控件高 <code>22</code>、字号 <code>12/11</code>、图标 <code>16</code>，行距压紧；
④ 输入位深一档 <code>#1e1e1e</code> 带亮线边，只有焦点才出现蓝；<br>
⑤ 蓝 <code>#2680eb</code> 只给焦点 / 选中 / 主操作，hover 一律叠白；
⑥ 下拉与浮层改深色 <code>#303030</code> + 亮线 + 投影，取消白底；<br>
⑦ 标题栏带折叠三角，左工具栏收窄到 <code>32</code>，选中靠左侧蓝条。<br>
图标为真 SVG，文案取真实组件。面板框按 <code>320×680</code> 示意，真实实现须宽度自适应（见 <code>docs/preview/README.md</code> 坑 1）。
</p>
<div class="row">
${frames}
</div>
</body></html>`
);

if (CHECK) {
  if (drift.length) {
    console.error(`预览稿与生成器不一致：${drift.join('、')}。改 tools/gen-redesign.mjs 后重跑，不要手改 HTML。`);
    process.exit(1);
  }
  console.log(`预览稿一致性通过：${PAGES.length + 1} 个产物`);
}

console.log('pages:', PAGES.length, '| icons:', Object.keys(ICONS).length);
