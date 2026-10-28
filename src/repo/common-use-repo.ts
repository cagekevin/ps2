/**
 * 【范本】常用页两个数据文件的唯一读写入口
 *
 * 文件全在 `legacy` 根（`%APPDATA%\SheJiZhuLi`，官方数据目录，不新开目录）：
 *   sj_commonFunction.json  根是**裸数组**（14 项），缺 id 的项跳过并记账（不再整份拒绝）
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
  decodeCommonUseItem,
  type CommonUseItem
} from '../domain/common-use';
import {
  isCommonUseSettingKey,
  mergeCommonUseOptions,
  pickCommonUseOptions,
  type CommonUseOptions
} from '../domain/common-use-options';
import { decodeList, type Dropped } from '../types/decode-list';
import { fail, ok, type Result } from '../types/result';
import {
  decodeRawRecords,
  decodeSettingsObject,
  readJsonFile,
  readOrEmpty,
  updateOrCreateJsonFile,
  type JsonMutator,
  type RawRecords
} from './json-file';

const ROOT: StorageRoot = 'legacy';

const FILE = 'sj_commonFunction.json';
const SET_FILE = 'sj_set.json';

/** 种子是只读常量，写盘前必须复制一份，避免后续改动污染模块级数据 */
function cloneSeed(): CommonUseItem[] {
  return COMMON_USE_SEED.map((item) => ({ ...item }));
}

/* ---------------- sj_commonFunction.json ---------------- */

/**
 * 读网格的结果：三样都由 `decodeList` 一次给出。
 *
 * 以前这里是「`decodeRawRecords` 判结构 + `decodeList` 判字段」两道解码，对同一份数据
 * 给出**相反结论**（非对象项：前者整份拒绝、后者跳过一项），最终由谁先跑决定行为——
 * 同一件事两个判据，靠顺序定胜负。
 */
export interface CommonUseRead {
  /** 可上屏的项（缺 id / 非对象的已剔除）：判「有没有这一项」用它 */
  items: CommonUseItem[];
  /** 原始数组：视图下标与写回空间都以它为准（`toTiles` 的 `index`） */
  records: readonly unknown[];
  /** 认不出而跳过的项（缺 id / 非对象），只用于提示 */
  dropped: Dropped[];
}

/**
 * 读网格 14 项；文件不存在时按官方种子返回（不写盘）。
 *
 * 坏项**跳过并记账**，不再「一项坏 = 整页不可用」：真机上 `sj_commonFunction.json`
 * 有一项缺 id，整页就 `CORRUPT` 了（2026-10-28 日志）。
 *
 * 写路径另有一套更严的判据（`decodeRawRecords`：非对象项整份拒绝），那是**读容忍、写严格**，
 * 两个语义各有各的函数，不共用。
 */
export function readCommonUseFile(): Result<CommonUseRead> {
  return readOrEmpty(
    readJsonFile(FILE, ROOT, '常用功能', (raw) =>
      decodeList<CommonUseItem>(raw, decodeCommonUseItem, 'filter')
    ),
    () => {
      /* 首次运行：种子既是视图也是原始记录（同一个数组，下标天然对齐） */
      const seed = cloneSeed();
      return ok({ items: seed, records: seed, dropped: [] });
    }
  );
}

/**
 * 改网格：文件不存在 = 首次创建，以种子为底再套 mutator。
 *
 * 写路径读**原始记录**（`decodeRawRecords`），不是读视图的过滤结果：被跳过的那一项
 * 必须原样留在文件里，只有用户显式删除才消失——否则就是「读的时候跳过、写的时候删掉」，
 * `.bak` 只有上一版，不可逆。
 */
export function updateCommonUseFile(mutator: JsonMutator<RawRecords>): Promise<Result<void>> {
  return updateOrCreateJsonFile(FILE, ROOT, '常用功能', decodeRawRecords, mutator, {
    missing: cloneSeed
  });
}

/* ---------------- sj_set.json（只认 17 个键） ---------------- */
/* 顶层解码走 `json-file.decodeSettingsObject`（唯一入口，别在本文件再写一份） */

/** 解码 + 投影合成一步：调用方只拿最终形状 */
function decodeCommonUseOptions(raw: unknown): Result<CommonUseOptions> {
  const object = decodeSettingsObject(raw);
  if (object.status === 'error') return object;
  return ok(pickCommonUseOptions(object.value));
}

/** 读 17 个键；文件或键缺失都按「没设置过」返回，坏文件仍报错 */
export function readCommonUseOptions(): Result<CommonUseOptions> {
  return readOrEmpty(
    readJsonFile(SET_FILE, ROOT, '常用页设置', decodeCommonUseOptions),
    () => ok(pickCommonUseOptions({}))
  );
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
