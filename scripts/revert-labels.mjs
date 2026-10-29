#!/usr/bin/env node
/**
 * 把「界面文字」从 `src/types/messages.ts` 退回调用点 —— **以 patch 的形式**，不裸改文件。
 *
 * 为什么不直接写文件：替换脚本“自检 0 处坏串”证明不了什么。这里改成：
 *   1. 在内存里算出改后文本，写 `.after` 临时文件；
 *   2. 用 `diff -u` 生成标准补丁 `revert-labels.patch`；
 *   3. 试运行只打印补丁（可逐 hunk 看）；`--apply` 时先 `git apply --check`，通过才 `git apply`。
 * 这样每一处改动都是一行 `- MSG.x` / `+ '字面量'`，能看、能拒、能回滚（`git checkout -- .`）。
 *
 * 口径（`CONVENTIONS`）：`MSG` 只放完整消息（失败/确认/成功/进度/空态/校验）；
 * label / title / placeholder / 选项名 / 文件名字 / 默认名 留在组件或调用点。
 *
 * 用法：
 *   node scripts/revert-labels.mjs            # 生成并打印补丁（不改任何文件）
 *   node scripts/revert-labels.mjs --apply    # git apply --check 后真正打上
 */
import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MSG_REL = 'src/types/messages.ts';
const MSG_FILE = join(ROOT, MSG_REL);
const PATCH = join(ROOT, 'revert-labels.patch');
const APPLY = process.argv.includes('--apply');

/** 明确「是消息」的键；表里其余的都按界面文字退回 */
const KEEP = new Set([
  'corrupt', 'badPayload', 'stale', 'badArgument', 'freePanelOffline', 'droppedSummary',
  'needZoom', 'needGap', 'needWidth', 'badExportPath', 'noPsd', 'needCopyCountInput', 'countMin',
  'cancel', 'cancelPick', 'qualityRange', 'ratioMin', 'ratioMax', 'opacityMax',
  'progressLinkSmart', 'progressLinkBack', 'progressProcessing', 'progressExportFirst',
  'progressExportSecond', 'tipRootFolder', 'confirmTitle', 'confirmBatch', 'confirmContinue',
  'progressEmbedMulti', 'progressImportMulti', 'progressExport', 'pickImage', 'fillOn', 'fillOff',
  'needGroupName', 'needNewGroupName', 'keepOneWarehouse', 'emptyGroup',
  'doneDelete', 'doneCreate', 'doneRename', 'doneExport', 'doneImport', 'doneAppend',
  'importTitle', 'importReplaceAsk', 'importContinue', 'readingActions', 'guideTitle', 'guideAsk', 'guideImport',
  'noWarehouse', 'gradientNoData', 'doneAdded', 'doneAddedForeground', 'doneGroupCreated',
  'doneToSwatch', 'doneAppendSwatch', 'donePickToGroup', 'doneImport', 'doneExportAll',
  'doneExportCurrent', 'doneReorder', 'doneReorderGroup', 'parseImageFailed', 'dropOneImage',
  'confirmDeleteMessage', 'pickTimeout', 'emptyLog', 'emptyCommonGrid', 'cleared',
  'clearTitle', 'clearMessage', 'clearConfirm', 'nothingToCopy', 'reachable',
  'needButtonPadding', 'needPresetName', 'fontSizePositive', 'leadingNotNegative', 'trackingNumber',
  'hierarchySizePositive', 'copyStyleFirst', 'noTextToTranslate', 'translateLimit',
  'missingPostScript', 'keepOnePreset', 'keepOneQuickFont', 'noPresetToOverwrite',
  'fontNotInSystem', 'starRange', 'tagNameEmpty', 'tagsExported', 'noLibraryFile'
]);

const NS = ['common', 'action', 'style', 'font', 'home'];

function parseMsg(text) {
  const out = [];
  for (const ns of NS) {
    const block = new RegExp(`\\n  ${ns}: \\{([\\s\\S]*?)\\n  \\}`, 'm').exec(text);
    if (!block) continue;
    const re = /^ {4}([a-zA-Z]+): '((?:[^'\\]|\\.)*)'/gm;
    let m;
    while ((m = re.exec(block[1]))) out.push({ ns, key: m[1], value: m[2] });
  }
  const topRe = /^ {2}([a-zA-Z]+): '((?:[^'\\]|\\.)*)'/gm;
  let t;
  while ((t = topRe.exec(text))) out.push({ ns: '', key: t[1], value: t[2] });
  return out;
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.(ts|tsx)$/.test(name)) files.push(p);
  }
  return files;
}

const msgText = readFileSync(MSG_FILE, 'utf8');
const revert = parseMsg(msgText)
  .filter((e) => !KEEP.has(e.key))
  .sort((a, b) => b.key.length - a.key.length); // 长的先换，防前缀吃掉（exSaveTo / exSaveToDesktop）

const patchChunks = [];
function emitPatch(absPath, afterText) {
  const rel = relative(ROOT, absPath);
  const tmp = absPath + '.after';
  writeFileSync(tmp, afterText);
  try {
    const out = execFileSync('diff', ['-u', '--label', `a/${rel}`, '--label', `b/${rel}`, absPath, tmp], {
      encoding: 'utf8'
    });
    if (out.trim()) patchChunks.push(out);
  } catch (err) {
    /* diff 退出码 1 = 有差异，正常；其它错误才抛 */
    if (err.status === 1 && err.stdout) patchChunks.push(err.stdout);
    else throw err;
  } finally {
    unlinkSync(tmp);
  }
}

let replaced = 0;
const changed = [];
for (const file of walk(join(ROOT, 'src'))) {
  if (file === MSG_FILE) continue;
  let text = readFileSync(file, 'utf8');
  const before = text;
  for (const e of revert) {
    const ref = `MSG.${e.ns ? e.ns + '.' : ''}${e.key}`;
    const re = new RegExp(ref.replace(/\./g, '\\.') + '(?![A-Za-z0-9_])', 'g');
    const hit = (text.match(re) || []).length;
    if (!hit) continue;
    text = text.replace(re, `'${e.value}'`);
    replaced += hit;
  }
  if (text !== before) {
    changed.push(relative(ROOT, file));
    emitPatch(file, text);
  }
}

/* 消息表本身：删掉这些键（连同其上一行注释） */
let nextMsg = msgText;
for (const e of revert) {
  const re = new RegExp(`\\n(?: {2,4}/\\*\\*[^\\n]*\\*/\\n)? {2,4}${e.key}: '[^']*',?`, 'm');
  nextMsg = nextMsg.replace(re, '');
}
if (nextMsg !== msgText) {
  changed.push(MSG_REL);
  emitPatch(MSG_FILE, nextMsg);
}

const patch = patchChunks.join('');
writeFileSync(PATCH, patch);

const hunks = (patch.match(/^@@/gm) || []).length;
const minus = (patch.match(/^-[^-]/gm) || []).length;
const plus = (patch.match(/^\+[^+]/gm) || []).length;
console.log(`待退键 ${revert.length}｜受影响文件 ${changed.length}｜替换 ${replaced} 处`);
console.log(`补丁：${PATCH.replace(ROOT, '')}  hunk ${hunks}｜- ${minus} 行｜+ ${plus} 行`);

if (!APPLY) {
  const head = patch.split('\n').slice(0, 40).join('\n');
  console.log('\n----- 补丁开头（前 40 行）-----');
  console.log(head);
  console.log('\n（未改任何文件；加 --apply 由 git apply 打上）');
} else {
  try {
    execFileSync('git', ['apply', '--check', PATCH], { cwd: ROOT, stdio: 'pipe' });
  } catch (err) {
    console.error('\n❌ git apply --check 未通过，未改动任何文件：');
    console.error(String(err.stderr || err.message));
    process.exit(1);
  }
  execFileSync('git', ['apply', PATCH], { cwd: ROOT, stdio: 'inherit' });
  console.log('\n✅ 已打上补丁（撤回：git checkout -- . 或 git apply -R ' + 'revert-labels.patch）');
}
