#!/usr/bin/env node
/**
 * 去色骨架化：把 src 下全部 css 里的颜色类声明删掉，只留骨架（布局 / 间距 / 尺寸 / 字号）。
 *
 * 是什么：一次性清理工具。删颜色、留结构——尺寸与骨架一字不动，只删颜色那一层。
 * 谁在用：开发者在改视觉时手动跑一次；不参与构建，不被 npm run check 调用。
 * 禁止：不要把它挂进 build / check；不要给它加「默认写盘」的行为。
 *
 * 用法：
 *   node tools/strip-colors.mjs                      # 默认 dry-run：只报告，不落盘
 *   node tools/strip-colors.mjs --dry                # 同上，显式声明
 *   node tools/strip-colors.mjs --write              # 真正落盘
 *   node tools/strip-colors.mjs --write --border=drop   # 连边框的线宽 / 线型一起删
 *   node tools/strip-colors.mjs --write --prune-comments # 连带删除紧贴被删声明上方的注释
 *   node tools/strip-colors.mjs --write --report=out.json # 另存机器可读报告
 *
 * 删除范围：
 *   1. 颜色类属性整条删：color / background* / border-*-color / box-shadow / text-shadow /
 *      filter / backdrop-filter / fill / stroke / outline-color / caret-color /
 *      accent-color / column-rule-color / border-image / mix-blend-mode
 *   2. 带颜色的简写（border / border-top / outline）：拆成 width + style，颜色分量丢弃
 *      （--border=drop 时整条删）
 *   3. tokens.css：色值 token（--mm-color-* / --mm-gray-* / 含色值的定义，以及引用它们的定义）整条删
 *
 * 保留：选择器结构、布局、间距、尺寸、字号、圆角、层级、动效 —— 一律不动。
 */
import { readFileSync, writeFileSync, readdirSync, statSync, renameSync, unlinkSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const srcDir = join(root, 'src');

/* ---------- 参数 ---------- */

const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(name);
const optValue = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const WRITE = hasFlag('--write');
const DRY = !WRITE;               // 缺省即 dry：只有显式 --write 才落盘
const BORDER_DROP = optValue('border') === 'drop';
const PRUNE_COMMENTS = hasFlag('--prune-comments');
const INCLUDE_TOKENS = optValue('tokens') !== 'off';
const REPORT_PATH = optValue('report');

/* ---------- 颜色判定 ---------- */

// 颜色类属性：整条删除
const COLOR_PROPS = new Set([
  'color', 'background', 'background-color', 'background-image', 'background-position',
  'background-size', 'background-repeat', 'background-origin', 'background-clip',
  'background-attachment', 'background-blend-mode', 'border-color', 'border-top-color',
  'border-right-color', 'border-bottom-color', 'border-left-color', 'border-block-color',
  'border-inline-color', 'border-block-start-color', 'border-block-end-color',
  'border-inline-start-color', 'border-inline-end-color', 'outline-color', 'box-shadow',
  'text-shadow', 'filter', 'backdrop-filter', 'fill', 'stroke', 'caret-color',
  'accent-color', 'column-rule-color', 'text-decoration-color', '-webkit-text-fill-color',
  'border-image', 'mix-blend-mode',
]);

// 边框类简写：拆 width + style，丢颜色
const BORDER_PROPS = new Set(['border', 'border-top', 'border-right', 'border-bottom', 'border-left']);
const OUTLINE_PROPS = new Set(['outline']);

// 简写属性 → 拆分后的长写属性名（border-bottom 不能按 '-' 拆，会碎成 border / bottom）
const FRAME_SIDES = {
  border: ['border'],
  'border-top': ['border-top'],
  'border-right': ['border-right'],
  'border-bottom': ['border-bottom'],
  'border-left': ['border-left'],
  outline: ['outline'],
};

const BORDER_STYLES = new Set([
  'none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset',
]);
const WIDTH_LITERAL = /^(0|thin|medium|thick|\d*\.?\d+(px|em|rem|pt|pc|%|vh|vw|vmin|vmax|ch|ex))$/i;
const COLOR_LITERAL = /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|hwb\(|lab\(|lch\(|oklab\(|oklch\(|color\(|color-mix\()/i;
const NAMED_COLORS = new Set([
  'transparent', 'currentcolor', 'white', 'black', 'red', 'green', 'blue', 'gray', 'grey',
  'orange', 'yellow', 'purple', 'pink', 'brown', 'cyan', 'magenta', 'silver', 'gold',
  'beige', 'ivory', 'khaki', 'salmon', 'tan', 'violet', 'indigo', 'lavender', 'plum',
  'orchid', 'turquoise', 'azure', 'crimson', 'aqua', 'lime', 'olive', 'navy', 'teal', 'maroon',
]);

// 值里引用色值 token 的写法：var(--mm-color-*) / var(--mm-gray-*) / var(--mm-blue-*) 等
const COLOR_TOKEN_REF = /^var\(\s*--[a-z0-9-]*(color|gray|grey|blue|red|green|yellow|shadow)[a-z0-9-]*\s*(,[\s\S]*)?\)$/i;

function isColorToken(token) {
  const t = token.trim();
  if (!t) return false;
  if (COLOR_LITERAL.test(t)) return true;
  if (NAMED_COLORS.has(t.toLowerCase())) return true;
  if (COLOR_TOKEN_REF.test(t)) return true;
  // var(--x, #fff)：兜底值是颜色也算
  return /#[0-9a-f]{3,8}\b/i.test(t) || /rgba?\(/i.test(t);
}

function isWidthToken(token) {
  const t = token.trim();
  if (WIDTH_LITERAL.test(t)) return true;
  // var(--mm-border-w) 这类尺寸 token
  return /^var\(\s*--[a-z0-9-]*(border-w|radius|width)[a-z0-9-]*\s*\)$/i.test(t);
}

/** 按顶层空白分词，括号内的空格不算分隔 */
function splitTopLevel(value) {
  const out = [];
  let depth = 0;
  let buf = '';
  for (let i = 0; i < value.length; i += 1) {
    const c = value[i];
    if (c === '(') depth += 1;
    if (c === ')') depth -= 1;
    if (depth === 0 && /\s/.test(c)) {
      if (buf) { out.push(buf); buf = ''; }
      continue;
    }
    buf += c;
  }
  if (buf) out.push(buf);
  return out;
}

/* ---------- CSS 解析（保留原文，改动靠删节点） ---------- */

function parseCss(text) {
  const root = { type: 'root', children: [] };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  let buf = '';
  let bufStart = 0;
  let i = 0;

  const flush = () => {
    const raw = buf;
    const leading = (raw.match(/^\s*/) || [''])[0];
    const content = raw.slice(leading.length).replace(/\s+$/, '');
    const start = bufStart + leading.length;
    buf = '';
    if (!content) {
      // 纯空白也要留住：它承载换行，丢了会让注释粘到上一行
      if (leading) top().children.push({ type: 'text', leading, content: '', start: bufStart });
      return;
    }
    const colon = content.indexOf(':');
    const parent = top();
    if (colon > 0 && parent.type !== 'root') {
      parent.children.push({
        type: 'decl',
        leading,
        content,
        start,
        prop: content.slice(0, colon).trim(),
        value: content.slice(colon + 1).trim(),
      });
    } else {
      parent.children.push({ type: 'text', leading, content, start });
    }
  };

  while (i < text.length) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '*') {
      flush();
      const end = text.indexOf('*/', i + 2);
      const stop = end < 0 ? text.length : end + 2;
      top().children.push({ type: 'comment', leading: '', content: text.slice(i, stop), start: i });
      i = stop;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === '\\') { j += 2; continue; }
        if (text[j] === c) break;
        j += 1;
      }
      if (!buf) bufStart = i;
      buf += text.slice(i, Math.min(j + 1, text.length));
      i = j + 1;
      continue;
    }
    if (c === '{') {
      // 选择器就是 '{' 之前的 buf，不能先 flush —— flush 会把它冲成 text 节点，选择器就没了
      const raw = buf;
      const leading = (raw.match(/^\s*/) || [''])[0];
      const node = { type: 'block', leading, prelude: raw.slice(leading.length).trim(), children: [] };
      top().children.push(node);
      stack.push(node);
      buf = '';
      bufStart = i + 1;
      i += 1;
      continue;
    }
    if (c === '}') {
      flush();
      if (stack.length > 1) stack.pop();
      i += 1;
      continue;
    }
    if (c === ';') {
      flush();
      i += 1;
      continue;
    }
    if (!buf) bufStart = i;
    buf += c;
    i += 1;
  }
  flush();
  return root;
}

function serialize(node) {
  if (node.type === 'root') return node.children.map(serialize).join('');
  if (node.type === 'block') {
    const inner = node.children.map(serialize).join('');
    return `${node.leading}${node.prelude}{${inner}}`;
  }
  if (node.type === 'decl') return `${node.leading}${node.content};`;
  return `${node.leading}${node.content}`;
}

/* ---------- 删除规则 ---------- */

/** border / outline 简写 → 拆出 width 与 style，丢掉颜色分量 */
function splitFrame(prop, value) {
  const tokens = splitTopLevel(value);
  const widths = tokens.filter(isWidthToken);
  const styles = tokens.filter((t) => BORDER_STYLES.has(t.trim().toLowerCase()));
  const colors = tokens.filter(isColorToken);
  if (!colors.length) return null;                 // 本来就没有颜色 → 原样保留
  const parts = [];
  for (const side of FRAME_SIDES[prop]) {
    if (widths.length) parts.push(`${side}-width: ${widths.join(' ')}`);
    if (styles.length) parts.push(`${side}-style: ${styles.join(' ')}`);
  }
  return parts.join('; ');
}

function classifyDecl(decl) {
  const prop = decl.prop.toLowerCase();
  if (COLOR_PROPS.has(prop)) return { kind: 'drop-color-prop' };
  if (BORDER_PROPS.has(prop) || OUTLINE_PROPS.has(prop)) {
    const frame = splitFrame(prop, decl.value);
    if (!frame) return { kind: 'keep' };
    if (BORDER_DROP) return { kind: 'drop-color-prop' };
    return { kind: 'rewrite-frame', text: frame };
  }
  return { kind: 'keep' };
}

/** 自定义属性：判定是否色值 token */
function isColorCustomProp(prop, value, colorPropNames) {
  const name = prop.toLowerCase();
  if (/^--(mm-)?(color|gray|grey|blue|red|green|yellow|shadow|accent|mask)/.test(name)) return true;
  const tokens = splitTopLevel(value);
  if (tokens.some(isColorToken)) return true;
  const refs = [...value.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)].map((m) => m[1]);
  return refs.some((r) => colorPropNames.has(r.toLowerCase()));
}

/* ---------- 处理单个文件 ---------- */

function processFile(file) {
  const raw = readFileSync(file, 'utf8');
  const bom = raw.charCodeAt(0) === 0xfeff;
  const text = bom ? raw.slice(1) : raw;
  const tree = parseCss(text);

  const removed = [];       // { line, prop, value, why }
  const rewrites = [];      // { line, prop, from, to }
  const orphanComments = [];

  // 先收集本文件里的自定义属性（tokens 处理用）
  const customProps = [];
  (function collect(node) {
    for (const child of node.children || []) {
      if (child.type === 'decl' && child.prop.startsWith('--')) customProps.push(child);
      if (child.type === 'block') collect(child);
    }
  })(tree);

  const colorPropNames = new Set(
    customProps
      .filter((d) => isColorCustomProp(d.prop, d.value, new Set()))
      .map((d) => d.prop.toLowerCase()),
  );

  (function walk(node) {
    const children = node.children || [];
    const dropIndexes = new Set();
    const replaceMap = new Map();

    children.forEach((child, index) => {
      if (child.type === 'block') { walk(child); return; }
      if (child.type !== 'decl') return;

      if (child.prop.startsWith('--')) {
        if (isColorCustomProp(child.prop, child.value, colorPropNames)) {
          dropIndexes.add(index);
          removed.push({ line: lineAt(text, child.start), prop: child.prop, value: child.value, why: '色值 token' });
        }
        return;
      }

      const verdict = classifyDecl(child);
      if (verdict.kind === 'drop-color-prop') {
        dropIndexes.add(index);
        removed.push({ line: lineAt(text, child.start), prop: child.prop, value: child.value, why: '颜色属性' });
      } else if (verdict.kind === 'rewrite-frame') {
        replaceMap.set(index, verdict.text);
        rewrites.push({ line: lineAt(text, child.start), prop: child.prop, from: child.value, to: verdict.text });
      }
    });

    // 剪掉被删声明上方紧贴的注释（--prune-comments 才做）
    if (PRUNE_COMMENTS) {
      for (const index of [...dropIndexes]) {
        // 向上找最近的有内容节点；中间只隔着空白就算紧贴
        let prev = index - 1;
        while (prev >= 0 && children[prev].type === 'text' && !children[prev].content.trim()) prev -= 1;
        if (prev >= 0 && children[prev].type === 'comment') {
          dropIndexes.add(prev);
          orphanComments.push(children[prev].content.replace(/\s+/g, ' ').slice(0, 60));
        }
      }
    }

    node.children = children.filter((child, index) => {
      if (dropIndexes.has(index)) return false;
      if (replaceMap.has(index)) {
        child.content = replaceMap.get(index);
      }
      return true;
    });
  })(tree);

  let out = serialize(tree);
  if (!out.trim()) {
    out = '/* 骨架化后本文件已无声明（颜色类声明已全部移除）；保留文件以维持既有 import。 */\n';
  }
  return { bom, out, removed, rewrites, orphanComments };
}

/** 节点在原文中的行号（用于报告定位） */
function lineAt(text, start) {
  return text.slice(0, Math.max(0, start)).split('\n').length;
}

/* ---------- 遍历 ---------- */

function walkFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else if (entry.name.endsWith('.css')) out.push(full);
  }
  return out;
}

const allCss = walkFiles(srcDir).sort();
const targets = allCss.filter((f) => {
  const rel = relative(root, f).replace(/\\/g, '/');
  if (rel === 'src/styles/tokens.css') return INCLUDE_TOKENS;
  return true;
});

const report = {
  mode: WRITE ? 'write' : 'dry',
  files: [],
  totals: { removed: 0, rewrites: 0, files: 0 },
  leftovers: [],
  drift: [],
  orphanComments: [],
};

for (const file of targets) {
  const rel = relative(root, file).replace(/\\/g, '/');
  const result = processFile(file);
  const changed = result.out !== readFileSync(file, 'utf8').replace(/^﻿/, '');
  report.totals.removed += result.removed.length;
  report.totals.rewrites += result.rewrites.length;
  if (result.removed.length || result.rewrites.length) report.totals.files += 1;
  report.orphanComments.push(...result.orphanComments.map((c) => ({ file: rel, comment: c })));
  report.files.push({
    file: rel,
    changed,
    removed: result.removed,
    rewrites: result.rewrites,
  });
}

// 残留引用：被删掉的 token 名若仍被**变换后生效声明**引用，界面会掉色（不报错，只提示）
// 扫的是变换结果，不是原文——原文里的引用本来就该被这次删除带走
const deletedTokens = new Set();
for (const entry of report.files) {
  for (const r of entry.removed) {
    if (r.prop.startsWith('--')) deletedTokens.add(r.prop.toLowerCase());
  }
}
for (const file of allCss) {
  const rel = relative(root, file).replace(/\\/g, '/');
  const out = processFile(file).out;
  const tree = parseCss(out);
  (function scan(node) {
    for (const child of node.children || []) {
      if (child.type === 'block') { scan(child); continue; }
      if (child.type === 'decl') {
        for (const m of child.value.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) {
          if (deletedTokens.has(m[1].toLowerCase())) {
            report.leftovers.push({
              file: rel,
              line: lineAt(out, child.start),
              token: m[1],
              text: `${child.prop}: ${child.value}`,
            });
          }
        }
      } else if (child.type === 'comment') {
        for (const m of child.content.matchAll(/(--[a-z0-9-]+)/gi)) {
          if (deletedTokens.has(m[1].toLowerCase())) {
            report.drift.push({ file: rel, line: lineAt(out, child.start), token: m[1] });
          }
        }
      }
    }
  })(tree);
}

/* ---------- 落盘 ---------- */

if (WRITE) {
  for (const entry of report.files) {
    if (!entry.changed) continue;
    const file = join(root, entry.file);
    const result = processFile(file);
    const body = (result.bom ? '﻿' : '') + result.out;
    const tmp = `${file}.strip-tmp`;
    writeFileSync(tmp, body, 'utf8');
    renameSync(tmp, file);
  }
}

/* ---------- 报告 ---------- */

const rel = (p) => relative(root, p).replace(/\\/g, '/');

console.log(`\n【去色骨架化】模式：${WRITE ? 'WRITE（会落盘）' : 'DRY（不落盘）'}`);
console.log(`扫描 ${allCss.length} 个 CSS 文件，目标 ${targets.length} 个（含 tokens.css：${INCLUDE_TOKENS ? '是' : '否'}）`);
console.log(`边框策略：${BORDER_DROP ? '整条删除' : '保留线宽 / 线型，丢颜色分量'}；注释剪除：${PRUNE_COMMENTS ? '开' : '关'}\n`);

for (const entry of report.files) {
  if (!entry.removed.length && !entry.rewrites.length) continue;
  console.log(`${entry.file}`);
  for (const r of entry.removed) console.log(`  - L${r.line}  ${r.prop}: ${r.value}    [${r.why}]`);
  for (const r of entry.rewrites) console.log(`  ~ L${r.line}  ${r.prop}: ${r.from}  =>  ${r.to}`);
  console.log('');
}

console.log(`合计：${report.totals.files} 个文件，删除 ${report.totals.removed} 条颜色声明，改写 ${report.totals.rewrites} 条边框简写`);

if (report.orphanComments.length) {
  console.log(`\n可能变成孤儿的注释（紧贴被删声明上方，共 ${report.orphanComments.length} 条，加 --prune-comments 可一并删）：`);
  for (const c of report.orphanComments.slice(0, 40)) console.log(`  - ${c.file}: ${c.comment}`);
  if (report.orphanComments.length > 40) console.log(`  … 其余 ${report.orphanComments.length - 40} 条见 JSON 报告`);
}

if (report.leftovers.length) {
  console.log(`\n残留色值 token 引用（${report.leftovers.length} 处生效声明仍引用已删 token，会掉色）：`);
  for (const l of report.leftovers) console.log(`  - ${l.file}:${l.line}  ${l.token}  ← ${l.text}`);
} else {
  console.log('\n残留色值 token 引用（生效声明）：0');
}
console.log(`注释中提及已删 token：${report.drift.length} 处（文档漂移，脚本不动注释，需人工判断）`);

if (DRY) {
  console.log('\nDRY 结束：未写入任何文件。确认报告无误后加 --write 落盘。');
} else {
  console.log('\nWRITE 结束：已落盘。用 git diff 复核；回滚用 git checkout -- src。');
}

if (REPORT_PATH) {
  writeFileSync(resolve(root, REPORT_PATH), JSON.stringify(report, null, 2), 'utf8');
  console.log(`JSON 报告：${REPORT_PATH}`);
}
