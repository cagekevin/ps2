#!/usr/bin/env node
/**
 * 【范本】PS 侧 jsx 返回形状探针
 *
 * 一条命令拿全部真实 raw。
 *
 * 用法：npm run probe:ps [-- --skip-slow] [-- --group=text] [-- --json]
 *
 * 【为什么存在】解析器（`core/ps/raw.ts`）的判据只能建立在**宿主实际返回什么**上。
 *   靠人点面板看日志，一次只能看到一个函数、还要等复现；靠猜，就会写出「返回 `{"code":"OK"}`
 *   被判成文件坏」这类假失败（真机 2026-10-30 踩过）。这里用 Photoshop COM 的 `DoJavaScript`
 *   直接批量问，AI 自己就能拿齐证据，不用人反复配合。
 *
 * 【一次调用跑完，不能拆】`jsx/vendor.jsx` 是 jsxbin，它定义的函数**活不过一次
 *   `DoJavaScript` 调用**（实测：上一次调用里 `$.evalFile` 完 `ps_onJsx` 是 function，
 *   下一次调用就 `Sys_setSystemEnvInfo 不是函数`）。所以加载 + 注入 + 全部探测必须在
 *   同一段脚本里，中间不许断开。
 *
 * 【只收集，不判定】输出是「函数 → 原始返回字符串」，**不做成功/失败分类**。
 *   分类只在 `core/ps/raw.ts` 一处做；探针里再判一次就是第二套判据。
 *
 * 【前置】
 *   - Windows + Photoshop 已运行（COM 只对已运行的实例有效）
 *   - 已 `npm run deploy`（读部署目录里的 jsx，保证验的是真跑的那份）
 *   - 文档里要有文字图层（`zt_*` 需要），脚本自动选中第一个；没有就跳过整组并说明
 *
 * 【会改文档】`zt_set*` 是真写：字号、字距、对齐都会变。用测试文档跑。
 *
 * 【已知不覆盖】`zt_createButton` / `zt_setTranslateText` / `cy_distributedByPitch`
 *   参数是对象或需要多选，v1 不自动造；需要时在 `TARGETS` 里补 `call`。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join, resolve } from 'node:path';

if (platform() !== 'win32') {
  console.error('只支持 Windows（用 Photoshop COM 的 DoJavaScript）');
  process.exit(1);
}

const root = resolve(import.meta.dirname, '..');
const manifest = readFileSync(join(root, 'CSXS', 'manifest.xml'), 'utf8');
const bundleId = /ExtensionBundleId="([^"]+)"/.exec(manifest)?.[1];
if (!bundleId) {
  console.error('manifest 缺少 ExtensionBundleId');
  process.exit(1);
}

/** 必须指向**部署目录**：验的是 PS 实际加载的那份 jsx，不是源码目录 */
const extDir = join(homedir(), 'AppData', 'Roaming', 'Adobe', 'CEP', 'extensions', bundleId).replace(
  /\\/g,
  '/'
);

/** 与 `core/ps/env.ts` 注入的同一份环境变量（官方 jsx 内部拼路径要用） */
const PS_ENV = {
  VUE_APP_BASE_SERVER: 'https://zhuli.gaoding.com',
  VUE_APP_WEBSITE_HOST: 'https://www.pszhuli.com',
  VUE_APP_ENVNAME: '',
  VUE_APP_CURRENTMODE: 'prod',
  VUE_APP_BASE_SYNC_SERVER: 'https://syncserver.pszhuli.com',
  VUE_APP_UMS: 'https://ums.gaoding.com',
  VUE_APP_BASE_CEP: 'https://cepapp.pszhuli.com',
  VUE_APP_USER_DIR: '/SheJiZhuLi',
  VUE_APP_OPTIMAL_DIR: '/Optimal',
  NODE_ENV: 'production',
  VUE_APP_CEP_VERSION: '3.6.2',
  VUE_APP_CEP_NAME: 'design',
  VUE_APP_CEP_PUB_TIME: '2022-06-28',
  VUE_APP_CEP_PUB_TIMESTAMP: '1656410553279',
  BASE_URL: ''
};

const TARGETS = [
  { group: 'layer', call: 'mm_layer_getState()' },
  /* 组本身：`mm_layer_kindOf` 曾经对组返回 unknown（LayerSet 没有 kind），这条钉住它 */
  { group: 'layer', need: 'GROUP', call: '(function(){return mm_layer_getState()})()' },
  { group: 'layer', call: 'mm_layer_getSelection()' },

  { group: 'text', need: 'TEXT', call: 'zt_getFontSimpleInfo()' },
  { group: 'text', need: 'TEXT', call: 'zt_getCurrentFontInfo()' },
  { group: 'text', need: 'TEXT', call: 'zt_getCurrentText()' },
  { group: 'text', need: 'TEXT', call: 'zt_setFontColor()' },
  { group: 'text', need: 'TEXT', call: 'zt_setFontName("ArialMT","Arial","Regular")' },
  { group: 'text', need: 'TEXT', call: 'layer_font_setFontSize(24)' },
  { group: 'text', need: 'TEXT', call: 'zt_setFontSize(24)' },
  { group: 'text', need: 'TEXT', call: 'layer_font_setLeading(24)' },
  { group: 'text', need: 'TEXT', call: 'zt_setFontWordSpacing(0)' },
  { group: 'text', need: 'TEXT', call: 'zt_setFontAllCaps(false)' },
  { group: 'text', need: 'TEXT', call: 'zt_setFontVision("opticalKern")' },
  { group: 'text', need: 'TEXT', call: 'zt_setFauxItali(false)' },
  { group: 'text', need: 'TEXT', call: 'zt_setFontAddBold(false)' },
  { group: 'text', need: 'TEXT', call: 'zt_setFontJustified(0)' },
  { group: 'text', need: 'TEXT', call: 'zt_setTextAlignment(0,false)' },
  { group: 'text', need: 'TEXT', call: 'zt_setHorizontalCenters(4)' },
  { group: 'text', need: 'TEXT', call: 'zt_verticalCenter(5)' },
  { group: 'text', need: 'TEXT', call: 'zt_setUpDownAlign(0)' },
  { group: 'text', need: 'TEXT', call: 'zt_setBackrgoudAlign(3)' },
  { group: 'text', need: 'TEXT', call: 'zt_alignHorizontal()' },
  { group: 'text', need: 'TEXT', call: 'zt_textBranchMerge(1)' },
  { group: 'text', need: 'TEXT', call: 'zt_switchFontDirection()' },

  { group: 'font', need: 'TEXT', call: 'ys_useFont("ArialMT")' },
  { group: 'font', need: 'TEXT', call: 'ys_checkUseFont("ArialMT")' },
  { group: 'font', need: 'TEXT', call: 'ztgl_setFont("ArialMT","Arial","Regular")' },
  { group: 'font', call: 'ztgl_initSystemList()', slow: true },

  { group: 'style', call: 'ys_getGradientInfo()' },
  {
    group: 'style',
    call: 'ps_onJsx(JSON.stringify({f:"ys_useStyleColor",arr:[{hex:"ff0000",c:0,m:100,y:100,k:0,isFill:true}],n:"probe"}))'
  },
  {
    group: 'style',
    need: 'SOLIDFILL',
    call: 'mm_style_applyShapeFill(JSON.stringify({color:{hex:"00ff00",c:100,m:0,y:100,k:0}}))'
  },
  {
    group: 'style',
    need: 'SOLIDFILL',
    call: 'mm_style_applyBorderColor(JSON.stringify({color:{hex:"0000ff",c:100,m:100,y:0,k:0}}))'
  },

  { group: 'action', call: 'dz_getActionList()' }
];

const skipSlow = process.argv.includes('--skip-slow');
const ensureText = process.argv.includes('--ensure-text');
/* 默认自建文档：靠「用户当前打开的那份」测，图层结构每次都不一样，结果不可比 */
const keepDoc = process.argv.includes('--keep-doc');
const fresh = !keepDoc;
const only = process.argv.find((arg) => arg.startsWith('--group='))?.slice('--group='.length);
const picked = TARGETS.filter((t) => (!only || t.group === only) && !(skipSlow && t.slow));

const pushLines = picked
  .map(
    (t) =>
      `push(${JSON.stringify(t.group)}, ${JSON.stringify(t.call)}, ${t.need ? JSON.stringify(t.need) : 'null'});`
  )
  .join('\n  ');

const script = `(function () {
  $.evalFile(${JSON.stringify(`${extDir}/jsx/main.jsx`)});
  $.evalFile(${JSON.stringify(`${extDir}/jsx/vendor.jsx`)});
  Sys_setSystemEnvInfo(${JSON.stringify(JSON.stringify(PS_ENV)).replace(/^"|"$/g, "'").replace(/\\"/g, '"')});
  if (!app.documents.length && !${fresh}) return JSON.stringify({ error: 'no-doc' });

  if (${fresh}) {
    app.documents.add(UnitValue(800, 'px'), UnitValue(600, 'px'), 72, 'probe',
      NewDocumentMode.RGB, DocumentFill.WHITE);
  }
  var doc = app.activeDocument;

  /*
   * 标准图层结构：每次跑都在这同一份结构上，结果才可比。
   * 普通 x2（多选场景要 ≥2）/ 文字 / 智能对象 / 分组；形状层用 ActionManager 造不稳，
   * 没有就由 TARGETS 的 need 分支标「跳过」，不假装测过。
   */
  if (${fresh}) {
    doc.artLayers.add().name = 'probe-normal-1';
    doc.artLayers.add().name = 'probe-normal-2';

    var txt = doc.artLayers.add();
    txt.kind = LayerKind.TEXT;
    txt.textItem.contents = 'probe';
    txt.name = 'probe-text';

    var smart = doc.artLayers.add();
    smart.name = 'probe-smart';
    doc.activeLayer = smart;
    executeAction(stringIDToTypeID('newPlacedLayer'), undefined, DialogModes.NO);

    var grp = doc.layerSets.add();
    grp.name = 'probe-group';
    grp.artLayers.add().name = 'in-group';
  }

  /* --ensure-text：只补文字层（--keep-doc 场景用） */
  if (${ensureText} && !${fresh}) {
    var hasText = false;
    for (var i = 0; i < doc.layers.length; i++) {
      if (String(doc.layers[i].kind).indexOf('TEXT') >= 0) { hasText = true; break; }
    }
    if (!hasText) {
      var made = doc.artLayers.add();
      made.kind = LayerKind.TEXT;
      made.textItem.contents = 'probe';
    }
  }

  var out = [];
  var picked = {};

  /* 先报本次文档里到底有什么，否则「跳过」分不清是没造出来还是没测 */
  var kinds = {};
  for (var j = 0; j < doc.layers.length; j++) {
    var kindName = String(doc.layers[j].kind);
    kinds[kindName] = (kinds[kindName] || 0) + 1;
  }
  out.push({ group: 'doc', call: 'kinds', raw: JSON.stringify(kinds) });

  function selectFirst(kind) {
    if (kind in picked) return picked[kind];
    picked[kind] = false;
    for (var i = 0; i < doc.layers.length; i++) {
      var layer = doc.layers[i];
      /* 组是 LayerSet，没有 kind 属性 —— 只能按 typename 找 */
      var hit = (kind === 'GROUP')
        ? (layer.typename === 'LayerSet')
        : (String(layer.kind).indexOf(kind) >= 0);
      if (hit) {
        doc.activeLayer = layer;
        picked[kind] = true;
        break;
      }
    }
    return picked[kind];
  }

  function push(group, call, need) {
    if (need && !selectFirst(need)) {
      out.push({ group: group, call: call, raw: '（跳过：文档里没有 ' + need + ' 图层）' });
      return;
    }
    var raw;
    try {
      var r = eval(call);
      raw = (typeof r === 'string') ? r : JSON.stringify(r);
      if (typeof raw === 'undefined') raw = 'undefined';
    } catch (e) {
      raw = 'error:' + ((e && e.message) ? e.message : String(e));
    }
    out.push({ group: group, call: call, raw: String(raw) });
  }

  ${pushLines}

  /* 自建文档跑完就关，不落盘：探针不该给用户留垃圾文档 */
  if (${fresh}) {
    try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e) {}
  }

  return JSON.stringify(out);
})()`;

const ps = [
  `$ps = [Runtime.InteropServices.Marshal]::GetActiveObject('Photoshop.Application')`,
  `$ps.DoJavaScript(@'`,
  script,
  `'@)`
].join('\n');

const encoded = Buffer.from(ps, 'utf16le').toString('base64');
const out = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024
}).replace(/\r?\n$/, '');

let rows;
try {
  rows = JSON.parse(out);
} catch {
  console.error('宿主返回的不是 JSON：');
  console.error(out);
  process.exit(1);
}

if (rows.error) {
  console.error('没有打开的文档：先开一个测试文档（至少含一个文字图层）');
  process.exit(1);
}

const width = Math.max(...rows.map((row) => row.call.length));
for (const row of rows) {
  console.log(`${row.group.padEnd(6)} ${row.call.padEnd(width)}  ${row.raw}`);
}

if (process.argv.includes('--json')) {
  console.log('\n' + JSON.stringify(rows, null, 2));
}
