#!/usr/bin/env node
/**
 * `npm run check` 的最后一步：把那三问原样打给正在交付的人（或 AI）。
 *
 * 这是**提醒**，不是闸。所以：
 * - 读不到文件、截不到文案时静默跳过，**绝不让 check 变红** ——
 *   一个提醒失败却要人回头修提醒，比没有提醒更烦。
 * - 文案从 `AGENTS.md` 原样截取，不在这里写第二份。
 */
import { readFileSync } from 'node:fs';

const START = '**绿 ≠ 对。**';
const END = '回去删掉其中一条。**';

let reminder = '';

try {
  const agents = readFileSync('AGENTS.md', 'utf8');
  const start = agents.indexOf(START);
  const end = agents.indexOf(END);
  if (start !== -1 && end !== -1) {
    reminder = agents.slice(start, end + END.length);
  }
} catch {
  /* 读不到就当没有提醒，不影响交付 */
}

if (!reminder) {
  console.log('（本次没有交付提醒：AGENTS.md 里那三问已改名或删除）');
  process.exit(0);
}

const STYLE = process.stdout.isTTY
  ? { bold: '\u001b[1m', yellow: '\u001b[33m', red: '\u001b[31m', reset: '\u001b[0m' }
  : { bold: '', yellow: '', red: '', reset: '' };

const bar = '━'.repeat(64);

console.log(`
${STYLE.red}${bar}${STYLE.reset}
${STYLE.bold}${STYLE.red} check 全绿 ≠ 做完。把下面三问的答案写进你给用户的回答里：${STYLE.reset}
${STYLE.red}${bar}${STYLE.reset}
${STYLE.yellow}${reminder}${STYLE.reset}
${STYLE.red}${bar}${STYLE.reset}
`);
