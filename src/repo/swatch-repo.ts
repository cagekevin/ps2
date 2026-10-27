/**
 * 色板文件的读写（原版「发送到色板」四条命令的落点）。
 *
 * 文件是 `%APPDATA%/FengZiSeBan/userColor.ini`（原版 `sf.js:12` `g_FN.color`），
 * 顶层是数组，条目形状开放——由发送方（样式页）保证是库项形状。
 *
 * 语义照原版 `readToArray`（`app.v4.js:72714-72727`）与 app 的 `cep/data/swatch-repo.ts`：
 * - 文件不存在 / 空文件 = 空数组（首次发送不报错）——**已裁定的例外**：读不到 ≠ 有数据，
 *   首次使用是正常态，返回 ok([]) 不是降级
 * - **坏 JSON 报错，不吞成空数组**——原版吞掉后写回会抹平用户色板（有意偏离，照 app）
 * - 写走 `writeTextAtomic`（.bak 备份 + 串行），写失败调用方必须提示
 */
import { readTextResult, writeTextAtomic } from '../core/storage';
import { parseJson } from '../types/json';
import { fail, ok, type Result } from '../types/result';

/** 色板文件名（原版 `g_FN.color`） */
const SWATCH_FILE = 'userColor.ini';

/** 读色板数组；文件不存在 = 空数组，坏 JSON = CORRUPT（绝不返回空数组冒充） */
export function readSwatchItems(): Result<unknown[]> {
  const outcome = readTextResult(SWATCH_FILE, 'swatch');
  if (outcome.status === 'error') {
    /* 文件不存在 = 首次使用（上面的裁定例外）；其余失败原样上抛 */
    if (outcome.code === 'NOT_FOUND') return ok([]);
    return outcome;
  }

  const text = outcome.value.trim();
  if (text === '') return ok([]);

  const parsed = parseJson(text, '色板文件');
  if (parsed.status === 'error') return parsed;
  if (!Array.isArray(parsed.value)) {
    return fail('CORRUPT', '色板文件不是数组');
  }
  return ok(parsed.value);
}

/** 写色板全文（整份替换）；旧内容自动进 .bak */
export function writeSwatchItems(items: unknown[]): Promise<Result<void>> {
  return writeTextAtomic(SWATCH_FILE, JSON.stringify(items), 'swatch');
}
