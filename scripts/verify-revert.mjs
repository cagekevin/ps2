#!/usr/bin/env node
/**
 * 校验 `revert-labels.patch`：**结构等价**，不是“能编译”。
 *
 * 做法：把每个 hunk 里成对的 `- ... MSG.x.y ...` 与 `+ ... '字面量' ...` 拿出来，
 * 把 `-` 行里的 `MSG.x.y` 换成 `+` 行里那个字面量——**结果必须与 `+` 行逐字相同**。
 * 相同 ⇒ 这一处只换了载体（常量 → 字面量），行的其余部分（JSX 属性、函数参数位置）没动。
 *
 * 另附两项：
 *   1. 消息键（KEEP 名单）不该出现在 `-` 侧（否则是“把消息退回内联”）；
 *   2. 生产代码里 `fail(...)` / `toast.*(...)` 的中文仍是 0 处。
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const lines = readFileSync('revert-labels.patch', 'utf8').split('\n');

/** 消息键：绝不该被退 */
const MSG_KEYS = [
  'corrupt', 'badPayload', 'stale', 'badArgument', 'freePanelOffline', 'droppedSummary',
  'needZoom', 'needGap', 'needWidth', 'badExportPath', 'noPsd', 'needCopyCountInput', 'countMin',
  'cancel', 'cancelPick', 'qualityRange', 'ratioMin', 'ratioMax', 'opacityMax', 'tipRootFolder',
  'confirmBatch', 'confirmContinue', 'confirmTitle', 'pickImage', 'fillOn', 'fillOff'
];

/**
 * diff 会先把一个 hunk 里**连续的改动行**全部列成 `-`，再全部列成 `+`。
 * 所以不能拿相邻两行配对，要按「连续 - 块 / 连续 + 块」按序号配对。
 */
const problems = [];
let pairs = 0;
let orphan = 0;

for (let i = 0; i < lines.length; i++) {
  if (!lines[i].startsWith('-') || lines[i].startsWith('---')) continue;

  const minusBlock = [];
  while (i < lines.length && lines[i].startsWith('-') && !lines[i].startsWith('---')) {
    minusBlock.push(lines[i].slice(1));
    i++;
  }
  const plusBlock = [];
  while (i < lines.length && lines[i].startsWith('+') && !lines[i].startsWith('+++')) {
    plusBlock.push(lines[i].slice(1));
    i++;
  }
  i--;

  /* 纯删除块（消息表删键、删注释）：不含任何 `MSG.` 引用就不是调用点，跳过 */
  if (!minusBlock.some((l) => /MSG\./.test(l))) continue;

  if (minusBlock.length !== plusBlock.length) {
    orphan += 1;
    problems.push(
      `块长度不等（- ${minusBlock.length} / + ${plusBlock.length}），首个 - 行：${minusBlock[0]?.trim()}`
    );
    continue;
  }

  for (let k = 0; k < minusBlock.length; k++) {
    const minus = minusBlock[k];
    const plus = plusBlock[k];
    if (!/MSG\./.test(minus)) {
      if (minus !== plus) problems.push(`非 MSG 行被改动：\n      - ${minus.trim()}\n      + ${plus.trim()}`);
      continue;
    }
    pairs += 1;

    /**
     * 归一化后再比：把**所有字面量**和**所有 MSG 引用**都折成同一个占位符。
     * 相等 ⇒ 这一行除了「常量 ↔ 字面量」没别的变化（属性名、参数位置、括号都对得上）。
     */
    const norm = (s) =>
      s
        .replace(/'((?:[^'\\]|\\.)*)'/g, "'#'")
        .replace(/MSG\.(?:[a-zA-Z]+\.)+[a-zA-Z]+/g, "'#'")
        .replace(/\s+/g, ' ')
        .trim();
    if (norm(minus) !== norm(plus)) {
      problems.push(`结构不等价：\n      - ${minus.trim()}\n      + ${plus.trim()}`);
    }
  }
}

/* 消息键误退 */
for (const line of lines) {
  if (!line.startsWith('-') || line.startsWith('---')) continue;
  for (const k of MSG_KEYS) {
    if (new RegExp(`MSG\\.(?:common\\.)?${k}(?![A-Za-z0-9_])`).test(line)) {
      problems.push(`消息键被误退：${k} ← ${line.trim()}`);
    }
  }
}

/* 生产代码 fail/toast 内联中文 */
let inline = -1;
try {
  const out = execFileSync(
    'bash',
    ['-lc',
      `grep -rnE "fail(WithDetail)?\\('[A-Z_]+', *'[^']*[\\u4e00-\\u9fa5]|toast\\.(error|info)\\('[^']*[\\u4e00-\\u9fa5]" src --include='*.ts' --include='*.tsx' | grep -v '\\.test\\.' | grep -v 'types/messages.ts' | grep -vE ':[0-9]+: *\\*' | grep -vE ':[0-9]+: *//' | wc -l`],
    { encoding: 'utf8' }
  );
  inline = Number(out.trim());
} catch {
  inline = -1;
}

console.log(`结构等价：成对 ${pairs} 组，问题 ${problems.length} 个，块长度不等 ${orphan} 处`);
for (const p of problems.slice(0, 12)) console.log('  ✗ ' + p);
console.log(`生产代码 fail/toast 内联中文：${inline} 处（应为 0）`);
process.exit(problems.length || inline !== 0 ? 1 : 0);
