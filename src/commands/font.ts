/**
 * 字体命令层：系统字体列表 / 应用字面 / 评分 / 标签 CRUD。
 *
 * 三条硬规则（`CONVENTIONS` §9）：不碰 DOM、不弹 toast、只返回 `Result<T>`。
 * 写操作只经 `repo/font-repo.ts`；页面在命令成功后自己重读。
 *
 * 注意与 `commands/style.ts` 的 `applyFontToLayer` 区分：
 *   本文件的 `applyFontFaceToLayer` 只换**字面**（三个名字），
 *   `commands/style.ts` 的 `applyFontToLayer` 应用的是**字体库项**（含字号/颜色）。
 */

import { openFile, saveFile } from '../core/dialog';
import { log } from '../core/logger';
import { getSystemFontList, setFontByNames } from '../core/ps/font';
import { readTextAt, writeTextAtAtomic } from '../core/storage';
import { resolveFontFace, type FontItem } from '../domain/font-item';
import { parseTagArchive } from '../domain/font-meta';
import { decodeFontList } from '../domain/font-decode';
import {
  readRawFontStars,
  readRawFontTags,
  readSystemFontCache,
  replaceFontArchive,
  updateFontStars,
  updateFontTags
} from '../repo/font-repo';
import type { RawRecords } from '../repo/settings-object';
import type { Dropped } from '../types/decode-list';
import { MSG } from '../types/messages';
import { fail, failWithDetail, ok, type Result } from '../types/result';

export interface FontListRead {
  fonts: FontItem[];
  /** 归一化时认不出的条目（带 path 与原因），页面必须显示出来 */
  dropped: Dropped[];
}

/**
 * 读系统字体列表。
 *
 * 顺序：缓存命中（非 force）→ 调 `ztgl_initSystemList` → 哨兵则重读缓存。
 * 返回值两条路都归一化。**星级不在这条路上合并**——星级只有 `store.stars` 一条读路。
 */
export async function loadFontList(force = false): Promise<Result<FontListRead>> {
  /* 命中判据在 repo（`allowEmpty: false` = 空缓存报 CORRUPT），这里只看成功与否 */
  const cached = readSystemFontCache();
  if (!force && cached.status === 'ok') {
    return cached;
  }

  /*
   * 缓存读失败要分开看：
   * - `NOT_FOUND` = 首次运行，没有缓存是正常的（下面去问 jsx）；
   * - 其余（`CORRUPT` / `IO_ERROR`）= 真故障，必须留痕，否则缓存坏了会永远静默重扫，
   *   用户与排障者都不知道「为什么每次打开字体页都要等一次全机扫描」。
   */
  if (cached.status === 'error' && cached.code !== 'NOT_FOUND') {
    log.warn('系统字体缓存读取失败，本次改走 jsx 重读', {
      code: cached.code,
      reason: cached.reason,
      detail: cached.detail
    });
  }

  const raw = await getSystemFontList();
  if (raw.status === 'error') return raw;

  /* 哨兵 / 数组的判定在 `raw.parseSystemFontList`；这里只转发两态 */
  if (raw.value.kind === 'sentinel') {
    /* 哨兵说「已写文件」：空列表由 repo 判成 CORRUPT，不当「系统没有字体」 */
    return readSystemFontCache();
  }

  const decoded = decodeFontList(raw.value.value);
  if (decoded.status === 'error') return decoded;

  return ok({ fonts: decoded.value.list, dropped: decoded.value.dropped });
}

/** 应用一个具体字面（家族 + 字重），不改字号 / 颜色 */
export async function applyFontFaceToLayer(
  font: FontItem,
  variantIndex: number
): Promise<Result<void>> {
  /* 三个名字的判据只有一处（`domain/font-item.ts`），这里不写回落 */
  const face = resolveFontFace(font, variantIndex);
  if (face.status === 'error') return face;

  return setFontByNames(face.value.postScriptName, face.value.name, face.value.weight);
}

/* ---------------- 评分 ---------------- */

/**
 * 评分 1~3；点同一档 = 取消（Vue 语义）。
 * 直接改原始记录，未知键保留。
 */
export function rateFont(family: string, value: number): Promise<Result<void>> {
  if (!family) {
    return Promise.resolve(failWithDetail('VALIDATION', MSG.badArgument, 'family:empty'));
  }
  if (!Number.isInteger(value) || value < 1 || value > 3) {
    return Promise.resolve(fail('VALIDATION', MSG.font.starRange));
  }

  return updateFontStars((records: RawRecords) => {
    const hit = records.find((item) => item.name === family);
    const current = hit ? Number(hit.star) || 0 : 0;
    const next = current === value ? 0 : value;

    if (next <= 0) return ok(records.filter((item) => item.name !== family));
    if (hit) {
      hit.star = next;
      return ok(records);
    }

    records.push({ name: family, star: next });
    return ok(records);
  });
}

/* ---------------- 标签 ---------------- */

const MAX_TAG_LENGTH = 8;

function normalizeTagName(text: string): Result<string> {
  const name = text.trim();
  if (!name) return fail('VALIDATION', MSG.font.tagNameEmpty);
  if (name.length > MAX_TAG_LENGTH) {
    return fail('VALIDATION', `标签名不能超过 ${MAX_TAG_LENGTH} 个字`);
  }
  return ok(name);
}

function findTag(records: RawRecords, text: string): Record<string, unknown> | undefined {
  return records.find((item) => item.text === text);
}

/** 冲突预检读：文件缺失 = 还没有标签（返回空数组，不走 `| null` 通道） */
export async function createTag(text: string): Promise<Result<void>> {
  const name = normalizeTagName(text);
  if (name.status === 'error') return name;

  const current = readRawFontTags();
  if (current.status === 'error') return current;
  if (findTag(current.value, name.value)) {
    return fail('VALIDATION', `标签「${name.value}」已存在`);
  }

  return updateFontTags((records) => {
    records.push({ text: name.value, arr: [], xz: false });
    return ok(records);
  });
}

export async function renameTag(from: string, to: string): Promise<Result<void>> {
  const next = normalizeTagName(to);
  if (next.status === 'error') return next;

  const current = readRawFontTags();
  if (current.status === 'error') return current;
  if (!findTag(current.value, from)) {
    return fail('VALIDATION', `标签「${from}」不存在`);
  }
  if (from !== next.value && findTag(current.value, next.value)) {
    return fail('VALIDATION', `标签「${next.value}」已存在`);
  }

  return updateFontTags((records) => {
    const tag = findTag(records, from);
    if (!tag) return fail('VALIDATION', `标签「${from}」不存在（可能已被删除）`);
    tag.text = next.value;
    return ok(records);
  });
}

export async function deleteTag(text: string): Promise<Result<void>> {
  const current = readRawFontTags();
  if (current.status === 'error') return current;
  if (!findTag(current.value, text)) {
    return fail('VALIDATION', `标签「${text}」不存在`);
  }

  return updateFontTags((records) => ok(records.filter((item) => item.text !== text)));
}

/* ---------------- 标签导入 / 导出（T-51） ---------------- */

/**
 * 导入：先选文件 → 读 → **逐项校验** → 才覆盖写。
 *
 * 校验不过一个字都不写。两个文件按「先评分、后标签」写：
 * 评分写失败时标签还没动；标签写失败时用评分的 `.bak` 回滚，**不留半份数据**。
 */
export async function importFontTags(): Promise<Result<{ tags: number; stars: number }>> {
  const path = openFile('导入标签', ['json']);
  if (!path) return fail('CANCELLED', MSG.codeReason.CANCELLED);

  const read = readTextAt(path);
  if (read.status === 'error') return read;

  const parsed = parseTagArchive(read.value);
  if (parsed.status === 'error') return parsed;

  const stars = parsed.value.stars;

  const written = await replaceFontArchive(parsed.value.tags, stars);
  if (written.status === 'error') return written;

  return ok({ tags: parsed.value.tags.length, stars: stars?.length ?? 0 });
}

/** 导出：只导出标签与评分，不包含字体文件；`star` 原样带走 */
export async function exportFontTags(): Promise<Result<void>> {
  const tags = readRawFontTags();
  if (tags.status === 'error') return tags;

  const stars = readRawFontStars();
  if (stars.status === 'error') return stars;

  const path = saveFile('导出标签', ['json'], '字体标签.json');
  if (!path) return fail('CANCELLED', MSG.codeReason.CANCELLED);

  return writeTextAtAtomic(
    path,
    JSON.stringify({ tags: tags.value, stars: stars.value }, null, 2)
  );
}

/** 给字体挂上 / 摘掉某个标签 */
export async function toggleTag(tagText: string, family: string): Promise<Result<void>> {
  const current = readRawFontTags();
  if (current.status === 'error') return current;
  if (!findTag(current.value, tagText)) {
    return fail('VALIDATION', `标签「${tagText}」不存在`);
  }

  return updateFontTags((records) => {
    const tag = findTag(records, tagText);
    if (!tag) return fail('VALIDATION', `标签「${tagText}」不存在（可能已被删除）`);

    const families = Array.isArray(tag.arr)
      ? tag.arr.filter((item): item is string => typeof item === 'string')
      : [];
    const index = families.indexOf(family);
    if (index >= 0) families.splice(index, 1);
    else families.push(family);

    tag.arr = families;
    return ok(records);
  });
}
