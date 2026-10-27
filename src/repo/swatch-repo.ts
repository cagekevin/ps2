/**
 * 色板文件的读写（原版「发送到色板」四条命令的落点）。
 *
 * 文件是 `%APPDATA%/FengZiSeBan/userColor.ini`（原版 `sf.js:12` `g_FN.color`），
 * 顶层是数组，条目形状开放——由发送方（样式页）保证是库项形状。
 *
 * 语义照原版 `readToArray`（`app.v4.js:72714-72727`）与 app 的 `cep/data/swatch-repo.ts`：
 * - 文件不存在 / 空文件 = 空数组（首次发送不报错）——**色板特有**，别的库文件 missing 是错误
 * - **坏 JSON 报 corrupt，不吞成空数组**——原版吞掉后写回会抹平用户色板（有意偏离，照 app）
 * - 写走 `writeTextAtomic`（.bak 备份 + 串行），写失败调用方必须提示
 *
 * 返回统一用 `ReadOutcome`：missing 分支在这里就折成空数组，调用方无需知道这个特例。
 */
import { readTextOutcome, stripBom, writeTextAtomic } from '../core/storage';
import type { ReadOutcome } from '../types/read';

/** 色板文件名（原版 `g_FN.color`） */
const SWATCH_FILE = 'userColor.ini';

/** 读色板数组；文件不存在 = 空数组，坏 JSON = corrupt（绝不返回空数组冒充） */
export function readSwatchItems(): ReadOutcome<unknown[]> {
  const outcome = readTextOutcome(SWATCH_FILE, 'swatch');
  /* 色板特有：missing 折成空数组（原版 readToArray 同语义） */
  if (outcome.status === 'missing') return { status: 'ok', value: [] };
  if (outcome.status !== 'ok') return outcome;

  const text = stripBom(outcome.value).trim();
  if (text === '') return { status: 'ok', value: [] };

  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      return { status: 'corrupt', reason: '色板文件不是数组' };
    }
    return { status: 'ok', value: parsed };
  } catch {
    return { status: 'corrupt', reason: '色板文件不是合法 JSON' };
  }
}

/** 写色板全文（整份替换）；旧内容自动进 .bak */
export function writeSwatchItems(items: unknown[]): Promise<boolean> {
  return writeTextAtomic(SWATCH_FILE, JSON.stringify(items), 'swatch');
}
