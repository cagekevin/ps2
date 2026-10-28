/**
 * 色板文件的读写（原版「发送到色板」四条命令的落点）。
 *
 * 文件是 `%APPDATA%/FengZiSeBan/userColor.ini`（原版 `sf.js:12` `g_FN.color`），
 * 顶层是数组，条目形状开放——由发送方（样式页）保证是库项形状。
 *
 * 语义照原版 `readToArray`（`app.v4.js:72714-72727`）与 app 的 `cep/data/swatch-repo.ts`：
 * - 文件不存在 / 空文件 = 空数组（首次发送不报错）——**已裁定的例外**：读不到 ≠ 有数据
 * - **坏 JSON 报错，不吞成空数组**——原版吞掉后写回会抹平用户色板（有意偏离，照 app）
 * - 写走 `repo/json-file.ts` 的唯一读改写（`.bak` + 串行）
 */
import { type Result } from '../types/result';
import { decodeArray } from '../types/decode-list';
import { updateJsonFile } from './json-file';

/** 色板文件名（原版 `g_FN.color`） */
const SWATCH_FILE = 'userColor.ini';
const ROOT = 'swatch';

/** 色板文件顶层必须是数组；项不校验（写路径原样保留未知键）。判据复用 `decodeArray` */
function decodeSwatch(raw: unknown): Result<unknown[]> {
  return decodeArray(raw);
}

/**
 * 读-改-写色板。`missing` 是色板既有裁定的显式落地：文件不存在按空数组继续。
 * 其余读失败（坏 JSON / IO）不写盘。
 */
export function updateSwatchItems(
  mutator: (items: unknown[]) => unknown[] | null
): Promise<Result<void>> {
  return updateJsonFile(SWATCH_FILE, ROOT, '色板文件', decodeSwatch, mutator, {
    emptyAs: () => [],
    missing: () => []
  });
}
