/**
 * 【范本】字面板 5 个设置文件的唯一读写入口
 *
 * 文件全在 `legacy` 根（`%APPDATA%\SheJiZhuLi`，官方客户端的数据目录），不新开目录：
 *   sj_set.json          官方设置对象，**只改 zt\* 字段，未知键原样保留**
 *   sj_ztQuickFont.json  `{ index, list: QuickFont[] }`（≤15）
 *   sj_ztHierarych.json  `{ index, list: [{ name, data[6] }] }`
 *   sj_ztTranslate.json  `{ num, max: 380, time }`
 *   sj_ztglHistory.json  `string[]`（最近 10 个家族）
 *
 * 缺失策略：**五个文件缺失都按空 / 默认值读，读链路不创建**；第一次写才走
 * `updateOrCreateJsonFile` 的显式创建分支（不产生 `.bak`，因为没有可备份的原文）。
 * 坏 JSON / 结构不符一律报 `CORRUPT` 并且**不回落默认值**——回落会把坏文件洗成看起来正常的数据。
 *
 * 除 `sj_set.json` 外，其余四个文件写盘只保留契约字段（文件里没有别的消费者）；
 * `sj_set.json` 里还有别的页面的设置，所以它走 `mergeFontSetSettings`，未传的键一个都不动。
 */

import { log } from '../core/logger';
import { type StorageRoot } from '../core/storage';
import {
  bumpCounter,
  clampListIndex,
  FONT_SET_DEFAULTS,
  mergeFontSetSettings,
  normalizeFontSetSettings,
  validateLevels,
  type FontSetSettings,
  type HierarchyFile,
  type HierarchyPreset,
  type TranslateCounter
} from '../domain/font-set';
import { decodeQuickFontFile, type QuickFontFile } from '../domain/quick-font';
import { DAILY_LIMIT } from '../domain/translate';
import { decodeList } from '../types/decode-list';
import { isRecord } from '../types/guards';
import { failWithDetail, ok, type Result } from '../types/result';
import {
  decodeSettingsObject,
  readJsonFile,
  readOrEmpty,
  updateOrCreateJsonFile,
  type JsonMutator
} from './json-file';

const ROOT: StorageRoot = 'legacy';

const SET_FILE = 'sj_set.json';
const QUICK_FILE = 'sj_ztQuickFont.json';
const HIERARCHY_FILE = 'sj_ztHierarych.json';
const TRANSLATE_FILE = 'sj_ztTranslate.json';
const HISTORY_FILE = 'sj_ztglHistory.json';

/** 最近使用的字体家族最多 10 个（原版行为） */
const HISTORY_LIMIT = 10;

/* ---------------- sj_set.json ---------------- */
/* 顶层解码走 `json-file.decodeSettingsObject`（唯一入口，别在本文件再写一份） */

/** 解码 + 投影合成一步：调用方只拿最终形状，不必再 `if ok → 投影` */
function decodeFontSetSettings(raw: unknown): Result<FontSetSettings> {
  const object = decodeSettingsObject(raw);
  if (object.status === 'error') return object;
  return ok(normalizeFontSetSettings(object.value));
}

/** 设置投影：缺失 = 全部默认值（首次使用不是故障），坏文件仍报错 */
export function readFontSetSettings(): Result<FontSetSettings> {
  return readOrEmpty(
    readJsonFile(SET_FILE, ROOT, '字体面板设置', decodeFontSetSettings),
    () => ok(normalizeFontSetSettings({}))
  );
}

/** 改设置：只替换 `patch` 里出现的键，其它键（含别的页面的）原样带回 */
export function updateFontSetSettings(patch: Partial<FontSetSettings>): Promise<Result<void>> {
  return updateOrCreateJsonFile(
    SET_FILE,
    ROOT,
    '字体面板设置',
    decodeSettingsObject,
    (raw) => mergeFontSetSettings(raw, patch),
    { missing: () => ({}) }
  );
}

/* ---------------- sj_ztQuickFont.json ---------------- */

export function readQuickFonts(): Result<QuickFontFile> {
  return readOrEmpty(
    readJsonFile(QUICK_FILE, ROOT, '快捷字体', decodeQuickFontFile),
    () => ok({ index: 0, list: [] })
  );
}

export function updateQuickFonts(
  mutator: JsonMutator<QuickFontFile>
): Promise<Result<void>> {
  return updateOrCreateJsonFile(QUICK_FILE, ROOT, '快捷字体', decodeQuickFontFile, mutator, {
    missing: () => ({ index: 0, list: [] })
  });
}

/* ---------------- sj_ztHierarych.json ---------------- */



/**
 * 层级预设：每个预设必须恰好 6 级。
 * 早期文件里 6 级以外的预设一律拒绝（读进来也应用不了，改坏它等于毁掉用户预设）。
 */
function decodeHierarchy(raw: unknown): Result<HierarchyFile> {
  if (!isRecord(raw)) return failWithDetail('CORRUPT', '层级预设文件顶层不是对象', 'root');

  const list = raw.list;
  if (!Array.isArray(list)) {
    return failWithDetail('CORRUPT', '层级预设文件缺少 list 数组', 'root.list');
  }

  const presets: HierarchyPreset[] = [];
  for (let index = 0; index < list.length; index += 1) {
    const item: unknown = list[index];
    if (!isRecord(item) || typeof item.name !== 'string' || !Array.isArray(item.data)) {
      return failWithDetail('CORRUPT', '层级预设条目结构不符', `root.list[${index}]`);
    }

    const levels = validateLevels(item.data);
    if (levels.status === 'error') {
      return failWithDetail(
        'CORRUPT',
        `层级预设「${item.name}」级数不对`,
        `${levels.detail}; root.list[${index}]`
      );
    }
    presets.push({ name: item.name, data: levels.value });
  }

  const rawIndex = typeof raw.index === 'number' ? raw.index : 0;
  return ok({ index: clampListIndex(rawIndex, presets.length), list: presets });
}

export function readHierarchy(): Result<HierarchyFile> {
  return readOrEmpty(
    readJsonFile(HIERARCHY_FILE, ROOT, '层级预设', decodeHierarchy),
    () => ok({ index: 0, list: [{ name: '默认', data: [...FONT_SET_DEFAULTS.ztHierarych] }] })
  );
}

export function updateHierarchy(
  mutator: JsonMutator<HierarchyFile>
): Promise<Result<void>> {
  return updateOrCreateJsonFile(HIERARCHY_FILE, ROOT, '层级预设', decodeHierarchy, mutator, {
    missing: () => ({ index: 0, list: [{ name: '默认', data: [...FONT_SET_DEFAULTS.ztHierarych] }] })
  });
}

/* ---------------- sj_ztTranslate.json ---------------- */

function decodeCounter(raw: unknown): Result<TranslateCounter> {
  if (!isRecord(raw)) return failWithDetail('CORRUPT', '翻译计数顶层不是对象', 'root');

  const { num, max, time } = raw;
  if (typeof num !== 'number') return failWithDetail('CORRUPT', '翻译计数缺少 num', 'root.num');
  if (typeof max !== 'number') return failWithDetail('CORRUPT', '翻译计数缺少 max', 'root.max');
  if (typeof time !== 'string') return failWithDetail('CORRUPT', '翻译计数缺少 time', 'root.time');

  return ok({ num, max, time });
}

/**
 * 翻译计数。
 *
 * 缺失 = 今天还没翻译过：`num 0 / max DAILY_LIMIT / time ''`（空串不等于任何 `dayKey`，
 * 所以 `bumpCounter` 会按跨天重置成 1，而不是在 0 上继续加）。
 */
export function readTranslateCounter(): Result<TranslateCounter> {
  return readOrEmpty(
    readJsonFile(TRANSLATE_FILE, ROOT, '翻译计数', decodeCounter),
    () => ok({ num: 0, max: DAILY_LIMIT, time: '' })
  );
}

export function updateTranslateCounter(
  mutator: JsonMutator<TranslateCounter>
): Promise<Result<void>> {
  return updateOrCreateJsonFile(TRANSLATE_FILE, ROOT, '翻译计数', decodeCounter, mutator, {
    missing: () => ({ num: 0, max: 380, time: '' })
  });
}

/** 成功后加一次计数：跨天自动重置，别在命令里自己拼时间判断 */
export function bumpTranslateCounter(today: string): Promise<Result<void>> {
  return updateTranslateCounter((counter) => bumpCounter(counter, today));
}

/* ---------------- sj_ztglHistory.json ---------------- */

/** 一条历史：必须是字符串（空串照收，与原实现一致） */
function historyItem(value: unknown, path: string): Result<string> {
  if (typeof value !== 'string') {
    return failWithDetail('CORRUPT', '最近字体里有非字符串条目', path);
  }
  return ok(value);
}

/**
 * 写路径：一项坏就整份拒绝。
 *
 * 写回时不能丢用户的记录——「读的时候跳过、写的时候删掉」是不可逆的（`.bak` 只有上一版）。
 */
function decodeHistoryStrict(raw: unknown): Result<string[]> {
  const decoded = decodeList(raw, historyItem, 'reject');
  if (decoded.status === 'error') return decoded;
  return ok(decoded.value.items);
}

/**
 * 读路径：跳过认不出的项并留痕。
 *
 * 判据来自 `CONVENTIONS` §1.2：跳过它，剩下的还能各就各位吗？能（只是少一条历史）。
 * 以前用 `reject`，一条非字符串就让「最近使用」整块空——那不是保护数据，是让功能消失。
 */
function decodeHistoryForRead(raw: unknown): Result<string[]> {
  const decoded = decodeList(raw, historyItem, 'filter');
  if (decoded.status === 'error') return decoded;

  if (decoded.value.dropped.length) {
    log.warn('最近字体有项无法识别，已跳过', {
      paths: decoded.value.dropped.map((item) => item.path)
    });
  }
  return ok(decoded.value.items);
}

export function readFontHistory(): Result<string[]> {
  return readOrEmpty(readJsonFile(HISTORY_FILE, ROOT, '最近字体', decodeHistoryForRead), () => ok([]));
}

export function updateFontHistory(mutator: JsonMutator<string[]>): Promise<Result<void>> {
  return updateOrCreateJsonFile(HISTORY_FILE, ROOT, '最近字体', decodeHistoryStrict, mutator, {
    missing: () => []
  });
}

/** 把家族名挪到最前面并截到 10 个（重复的旧位置删掉，不是压进去两次） */
export function pushFontHistory(family: string): Promise<Result<void>> {
  return updateFontHistory((list) => {
    const next = [family, ...list.filter((item) => item !== family)].slice(0, HISTORY_LIMIT);
    return next;
  });
}
