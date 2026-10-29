#!/usr/bin/env node
/**
 * 把「真实渲染」iframe 插进 docs/legacy-components.html。
 * - CSS：原版规则（含 [data-v-xxx]）+ 把 :hover 复制成 .sim-hover（用于展示 hover 态）
 * - DOM：严格照 render 函数，不加任何代码里没有的 inline style
 * - 图标：原版 sprite symbol
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const BASE = 'C:/Users/xinye/Downloads/稿定设计助理-本地模式/源码工程/psz-panel-v4';
const CSS = join(BASE, '原始产物/css/app.bf68b505.css');
const ICONS = join(BASE, 'src/icons/m_ea2e.js');
const DOC = join(ROOT, 'docs/legacy-components.html');

for (const f of [CSS, ICONS, DOC]) {
  if (!existsSync(f)) {
    console.error('缺少输入:', f);
    process.exit(1);
  }
}

const cssText = readFileSync(CSS, 'utf8');
const iconText = readFileSync(ICONS, 'utf8');

const rules = [...cssText.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  sel: m[1].replace(/\s+/g, ' ').trim(),
  body: m[2].replace(/\s+/g, ' ').trim(),
}));

const UTIL = /\.(f-baseX|f-center|f-centerY|f-space|f-full|f-alignNone|icon|overflow-text|ml4|ml8|ml10|mr6|mr8|mt2|mt3|mt5|mt10|mt14|mt15|svg-9|svg-40|svg-50|rotate0|rotate-90|line16|f-size12|f-size13|f-size16|cursor|ash|ash-act|mask|tac|w100|h100)\b/;

/** :hover 规则复制成 .sim-hover，用于在静态图里展示 hover 态 */
function hoverVariant(sel) {
  if (!sel.includes(':hover')) return null;
  return sel
    .split(',')
    .map((s) => s.trim().replace(/:hover/g, '.sim-hover'))
    .join(',');
}

function cssFor(scoped) {
  const out = [];
  for (const r of rules) {
    const mine = scoped ? r.sel.includes(`data-v-${scoped}`) : false;
    const util = !r.sel.includes('data-v-') && UTIL.test(r.sel);
    if (!mine && !util) continue;
    out.push(`${r.sel}{${r.body}}`);
    const hv = hoverVariant(r.sel);
    if (hv) out.push(`${hv}{${r.body}}`);
  }
  return [...new Set(out)].join('');
}

function symbols(ids) {
  return ids
    .map((id) => {
      const m = new RegExp(`<symbol id=\\\\"${id}\\\\"[\\s\\S]*?</symbol>`).exec(iconText);
      return m ? m[0].replace(/\\\\"/g, '"') : '';
    })
    .join('');
}

const C = (name, scoped, h, desc, syms, dom) => ({ name, scoped, h, desc, syms, dom });

/* DOM 严格照 render；hover 用 class="sim-hover"，不写 inline 背景色 */
const COMPONENTS = [
  C('input-box', '41c4ba16', 210, '点遮罩关；标题行含「固定」按钮；输入框 + 错误行 + 高级用法折叠',
    ['icongudingxuanxiangye', 'iconzhankaizhedie'],
    `<div class="input-box" data-v-41c4ba16><div class="input-box-main" data-v-41c4ba16><div class="f-baseX" data-v-41c4ba16><span data-v-41c4ba16>水平分布元素</span><div class="f-space" data-v-41c4ba16></div><span class="base-icon f-center ash" data-v-41c4ba16><svg class="icon" data-v-41c4ba16><use xlink:href="#icongudingxuanxiangye"></use></svg></span></div><input class="mt15" data-v-41c4ba16 value="20,30,40"><p class="input-box-err" data-v-41c4ba16>不能输入空字符</p><div class="mt10" data-v-41c4ba16><div class="f-baseX cursor" data-v-41c4ba16>高级用法<svg class="icon svg-9 ml8 rotate-90" data-v-41c4ba16><use xlink:href="#iconzhankaizhedie"></use></svg></div></div></div></div>`),

  C('menu', 'f59b9b2c', 200, '单例挂 body；点外部关；项高 32；选中竖条 3×22；hover 蓝底',
    [],
    `<div><div class="menu_cancel-area" data-v-f59b9b2c></div><div class="menu" data-v-f59b9b2c><div><div class="menu-item f-baseX" data-v-f59b9b2c><div class="menu-select" data-v-f59b9b2c></div><p class="menu-text" data-v-f59b9b2c>重命名</p></div></div><div><div class="menu-item f-baseX sim-hover" data-v-f59b9b2c><p class="menu-text" data-v-f59b9b2c>删除（hover）</p></div></div><div><hr class="menu-hr" data-v-f59b9b2c></div><div><div class="menu-item f-baseX" data-v-f59b9b2c><p class="menu-text" data-v-f59b9b2c>不可用项</p></div></div></div></div>`),

  C('base-icon', '63c7852d', 110, '26×26、1px 透明边；hover 叠黑 20% + 边 #444（.sim-hover）',
    ['iconzhankaizhedie'],
    `<span class="base-icon f-center" data-v-63c7852d><svg class="icon" data-v-63c7852d><use xlink:href="#iconzhankaizhedie"></use></svg></span><span class="base-icon f-center sim-hover" data-v-63c7852d><svg class="icon" data-v-63c7852d><use xlink:href="#iconzhankaizhedie"></use></svg></span><span class="base-icon f-center select" data-v-63c7852d><svg class="icon" data-v-63c7852d><use xlink:href="#iconzhankaizhedie"></use></svg></span>`),

  C('base-check', 'fe3c59ce', 110, '12×12 方框；选中换 sprite 对勾；hover 文字变白',
    ['icongouxuankuang'],
    `<div class="base-check f-baseX" data-v-fe3c59ce><div data-v-fe3c59ce></div><span data-v-fe3c59ce>字号</span></div><div class="base-check f-baseX" data-v-fe3c59ce><svg class="icon" data-v-fe3c59ce><use xlink:href="#icongouxuankuang"></use></svg><span data-v-fe3c59ce>行距</span></div><div class="base-check f-baseX sim-hover" data-v-fe3c59ce><div data-v-fe3c59ce></div><span data-v-fe3c59ce>hover</span></div>`),

  C('base-radio', '6ad4ee70', 110, '12×12 圆；value===label 才选中；hover 文字变白',
    ['icondanxuan'],
    `<label class="base-radio f-baseX" data-v-6ad4ee70><div data-v-6ad4ee70></div><span data-v-6ad4ee70>水平</span></label><label class="base-radio f-baseX" data-v-6ad4ee70><svg class="icon" data-v-6ad4ee70><use xlink:href="#icondanxuan"></use></svg><span data-v-6ad4ee70>垂直</span></label><label class="base-radio f-baseX sim-hover" data-v-6ad4ee70><div data-v-6ad4ee70></div><span data-v-6ad4ee70>hover</span></label>`),

  C('base-group-mian', '3837342d', 110, '22 高整行；箭头 rotate(-90deg) 收起；hover 整行变白',
    ['iconzhankaizhedie'],
    `<div class="w100" data-v-3837342d><div class="base-group-mian f-baseX" data-v-3837342d><svg class="icon svg-9" data-v-3837342d><use xlink:href="#iconzhankaizhedie"></use></svg><p class="ml8" data-v-3837342d>分组标题</p></div><div class="base-group-mian f-baseX sim-hover" data-v-3837342d><svg class="icon svg-9 close" data-v-3837342d><use xlink:href="#iconzhankaizhedie"></use></svg><p class="ml8" data-v-3837342d>收起 + hover</p></div></div>`),

  C('base-input', '823349fe', 150, '高 30、圆角 5、底 #222；聚焦边框 #006fff；白主题',
    [],
    `<div class="base-input f-baseX" data-v-823349fe><input class="f-space" data-v-823349fe value="20,30,40"></div><div class="base-input f-baseX bi-highlight" data-v-823349fe><input class="f-space" data-v-823349fe value="聚焦态"></div><div class="base-input f-baseX base-input-white-theme" data-v-823349fe><input class="f-space" data-v-823349fe value="白主题"></div>`),

  C('base-dropdown-menu', '95e43a5a', 120, '高 24、左右 10、文字省略 + 折叠箭头；hover 变白',
    ['iconzhankaizhedie'],
    `<div class="w100" data-v-95e43a5a><div class="base-dropdown-menu f-baseX" data-v-95e43a5a><p class="f-space overflow-text" data-v-95e43a5a>字体家族</p><svg class="icon f-full" data-v-95e43a5a><use xlink:href="#iconzhankaizhedie"></use></svg></div><div class="base-dropdown-menu f-baseX sim-hover" data-v-95e43a5a><p class="f-space overflow-text" data-v-95e43a5a>hover</p><svg class="icon f-full" data-v-95e43a5a><use xlink:href="#iconzhankaizhedie"></use></svg></div></div>`),

  C('base-input-more', '7b003b9e', 120, '直接渲染 baseInput + 右侧箭头（24/18）',
    ['iconzhankaizhedie'],
    `<div class="base-input f-baseX" data-v-823349fe><input class="f-space" data-v-823349fe value="输入或选择"><span class="base-icon f-center f-full" data-v-63c7852d><svg class="icon" data-v-63c7852d><use xlink:href="#iconzhankaizhedie"></use></svg></span></div>`),

  C('base-open', '180facca', 120, '22 高；align 三档；箭头 rotate(-90deg) 收起；hover 变白',
    ['iconzhankaizhedie'],
    `<div class="w100" data-v-180facca><div class="open-more-mian f-baseX" data-v-180facca><p class="mr8" data-v-180facca>显示更多</p><svg class="icon svg-9" data-v-180facca><use xlink:href="#iconzhankaizhedie"></use></svg></div><div class="open-more-mian f-baseX sim-hover" data-v-180facca><p class="mr8" data-v-180facca>hover</p><svg class="icon svg-9" data-v-180facca><use xlink:href="#iconzhankaizhedie"></use></svg></div></div>`),

  C('base-popup', '42bdf228', 160, '点遮罩关；面板阻止冒泡；内置滚动',
    [],
    `<div class="popup" data-v-42bdf228><div class="popup-main" data-v-42bdf228>弹窗内容（点外面关闭）</div></div>`),

  C('base-svg', '', 110, '裸 svg；点击与右键都 emit；尺寸靠 1em + 外层覆盖',
    ['iconzhankaizhedie'],
    `<svg class="icon" style="width:24px;height:24px;color:#c3c3c3"><use xlink:href="#iconzhankaizhedie"></use></svg>`),

  C('Tips', '69094eea', 110, '单例；setTimeout 自动消失（默认 1000ms）',
    [],
    `<div class="tip f-center" data-v-69094eea><div class="tipMain" data-v-69094eea>收藏成功</div></div>`),

  C('MessageBox', '14a02e30', 220, 'titlePopup：标题 + 正文/HTML + 可选勾选 + 三按钮位',
    [],
    `<div class="titlePopup" data-v-14a02e30><div class="popup-main" data-v-14a02e30><div class="title-top f-baseX" data-v-14a02e30><span class="popup-title" data-v-14a02e30>提示信息</span><div class="f-space" data-v-14a02e30></div></div><div class="title-content f-centerY mt10" data-v-14a02e30><div class="contentText" data-v-14a02e30><div>确定要删除吗？</div></div></div><div class="title-bottom" data-v-14a02e30><button class="input-box-btn" data-v-14a02e30>取消</button><button class="input-box-btn" data-v-14a02e30>确定</button></div></div></div>`),

  C('serveErr', 'e4b88616', 200, '强制遮罩、只有确定、返回 Promise',
    [],
    `<div class="titlePopup mask" data-v-e4b88616><div class="title-main" data-v-e4b88616><div class="title-top f-baseX" data-v-e4b88616><span class="f-size12" data-v-e4b88616>错误提示</span><div class="f-space" data-v-e4b88616></div></div><div class="title-content f-centerY mt10" data-v-e4b88616><div class="contentText" data-v-e4b88616>网络请求失败</div></div><div class="title-bottom" data-v-e4b88616><button class="input-box-btn input-box-btn-left input-box-btn-mr0" data-v-e4b88616>确定</button></div></div></div>`),

  C('Loading', '5e7609f0', 140, '全屏；8 球动画 + 文案；连点 6 次才关',
    [],
    `<div class="loading-main" data-v-5e7609f0><div class="load-container load8" data-v-5e7609f0><div class="loader" data-v-5e7609f0>Loading...</div><br><span data-v-5e7609f0>正在加载</span></div></div>`),

  C('SyncFile', '2db5cfee', 120, '进度条；到 100% 切成完成态并延时隐藏',
    ['iconwancheng1', 'iconguanbi'],
    `<div class="sync-mian" data-v-2db5cfee><div class="f-baseX" data-v-2db5cfee><svg class="icon" data-v-2db5cfee><use xlink:href="#iconguanbi"></use></svg><span class="ml10" data-v-2db5cfee>同步文件</span><div class="f-space" data-v-2db5cfee></div></div></div>`),

  C('Myvuescroll', '4d9edfd1', 120, '自定义滚动条（默认隐藏，移动时显示）',
    [],
    `<div class="w100" data-v-4d9edfd1><div class="myvuescroll" data-v-4d9edfd1>滚动容器内容<br>第二行<br>第三行<br>第四行<br>第五行</div></div>`),

  C('FreePanelBox', 'c2db11ce', 160, '自由面板：块可拖拽；尺寸写 inline（原版反例）',
    [],
    `<div class="w100 h100" data-v-c2db11ce><div class="freelayout w100 h100 f-alignNone f-arrayY" data-v-c2db11ce><div class="block-wrap relative" data-v-c2db11ce></div><div class="block-wrap relative" data-v-c2db11ce></div></div></div>`),

  C('baseIconInput', '6cf206c8', 120, 'baseInput + 左侧图标（ml4）',
    ['iconzhankaizhedie'],
    `<div class="base-input f-baseX" data-v-823349fe><span class="base-icon f-center f-full ml4" data-v-6cf206c8><svg class="icon" data-v-6cf206c8><use xlink:href="#iconzhankaizhedie"></use></svg></span><input class="f-space" data-v-823349fe value="左侧带图标"></div>`),

  /* 新增：下拉展开态（base-dropdown-menu + $menu 面板） */
  C('dropdown-open', '95e43a5a', 200, '下拉展开：触发器 + 面板（面板来自 menu 组件）',
    ['iconzhankaizhedie'],
    `<div class="w100" data-v-95e43a5a><div class="base-dropdown-menu f-baseX" data-v-95e43a5a><p class="f-space overflow-text" data-v-95e43a5a>字体家族</p><svg class="icon f-full" data-v-95e43a5a><use xlink:href="#iconzhankaizhedie"></use></svg></div><div class="menu" data-v-f59b9b2c><div><div class="menu-item f-baseX" data-v-f59b9b2c><p class="menu-text" data-v-f59b9b2c>思源黑体</p></div></div><div><div class="menu-item f-baseX sim-hover" data-v-f59b9b2c><p class="menu-text" data-v-f59b9b2c>苹方（hover）</p></div></div><div><div class="menu-item f-baseX" data-v-f59b9b2c><p class="menu-text" data-v-f59b9b2c>微软雅黑</p></div></div></div></div>`),

  /* 新增：抽屉（context-svg-wrap 触发器 + context-wrap 面板） */
  C('drawer', 'fb2f545a', 240, '抽屉：50×50 触发器 + 展开面板（context-wrap 180 宽）',
    ['iconzhankaizhedie'],
    `<div class="w100" data-v-fb2f545a><div class="context-svg-wrap f-center" data-v-fb2f545a><svg class="icon context-svg" data-v-fb2f545a><use xlink:href="#iconzhankaizhedie"></use></svg><span class="mark" data-v-fb2f545a></span></div><div class="context-svg-wrap f-center sim-hover" data-v-fb2f545a><svg class="icon context-svg" data-v-fb2f545a><use xlink:href="#iconzhankaizhedie"></use></svg></div><div class="context-wrap" data-v-03b6e29a>抽屉内容（180 宽）</div></div>`),

  /* 新增：标签 chip */
  C('tag', '', 120, '标签 chip：我的标签与标签弹层共用',
    [],
    `<span class="font-manage__tag" data-v-3f0b7d0e>客户A</span><span class="font-manage__tag" data-v-3f0b7d0e>海报</span>`),
];

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let doc = readFileSync(DOC, 'utf8');

// 移除旧的 legacy-frame 块（重新生成）
doc = doc.replace(/<div class="legacy-frame">[\s\S]*?<\/div>\s*(?=<h2>|<div class="meta">|$)/g, '');

let attached = 0;
for (const c of COMPONENTS) {
  const anchor = c.name === 'dropdown-open' ? 'base-dropdown-menu'
    : c.name === 'drawer' ? 'base-popup'
    : c.name === 'tag' ? 'Tips'
    : c.name;
  const re = new RegExp(`(<h2>\\d+\\.\\s*${anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^\\n]*</h2>)`);
  const m = re.exec(doc);
  if (!m) {
    console.log(`跳过（找不到节）: ${c.name}`);
    continue;
  }
  const inner = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}
body{margin:0;padding:14px;background:#363636;font:12px/1.5 "Microsoft Yahei",sans-serif;color:#c3c3c3;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
svg.sprite{position:absolute;width:0;height:0;overflow:hidden}
${cssFor(c.scoped)}
</style></head><body><svg class="sprite">${symbols(c.syms)}</svg>${c.dom}</body></html>`;
  const frame = `\n<div class="legacy-frame"><div class="legacy-frame__tag">真实渲染 · 原版 CSS + 原版 DOM + 原版 sprite${c.name !== anchor ? ' · ' + c.name : ''}</div><iframe height="${c.h}" srcdoc="${esc(inner)}"></iframe><p class="legacy-frame__desc">${c.desc}</p></div>`;
  doc = doc.slice(0, m.index + m[0].length) + frame + doc.slice(m.index + m[0].length);
  attached += 1;
}

if (!doc.includes('.legacy-frame{')) {
  doc = doc.replace(
    '</style>',
    `  .legacy-frame{border:1px solid #d8d8d8;border-radius:6px;margin:10px 0 4px;overflow:hidden}
  .legacy-frame__tag{font-size:10.5px;color:#888;background:#f7f7f7;padding:3px 8px;border-bottom:1px solid #e5e5e5}
  .legacy-frame iframe{width:100%;border:0;display:block;background:#363636}
  .legacy-frame__desc{margin:0;padding:6px 10px;font-size:11px;color:#6b6b6b;background:#fafafa}
</style>`
  );
}

writeFileSync(DOC, doc, 'utf8');
console.log(`插入 ${attached} 张真实渲染图（含 hover / 下拉展开 / 抽屉）→ ${DOC}`);
