#!/usr/bin/env node
/**
 * 「不进表的直调」清单自检
 *
 * `core/ps/capability.ts` 的文件头列了 6 个**不经过能力表**、直接 `callJsx` 的调用，
 * 并写明「全仓就这 6 处，新增第 7 处前先问能不能写成表里一行」。
 * 那段话以前只是注释 —— 没人拦第 7 个。这个脚本把它变成闸。
 *
 * 判据：**所有以字面量名字调 `callJsx` 的地方，名字必须在这张白名单里。**
 * 执行器内部是 `callJsx(wire.fn, …)`（变量，不是字面量），所以不会被误命中。
 *
 * 新增一处时只有两条路：
 *   1. 写成能力表里一行（首选）—— 那就不需要改本文件；
 *   2. 确有理由不进表 —— 在下面 WHITELIST 里加名字 + 在 `capability.ts` 文件头那张表加一行，
 *      两处必须同时改（本脚本只认白名单，文件头的表是给人看的）。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const psDir = join(root, 'src', 'core', 'ps');

/**
 * 允许直调 `callJsx` 的 jsx 函数名（键）与它的理由（值，仅用于报错时提示）。
 * 顺序与 `capability.ts` 文件头那张表一致。
 */
const WHITELIST = new Map([
  ['ys_checkUseFont', 'err===1 要带宿主 msg 且不折失败（按可用处理）'],
  ['ys_AddStyle', 'err===1 折 PS_ERROR 而非 VALIDATION，且没有 false 分支'],
  ['mm_diag_vendor', '诊断专用，返回诊断报告而不是业务值'],
  ['Sys_setSystemEnvInfo', '装配期注入，是门的前置（过门会死锁）'],
  ['mm_layer_getState', '域内基础设施：被 requireLayerKind 消费，页面不直接触发；进表会让 layer 反向依赖 capabilities（环）'],
  ['mm_layer_getSelection', '同上：域内基础设施（requireSelection 的输入），不是对外动作']
]);

const files = readdirSync(psDir).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'));

const found = new Map();
for (const file of files) {
  /* **不豁免任何文件**：执行器与 `callDirect` 内部调 `callJsx` 用的都是变量（`wire.fn` / `fn`），
     本来就命不中；给 `capability.ts` 开整文件豁免反而会漏掉「执行器里偷偷写了个字面量直调」。 */
  const text = readFileSync(join(psDir, file), 'utf8');
  /*
   * 「直调」= 以**字面量名字**调 `callJsx` 或 `callDirect`。
   * 两个入口都算：`callDirect` 是 2026-10-31 收口出来的，它内部再调 `callJsx`（变量名，不命中）。
   * 变量名（`wire.fn` / 参数透传）不算 —— 那是执行器自己的路径。
   */
  for (const match of text.matchAll(/(?:callJsx|callDirect)\(\s*'([A-Za-z_][A-Za-z0-9_]*)'/g)) {
    const fn = match[1];
    if (!found.has(fn)) found.set(fn, []);
    found.get(fn).push(file);
  }
}

const problems = [];

for (const [fn, where] of found) {
  if (!WHITELIST.has(fn)) {
    problems.push(
      `${fn}（${where.join(', ')}）不在白名单里 —— 首选写成能力表一行（capabilities.ts），` +
        '确有理由不进表才在 tools/check-jsx-entry.mjs 与 capability.ts 文件头的表里同时登记'
    );
  }
}

/* 反方向：白名单里有、但代码里已经不再直调 —— 白名单比现实宽，等于闸失效 */
for (const fn of WHITELIST.keys()) {
  if (!found.has(fn)) {
    problems.push(`${fn} 在白名单里，但已经没有地方直调它了 —— 从白名单与文件头表里删掉`);
  }
}

if (problems.length) {
  console.error('直调清单自检失败：');
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exit(1);
}

console.log(`直调清单自检通过：${found.size} 处（与白名单一致）`);
