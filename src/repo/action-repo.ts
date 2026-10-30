/**
 * 【范本】动作库两个数据文件的唯一读写入口
 *
 * 文件都在 `legacy` 根（`%APPDATA%\SheJiZhuLi`，官方数据目录，不新开目录）：
 *   sj_dzStoreInfo.json  根是**对象** `{ index, list: [{ name, fileName }] }`
 *   <fileName>           根是**裸数组** `[{ groupName, show, list: [{ group, name, alias? }] }]`
 *   preset/动作库-设计助理预设.dzx  扩展目录里的自带预设（随包发布，`tools/deploy.mjs` 会带过去）
 *
 * 缺失策略不一样，别对调：
 *   索引     —— 缺失 = 首次运行，读回「默认仓库」但**不写盘**；第一次改才显式创建
 *   仓库文件 —— 缺失 = 首次运行，读回「默认分组」但**不写盘**
 *
 * 坏 JSON / 结构不符一律 `CORRUPT`，**不回落默认值**：回落会把用户动作库洗成默认分组。
 *
 * **写序**：`applyImport` 先写仓库文件、最后写索引（索引是入口，不能先指向不存在的文件）；
 * 失败即停、不回滚、不删旧文件（`05` §3.3）。
 */

import { getExtensionPath } from '../core/cep/bridge';
import {
  readTextAt,
  readTextResult,
  removeFile,
  writeTextAtAtomic,
  writeTextAtomic,
  type StorageRoot
} from '../core/storage';
import {
  decodeIndex,
  decodeLibrary,
  defaultIndex,
  defaultLibrary,
  newWarehouseFileName,
  type ActionGroup,
  type WarehouseIndex
} from '../domain/action-library';
import { MSG } from '../types/messages';
import type { Dropped } from '../types/decode-list';
import { parseJson } from '../types/json';
import { fail, failWithDetail, ok, type Result } from '../types/result';
import {
  readJsonFile,
  readOrEmpty,
  updateOrCreateJsonFile,
  type JsonMutator
} from './json-file';

const ROOT: StorageRoot = 'legacy';

/** 索引文件名（官方 `sj_dzStoreInfo.json`）；云同步拼快照路径也 import 它，不另写一份字面量 */
export const ACTION_INDEX_FILE = 'sj_dzStoreInfo.json';

/**
 * 索引缺失时用的**确定性**文件名。
 *
 * 官方用 `sj_dz + 唯一串`，但那只在「真正创建」时需要；读操作不许写盘，
 * 名字若每次随机，页面每刷新一次仓库文件名就变一次。第一次写时就用这个名字创建。
 */
const DEFAULT_FILE = 'sj_dz.json';

/** 自带预设（随包发布） */
const PRESET_FILE = 'preset/动作库-设计助理预设.dzx';

/** 索引文件的 decode 适配：`json-file` 只认 `Result<T>`，`dropped` 在索引上不展示，丢弃即可 */
function decodeIndexFile(raw: unknown): Result<WarehouseIndex> {
  const decoded = decodeIndex(raw);
  if (decoded.status === 'error') return decoded;
  return ok(decoded.value.index);
}

/**
 * 仓库文件读视图：`groups` 给页面，`dropped` 给「N 项无法识别」提示。
 *
 * **没有 `fileName`**：文件名由索引决定，调用方拿它没用（写路径在 `updateLibrary` 内部自己取）。
 * 加一个没人读的字段，下一个实现就会以为「这里知道文件名」而去拼路径。
 */
export interface LibraryRead {
  groups: ActionGroup[];
  dropped: Dropped[];
}

function decodeLibraryFile(raw: unknown): Result<LibraryRead> {
  const decoded = decodeLibrary(raw);
  if (decoded.status === 'error') return decoded;
  return ok({ groups: decoded.value.groups, dropped: decoded.value.dropped });
}

export function readIndex(): Result<WarehouseIndex> {
  return readOrEmpty(
    readJsonFile(ACTION_INDEX_FILE, ROOT, '动作库索引', decodeIndexFile),
    () => ok(defaultIndex(DEFAULT_FILE))
  );
}

/**
 * 索引**原文**（`collectBundle` 内部用，不导出）。
 *
 * 不 `readIndex()` 之后 `JSON.stringify`：那会洗掉官方未知键与键序，上传一次丢一次。
 */
function readIndexText(): Result<string> {
  return readTextResult(ACTION_INDEX_FILE, ROOT);
}

export function updateIndex(mutator: JsonMutator<WarehouseIndex>): Promise<Result<void>> {
  return updateOrCreateJsonFile(ACTION_INDEX_FILE, ROOT, '动作库索引', decodeIndexFile, mutator, {
    missing: () => defaultIndex(DEFAULT_FILE)
  });
}

/** 读当前仓库文件（`index` 越界按 0 处理；越界不写盘，等下一次真正的写操作再落） */
export function readLibrary(): Result<LibraryRead> {
  const index = readIndex();
  if (index.status === 'error') return index;

  const entry = index.value.list[index.value.index] ?? index.value.list[0];
  if (!entry || !entry.fileName) {
    return ok({ groups: defaultLibrary(), dropped: [] });
  }

  const read = readOrEmpty(
    readJsonFile(entry.fileName, ROOT, `动作库「${entry.name}」`, decodeLibraryFile),
    () => ok({ groups: defaultLibrary(), dropped: [] })
  );
  if (read.status === 'error') return read;

  return ok({ groups: read.value.groups, dropped: read.value.dropped, fileName: entry.fileName });
}

/** 改当前仓库文件：只给出 `groups`，文件名由索引决定（调用方不自己拼） */
export async function updateLibrary(
  mutator: (groups: ActionGroup[]) => Result<ActionGroup[] | null>
): Promise<Result<void>> {
  const index = readIndex();
  if (index.status === 'error') return index;

  const entry = index.value.list[index.value.index] ?? index.value.list[0];
  if (!entry || !entry.fileName) {
    return failWithDetail('IO_ERROR', MSG.corrupt, 'index:empty');
  }

  return updateOrCreateJsonFile(
    entry.fileName,
    ROOT,
    `动作库「${entry.name}」`,
    (raw) => {
      return decodeLibraryFile(raw);
    },
    (current) => {
      const next = mutator(current.groups);
      if (next.status === 'error') return next;
      if (!next.value) return ok(null);
      /* 逐字段显式列出，不 `{...current}` 一把带过：写回时 `dropped` 只是随行记账 */
      return ok({ groups: next.value, dropped: current.dropped });
    },
    { missing: () => ({ groups: defaultLibrary(), dropped: [] }) }
  );
}

/**
 * 新建仓库：生成唯一文件名 + 加进索引，**不切换当前仓库**（官方删除与新建都不切）。
 * 默认名「未命名分组」照抄官方（`05` §0.2），这正是「名字叫分组、其实是仓库」那处。
 */
export function createWarehouse(): Promise<Result<void>> {
  return updateIndex((current) =>
    ok({
      index: current.index,
      list: [
        ...current.list,
        {
          name: '未命名分组',
          fileName: newWarehouseFileName(current.list.map((entry) => entry.fileName))
        }
      ]
    })
  );
}

/**
 * 删仓库：先删文件、再改索引（索引是入口，最后动）。
 *
 * 官方提示「最少保留一个分组哦」——那其实是「至少留一个仓库」，文案照抄（`05` §4.6）。
 */
export async function deleteWarehouse(at: number): Promise<Result<void>> {
  const index = readIndex();
  if (index.status === 'error') return index;

  const entry = index.value.list[at];
  if (!entry) return failWithDetail('VALIDATION', MSG.stale, `at:${at}`);
  if (index.value.list.length <= 1) return fail('VALIDATION', MSG.action.keepOneWarehouse);

  const removed = removeFile(entry.fileName, ROOT);
  if (removed.status === 'error') {
    return failWithDetail(removed.code, removed.reason, `${removed.detail} file:${entry.fileName}`);
  }

  return updateIndex((current) => {
    if (!current.list[at]) return failWithDetail('VALIDATION', MSG.stale, `at:${at}`);
    const list = current.list.filter((_, i) => i !== at);
    /* 删的正是当前项 → 回到第一个；否则保持原下标（后面的项会前移一格） */
    const nextIndex = current.index === at ? 0 : current.index > at ? current.index - 1 : current.index;
    return ok({ index: Math.min(nextIndex, list.length - 1), list });
  });
}

/**
 * 读某个仓库文件的**原文**（导出 `.dzx` 用）。
 *
 * 不 `JSON.stringify(readLibrary())`：那会把未知键、缩进、键序全洗掉，
 * 导出的预设回导时就与用户原来那份不一致了。
 */
export function readWarehouseText(fileName: string): Result<string> {
  return readTextResult(fileName, ROOT);
}

/**
 * 写一个仓库文件（**库目录**，不是用户选的路径）。
 *
 * 导入预设时用：文件名来自计划（可能是改名后的），内容是从 `.dzx` 里 base64 解出来的原文。
 * 与 `writeArchive` 分开：那个走用户选的绝对路径，这个走 `legacy` 根 —— 混用会把预设写进用户桌面。
 */
export function writeWarehouseFile(fileName: string, text: string): Promise<Result<void>> {
  return writeTextAtomic(fileName, text, ROOT);
}

/* ---------------- 整包（云同步的两个出入口） ---------------- */

/**
 * 一整份动作库：索引原文 + 索引列出的每个仓库文件原文。
 *
 * 全是**原文**（不是 re-serialize）：云同步只负责搬运，解析后的形状由下载端自己验。
 */
export interface ActionBundle {
  indexText: string;
  files: { name: string; text: string }[];
}

/**
 * 收集整包：索引里列出几个仓库就读几个。
 *
 * **任一读不到就整体失败**（不拿默认值顶）：拿默认值上传会把云端的库洗成「默认分组」。
 * 失败码原样透传（`NOT_FOUND` / `IO_ERROR`），`detail` 追加文件名。
 */
export function collectBundle(): Result<ActionBundle> {
  const indexText = readIndexText();
  if (indexText.status === 'error') return indexText;

  const parsed = parseJson(indexText.value, '动作库索引');
  if (parsed.status === 'error') return parsed;

  const index = decodeIndexFile(parsed.value);
  if (index.status === 'error') return index;

  const files: { name: string; text: string }[] = [];
  for (const entry of index.value.list) {
    if (!entry.fileName) return failWithDetail('CORRUPT', MSG.corrupt, 'index.list.fileName');

    const text = readWarehouseText(entry.fileName);
    if (text.status === 'error') {
      return failWithDetail(text.code, text.reason, `${text.detail} file:${entry.fileName}`);
    }
    files.push({ name: entry.fileName, text: text.value });
  }

  return ok({ indexText: indexText.value, files });
}

/**
 * 整包写回（云同步下载）。
 *
 * 两类文件分开写，顺序固定：**先仓库文件、最后索引**（索引是入口，不能先指向不存在的文件）。
 * 写之前**全量校验**：索引里的每个仓库文件都要在载荷里且能解码，一条不合格就一个文件都不写；
 * 中途写失败即停（`.bak` 兜底已写的那几份），**不回滚、不删旧文件**。
 */
export async function applyBundle(bundle: ActionBundle): Promise<Result<void>> {
  const parsed = parseJson(bundle.indexText, '动作库索引');
  if (parsed.status === 'error') return parsed;

  const index = decodeIndexFile(parsed.value);
  if (index.status === 'error') return index;

  const byName = new Map(bundle.files.map((file) => [file.name, file.text]));

  const writes: { name: string; text: string }[] = [];
  for (const entry of index.value.list) {
    const text = byName.get(entry.fileName);
    if (text === undefined) return failWithDetail('CORRUPT', MSG.corrupt, `missing:${entry.fileName}`);

    const library = parseJson(text, `动作库「${entry.name}」`);
    if (library.status === 'error') return library;

    const decoded = decodeLibrary(library.value);
    if (decoded.status === 'error') return decoded;

    writes.push({ name: entry.fileName, text });
  }

  for (const file of writes) {
    const written = await writeWarehouseFile(file.name, file.text);
    if (written.status === 'error') {
      return failWithDetail(written.code, written.reason, `${written.detail} file:${file.name}`);
    }
  }

  return writeTextAtomic(ACTION_INDEX_FILE, bundle.indexText, ROOT);
}

/* ---------------- `.dzx`（用户选路径：`CONVENTIONS` §5 授权例外） ---------------- */

export function readArchive(path: string): Result<string> {
  return readTextAt(path);
}

export async function writeArchive(path: string, text: string): Promise<Result<void>> {
  return writeTextAtAtomic(path, text);
}

/** 自带预设：扩展目录下的固定相对路径（不猜原厂 roaming 路径，偏离 A-4） */
export function readPreset(): Result<string> {
  const path = `${getExtensionPath()}/${PRESET_FILE}`;
  const text = readTextAt(path);
  if (text.status === 'error') return text;
  return text;
}
