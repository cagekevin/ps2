/**
 * 云同步的「文件 ↔ unit」适配层（只做壳，四个出口）
 *
 * 只做两件事：把本地**原文**拼成 unit；把云端 unit 拆回原文交给真正的写入口。
 *
 * 四条边界：
 *   1. **不自己拼 `sj_*` 文件名、不自己 `readTextResult`**：文件名常量与写序在
 *      `style-repo` / `action-repo`，本文件只加协议要求的 `/` 前缀。
 *   2. 不收网络、不碰台账：`core/http` 与 `core/prefs` 属命令层（`repo` 只碰数据文件）。
 *   3. 上传读原文（不 parse 再 stringify），下载整包写回。
 *   4. 下载的 unit 是**不可信输入**：缺文件 / 解不出都在这里判掉，不往下传。
 */

import { buildUnit, type SyncUnit } from '../domain/cloud';
import { isRecord } from '../types/guards';
import { parseJson } from '../types/json';
import { MSG } from '../types/messages';
import { failWithDetail, ok, type Result } from '../types/result';
import { ACTION_INDEX_FILE, applyBundle, collectBundle } from './action-repo';
import { STYLE_INDEX_FILE, readIndexText, writeIndexRaw } from './style-repo';

/** 快照里的路径（以 `/` 开头，相对用户数据目录） */
function pathOf(name: string): string {
  return `/${name}`;
}

/** 样式库 unit：只有一个索引文件（图片不同步） */
export function collectStyleUnit(): Result<SyncUnit> {
  const text = readIndexText();
  if (text.status === 'error') return text;
  return ok(buildUnit([{ path: pathOf(STYLE_INDEX_FILE), text: text.value }]));
}

/** 动作库 unit：索引 + 索引列出的每个仓库文件；任一读不到就整体失败 */
export function collectActionUnit(): Result<SyncUnit> {
  const bundle = collectBundle();
  if (bundle.status === 'error') return bundle;

  return ok(
    buildUnit([
      { path: pathOf(ACTION_INDEX_FILE), text: bundle.value.indexText },
      ...bundle.value.files.map((file) => ({ path: pathOf(file.name), text: file.text }))
    ])
  );
}

/**
 * 样式库 unit 写回。
 *
 * 解析成对象再交给 `writeIndexRaw`：该函数是索引的唯一写入口（`.bak` + 串行）。
 * 索引根必须是对象，否则是另一个文件，不写。
 */
export async function applyStyleUnit(unit: SyncUnit): Promise<Result<void>> {
  const file = unit.files.find((item) => item.path === pathOf(STYLE_INDEX_FILE));
  if (!file) return failWithDetail('CORRUPT', MSG.cloud.syncFailed, `missing:${STYLE_INDEX_FILE}`);

  const parsed = parseJson(file.content.data, '样式库索引');
  if (parsed.status === 'error') return parsed;
  if (!isRecord(parsed.value)) return failWithDetail('CORRUPT', MSG.corrupt, 'root');

  return writeIndexRaw(parsed.value);
}

/**
 * 动作库 unit 写回。
 *
 * 拆成「索引原文 + 各仓库文件原文」交给 `applyBundle`：全量校验、写序、失败即停都在那边。
 * `path.slice(1)` 依赖 `decodeSnapshot` 已保证路径以 `/` 开头（缺这层保证会写出空文件名）。
 * 只取 `path` 与 `content.data`：`size` / `hash` 是上传侧给云端对账用的，写盘一个字都不用 ——
 * 这是**故意丢**，不是漏传。
 */
export async function applyActionUnit(unit: SyncUnit): Promise<Result<void>> {
  const indexFile = unit.files.find((item) => item.path === pathOf(ACTION_INDEX_FILE));
  if (!indexFile) {
    return failWithDetail('CORRUPT', MSG.cloud.syncFailed, `missing:${ACTION_INDEX_FILE}`);
  }

  return applyBundle({
    indexText: indexFile.content.data,
    files: unit.files
      .filter((item) => item.path !== pathOf(ACTION_INDEX_FILE))
      .map((item) => ({ name: item.path.slice(1), text: item.content.data }))
  });
}
