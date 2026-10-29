/**
 * 字体数据访问：系统字体缓存 / 星级 / 标签 / 分类。
 *
 * 只做「文件 → Result」，不做业务判断、不碰 UI。
 * 写路径统一走 `repo/json-file.ts`：
 *   - 星级 / 标签第一次写入（文件确实不存在）走 `updateOrCreateJsonFile` 的创建分支
 *   - 其余走读-改-写，未知键原样保留（写路径读的是原始记录，不是视图模型）
 *
 * 文件都在 `legacy` 根（`%APPDATA%\SheJiZhuLi`）：这是官方客户端已有数据。
 */

import { restoreBackup, type StorageRoot } from '../core/storage';
import type { Classification } from '../domain/classification';
import { decodeClassification, emptyClassification } from '../domain/classification';
import type { FontItem } from '../domain/font-item';
import { decodeFontStars, decodeFontTags } from '../domain/font-meta';
import { decodeFontList } from '../domain/font-decode';
import type { Dropped } from '../types/decode-list';
import { isRecord } from '../types/guards';
import { MSG } from '../types/messages';
import { failWithDetail, ok, type Result } from '../types/result';
import { readJsonFile, readOrEmpty, replaceJsonFile, updateOrCreateJsonFile, type JsonMutator } from './json-file';
import { decodeRawRecords, type RawRecords } from './settings-object';

const ROOT: StorageRoot = 'legacy';

const SYS_FONT_FILE = 'SysFont2.json';
const FONT_STAR_FILE = 'sj_ztglStar.ini';
const FONT_TAG_FILE = 'sj_ztglTags.ini';
const CLASSIFICATION_FILE = 'classification.json';

/* ---------------- 读 ---------------- */

/**
 * 系统字体缓存 `SysFont2.json`：`{ arr: [...] }`；缺文件是首次运行，由命令层去调 jsx。
 *
 * `allowEmpty` 默认 `false`：**「有文件但一个字体都没有」是故障，不是「没缓存」**。
 * 命令层只判 `status === 'ok'` 就算命中；「为空 / 缺失 / 损坏」的区分留在这里。
 */
export function readSystemFontCache(
  options: { allowEmpty?: boolean } = {}
): Result<{ fonts: FontItem[]; dropped: Dropped[] }> {
  const allowEmpty = options.allowEmpty ?? false;

  return readJsonFile(SYS_FONT_FILE, ROOT, '系统字体缓存', (raw) => {
    if (!isRecord(raw)) return failWithDetail('CORRUPT', MSG.corrupt, 'root');

    const arr = raw.arr;
    if (!Array.isArray(arr)) return failWithDetail('CORRUPT', MSG.corrupt, 'root.arr');

    const decoded = decodeFontList(arr);
    if (decoded.status === 'error') return decoded;

    if (!allowEmpty && decoded.value.list.length === 0) {
      return failWithDetail('CORRUPT', MSG.corrupt, 'SysFont2.json:arr.length=0');
    }

    return ok({ fonts: decoded.value.list, dropped: decoded.value.dropped });
  });
}

/**
 * 「字体标签 / 星级文件缺失 = 空」的唯一裁定处。
 *
 * 视图读、原始读、导出读全部走这里：文件不存在 = 还没有这份数据（不是故障），
 * 读坏 / IO 失败仍然报错。写路径由 `updateOrCreateJsonFile` 负责首次创建。
 */
function readMetaFile<T>(
  file: string,
  label: string,
  decode: (raw: unknown) => Result<T>
): Result<T> {
  /* 「不存在 = 空」的判据只有一处（`json-file.readOrEmpty`）；这里只声明「空」长什么样 */
  return readOrEmpty(readJsonFile(file, ROOT, label, decode), () => decode([]));
}

/** 星级（视图）：`{ 家族名: 1~3 }`；坏条目计数 */
export function readFontStars(): ReturnType<typeof decodeFontStars> {
  return readMetaFile(FONT_STAR_FILE, '字体星级', decodeFontStars);
}

/** 标签（视图）；坏条目计数 */
export function readFontTags(): ReturnType<typeof decodeFontTags> {
  return readMetaFile(FONT_TAG_FILE, '字体标签', decodeFontTags);
}

/** 标签（原始记录）：写路径的冲突预检用 */
export function readRawFontTags(): Result<RawRecords> {
  return readMetaFile(FONT_TAG_FILE, '字体标签', decodeRawRecords);
}

/** 星级（原始记录）：导出时原样带走，不把 `"3"` 规范成 `3` */
export function readRawFontStars(): Result<RawRecords> {
  return readMetaFile(FONT_STAR_FILE, '字体星级', decodeRawRecords);
}

/**
 * 分类数据：缺文件 = 空分类。
 *
 * 与标签/星级走同一条判据（`readOrEmpty`）：同一个 repo 里不留第二种「缺文件」策略，
 * 否则新加文件时不知道该照哪一处抄。
 */
export function readClassification(): Result<Classification> {
  return readOrEmpty(
    readJsonFile(CLASSIFICATION_FILE, ROOT, '字体分类', decodeClassification),
    () => ok(emptyClassification())
  );
}

/* ---------------- 写（只给 commands 用） ---------------- */

/**
 * 星级 / 标签共用的写入口。
 *
 * 整个「读 → 改 → 写」在 `json-file` 里按文件排队，避免快速连点两次丢改动。
 * 文件确实不存在 → 走 `updateOrCreateJsonFile` 的首次创建分支（不产生 `.bak`）；
 * 读坏 / IO 失败不创建。
 */
function updateRawFile(
  name: string,
  label: string,
  mutator: JsonMutator<RawRecords>
): Promise<Result<void>> {
  return updateOrCreateJsonFile(name, ROOT, label, decodeRawRecords, mutator, {
    missing: () => []
  });
}

export function updateFontStars(mutator: JsonMutator<RawRecords>): Promise<Result<void>> {
  return updateRawFile(FONT_STAR_FILE, '字体星级', mutator);
}

export function updateFontTags(mutator: JsonMutator<RawRecords>): Promise<Result<void>> {
  return updateRawFile(FONT_TAG_FILE, '字体标签', mutator);
}

/** 导入：整份覆盖标签（用户明确确认；写前 `.bak`） */
function replaceFontTags(tags: RawRecords): Promise<Result<void>> {
  return replaceJsonFile(FONT_TAG_FILE, ROOT, tags);
}

/** 导入：整份覆盖星级 */
function replaceFontStars(stars: RawRecords): Promise<Result<void>> {
  return replaceJsonFile(FONT_STAR_FILE, ROOT, stars);
}

/* ---------------- 回滚与诊断 ---------------- */

/**
 * 导入覆盖：先写评分，再写标签。
 *
 * 评分写失败时标签还没动；标签写失败时用评分的 `.bak` 回滚，**不留半份数据**。
 *
 * `stars` 缺省 = 不碰评分；给值（含空数组）= 整份覆盖——「有没有这个键」是导入文件本身的语义。
 */
export async function replaceFontArchive(
  tags: RawRecords,
  stars?: RawRecords
): Promise<Result<void>> {
  if (stars !== undefined) {
    const starsWritten = await replaceFontStars(stars);
    if (starsWritten.status === 'error') return starsWritten;
  }

  const tagsWritten = await replaceFontTags(tags);
  if (tagsWritten.status === 'error') {
    if (stars === undefined) return tagsWritten;

    const rolled = restoreFontStars();
    if (rolled.status === 'error') {
      return failWithDetail(
        'IO_ERROR',
        `标签导入失败，评分回滚也失败：${tagsWritten.reason}`,
        rolled.reason
      );
    }
    return failWithDetail(
      'IO_ERROR',
      `标签导入失败，评分已回滚：${tagsWritten.reason}`,
      tagsWritten.detail
    );
  }

  return ok(undefined);
}

/** 回滚到上一版（导入失败时用；`.bak` 不存在 = 刚创建的文件，删掉它） */
function restoreFontStars(): Result<void> {
  return restoreBackup(FONT_STAR_FILE, ROOT);
}
