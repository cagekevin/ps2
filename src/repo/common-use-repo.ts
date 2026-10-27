/**
 * 【范本】常用页两个数据文件的唯一读写入口
 *
 * 文件全在 `legacy` 根（`%APPDATA%\SheJiZhuLi`，官方数据目录，不新开目录）：
 *   sj_commonFunction.json  根是**裸数组**（14 项），缺 id 的项整份拒绝
 *   sj_set.json             只读写 17 个 `cy*` 键，其余键（含别的页面的）原样保留
 *
 * 缺失策略不一样，别对调：
 *   sj_commonFunction.json —— 缺失 = 首次运行，**读链路按种子给值但不写盘**；
 *                             第一次改才走 `updateOrCreateJsonFile` 的显式创建（不产生 `.bak`）
 *   sj_set.json            —— 缺失 = 没有设置过，读回「17 键全 undefined」；写时创建
 *
 * 坏 JSON / 结构不符一律 `CORRUPT`，**不回落种子**——回落会把用户自定义的按钮
 * 静默洗成官方 14 项，等于清空数据。
 */

import { type StorageRoot } from '../core/storage';
import {
  COMMON_USE_SEED,
  parseCommonUseFile,
  type CommonUseFile
} from '../domain/common-use';
import {
  isCommonUseSettingKey,
  mergeCommonUseOptions,
  pickCommonUseOptions,
  type CommonUseOptions
} from '../domain/common-use-options';
import { isRecord } from '../types/guards';
import { fail, failWithDetail, ok, type Result } from '../types/result';
import {
  readJsonFile,
  updateOrCreateJsonFile,
  type JsonMutator
} from './json-file';

const ROOT: StorageRoot = 'legacy';

const FILE = 'sj_commonFunction.json';
const SET_FILE = 'sj_set.json';

/** 种子是只读常量，写盘前必须复制一份，避免后续改动污染模块级数据 */
function cloneSeed(): CommonUseFile {
  return COMMON_USE_SEED.map((item) => ({ ...item }));
}

/* ---------------- sj_commonFunction.json ---------------- */

/** 读网格 14 项；文件不存在时按官方种子返回（不写盘） */
export function readCommonUseFile(): Result<CommonUseFile> {
  const read = readJsonFile(FILE, ROOT, '常用功能', parseCommonUseFile);
  if (read.status === 'error' && read.code === 'NOT_FOUND') return ok(cloneSeed());
  return read;
}

/** 改网格：文件不存在 = 首次创建，以种子为底再套 mutator */
export function updateCommonUseFile(
  mutator: JsonMutator<CommonUseFile>
): Promise<Result<void>> {
  return updateOrCreateJsonFile(FILE, ROOT, '常用功能', parseCommonUseFile, mutator, {
    missing: cloneSeed
  });
}

/* ---------------- sj_set.json（只认 17 个键） ---------------- */

/** 官方设置是「一个大对象」，写路径要拿到原始对象才能保留别的页面的键 */
function decodeSettingsObject(raw: unknown): Result<Record<string, unknown>> {
  if (!isRecord(raw)) return failWithDetail('CORRUPT', '设置文件顶层不是对象', 'root');
  return ok(raw);
}

/** 读 17 个键；文件或键缺失都按「没设置过」返回，坏文件仍报错 */
export function readCommonUseOptions(): Result<CommonUseOptions> {
  const read = readJsonFile(SET_FILE, ROOT, '常用页设置', decodeSettingsObject);
  if (read.status === 'error') {
    if (read.code === 'NOT_FOUND') return ok(pickCommonUseOptions({}));
    return read;
  }
  return ok(pickCommonUseOptions(read.value));
}

/**
 * 写 17 个键中的一部分。
 *
 * 顶层键必须命中白名单：这条不只是防手误——`sj_set.json` 是全客户端共用的设置文件，
 * 放一个不认识的键进去，官方读配置时可能整份判坏。
 */
export function updateCommonUseOptions(patch: Record<string, unknown>): Promise<Result<void>> {
  const keys = Object.keys(patch);
  if (!keys.length) return Promise.resolve(ok(undefined));

  const unknown = keys.filter((key) => !isCommonUseSettingKey(key));
  if (unknown.length) {
    return Promise.resolve(
      fail('VALIDATION', `不允许写 sj_set.json 的未知键：${unknown.join('、')}`)
    );
  }

  return updateOrCreateJsonFile(
    SET_FILE,
    ROOT,
    '常用页设置',
    decodeSettingsObject,
    (raw) => mergeCommonUseOptions(raw, patch),
    { missing: () => ({}) }
  );
}
