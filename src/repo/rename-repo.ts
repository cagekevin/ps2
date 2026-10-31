/**
 * 【范本】单文件预设仓库（重命名预设）：`sj_cmmRename.ini`（官方 `sj_*` → `legacy` 根）+ `.cmm` 归档
 *
 * 文件名后缀是 `.ini`、内容是 **JSON 裸数组**——照参考实现，别改成 `.json`
 * （少一处对不上的名字，不省事）。
 *
 * 三个入口分工（与 `repo/json-file` 的三条「文件不存在」语义对应）：
 *   `readPreset`    —— 缺失 = 种子（**不写盘**，`readOrEmpty` 一条路）
 *   `updatePreset`  —— 用户主动改预设：不存在 = 首次创建
 *   `replacePreset` —— `.cmm` 导入：整份替换（先校验完再调，`.bak` 兜底）
 *
 * 写路径**不保 `dropped`**：`decodeRenamePreset` 读视图会跳过坏组/坏项，
 * 写回时按解码后的预设整份落盘（与 `repo/action-repo` 同形状）。所以页面必须把
 * 「N 项无法识别」显示出来——用户看到提示才知道一改就会把读不出的项洗掉。
 */

import { readTextAt, writeTextAtAtomic, type StorageRoot } from '../core/storage';
import { decodeRenamePreset, seedPreset, type RenamePreset, type RenamePresetRead } from '../domain/rename';
import { ok, type Result } from '../types/result';
import {
  readJsonFile,
  readOrEmpty,
  replaceJsonFile,
  updateOrCreateJsonFile,
  type JsonMutator
} from './json-file';

/** 官方数据根（`sj_*` 都在这里；本工具自己的数据在 `data`） */
const ROOT: StorageRoot = 'legacy';
const PRESET_FILE = 'sj_cmmRename.ini';
const LABEL = '重命名预设';

/**
 * 写路径用的解码：只保留**预设本体**。
 *
 * 文件里存的就是裸数组，`T` 必须等于写出去的东西——把 `{ preset, dropped }`
 * 直接当 `T` 写下去，文件格式当场变成对象（`dropped` 只是读视图的记账）。
 */
function decodePresetFile(raw: unknown): Result<RenamePreset> {
  const decoded = decodeRenamePreset(raw);
  if (decoded.status === 'error') return decoded;
  return ok(decoded.value.preset);
}

/** 读预设：文件不存在 → 种子（不写盘）；坏文件 → `CORRUPT`，**不回落种子** */
export function readPreset(): Result<RenamePresetRead> {
  return readOrEmpty(readJsonFile(PRESET_FILE, ROOT, LABEL, decodeRenamePreset), () =>
    ok({ preset: seedPreset(), dropped: [] })
  );
}

/** 读-改-写；`ok(null)` = 不需要写。读失败不执行修改函数（不把默认值写回用户文件） */
export function updatePreset(
  mutator: (preset: RenamePreset) => Result<RenamePreset | null>
): Promise<Result<void>> {
  const write: JsonMutator<RenamePreset> = (current) => mutator(current);
  return updateOrCreateJsonFile(PRESET_FILE, ROOT, LABEL, decodePresetFile, write, {
    missing: seedPreset
  });
}

/**
 * 整份替换（`.cmm` 导入）。
 *
 * 调用前必须先解析校验通过（`commands/rename.importPreset`）：存档坏了就等于没导入，
 * 目标文件一个字节都不该动。覆盖本身是用户明确的动作，`.bak` 由 `json-file` 的写入留。
 */
export function replacePreset(preset: RenamePreset): Promise<Result<void>> {
  return replaceJsonFile(PRESET_FILE, ROOT, preset);
}

/* ---------------- `.cmm`（用户选路径：`CONVENTIONS` §3 授权例外） ---------------- */

export function readArchive(path: string): Result<string> {
  return readTextAt(path);
}

export async function writeArchive(path: string, text: string): Promise<Result<void>> {
  return writeTextAtAtomic(path, text);
}
