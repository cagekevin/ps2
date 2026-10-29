/**
 * 【范本】`.dzx` 编解码 + 导入计划（零 IO）
 *
 * 外层字段名**照抄官方**（`05` §3.3、`:301018`）：`{ arrFileData: [{ name, data }], store: <索引> }`。
 * `.dzx` 是可导出的文件，改名后别的工具读不出来；但**校验不能跟着松**——不合格一律 `CORRUPT`，
 * 绝不「半信半疑地导」。
 *
 * 本文件只算「写哪些文件、索引变成什么」；**写序在 repo**（先写仓库文件、最后写索引）。
 */

import {
  decodeIndex,
  newWarehouseFileName,
  type WarehouseEntry,
  type WarehouseIndex
} from './action-library';
import { isRecord } from '../types/guards';
import { MSG } from './messages';
import { failWithDetail, ok, type Result } from '../types/result';

/** `.dzx` 的一项：`data` 是 base64 的文件内容 */
export interface DzxFile {
  name: string;
  data: string;
}

export interface DzxPayload {
  arrFileData: DzxFile[];
  store: WarehouseIndex;
}

/**
 * 导入计划：纯数据，repo 按它写盘。
 *
 * **没有 `removed`**：替换时「旧仓库文件不删」是既定行为（`05` §3.3），
 * 列一份没人读的删除清单只会让人以为需要清理。
 */
export interface ImportPlan {
  nextIndex: WarehouseIndex;
  /** 要写的仓库文件（`name` 是文件名，`base64` 是内容） */
  writes: { name: string; base64: string }[];
}

export function encodeDzx(index: WarehouseIndex, files: DzxFile[]): DzxPayload {
  return { arrFileData: files.map((file) => ({ name: file.name, data: file.data })), store: index };
}

/** 严格解码：`arrFileData` 必须是数组、每项 `name`/`data` 都是非空字符串，`store` 走 `decodeIndex` */
export function decodeDzx(raw: unknown): Result<DzxPayload> {
  if (!isRecord(raw)) return failWithDetail('CORRUPT', MSG.corrupt, 'root');
  if (!Array.isArray(raw.arrFileData)) {
    return failWithDetail('CORRUPT', MSG.corrupt, 'root.arrFileData');
  }

  const files: DzxFile[] = [];
  for (let index = 0; index < raw.arrFileData.length; index += 1) {
    const item = raw.arrFileData[index];
    const path = `root.arrFileData[${index}]`;
    if (!isRecord(item)) return failWithDetail('CORRUPT', MSG.corrupt, path);
    if (typeof item.name !== 'string' || !item.name) {
      return failWithDetail('CORRUPT', MSG.corrupt, `${path}.name`);
    }
    if (typeof item.data !== 'string' || !item.data) {
      return failWithDetail('CORRUPT', MSG.corrupt, `${path}.data`);
    }
    files.push({ name: item.name, data: item.data });
  }

  const store = decodeIndex(raw.store);
  if (store.status === 'error') return store;

  return ok({ arrFileData: files, store: store.value.index });
}

/**
 * 算导入计划（替换 / 追加）。
 *
 * - **替换**：索引整体换成预设的（`index` 归 0），预设里没有的旧文件名记进 `removed` —— 但**不删文件**
 *   （`05` §3.3：不回滚、不删旧文件；孤儿文件不可见也不影响读取）。
 * - **追加**：只在文件名冲突时改名，仓库**名**保持预设里的（官方也只去重文件名）；
 *   预设的 `store.list` 逐项并入，`index` 保持当前值。
 *
 * 写序由 repo 保证：**先写文件、最后写索引**（索引是入口，不能先指向不存在的文件）。
 */
export function planImportFiles(
  current: WarehouseIndex,
  payload: DzxPayload,
  append: boolean
): Result<ImportPlan> {
  /*
   * **索引项必须有对应写入**：`store.list` 里若有一项在 `arrFileData` 里找不到同名文件，
   * 加进索引就成了「指向不存在文件」的悬空项（读侧只会回落默认分组，用户以为库空了）。
   * 这里先过滤掉，宁少不悬空。
   */
  const sourceNames = new Set(payload.arrFileData.map((file) => file.name));

  if (!append) {
    return ok({
      nextIndex: {
        index: 0,
        list: payload.store.list
          .filter((entry) => sourceNames.has(entry.fileName))
          .map((entry) => ({ ...entry }))
      },
      writes: payload.arrFileData.map((file) => ({ name: file.name, base64: file.data }))
    });
  }

  const taken = current.list.map((entry) => entry.fileName);
  const writes: { name: string; base64: string }[] = [];
  const added: WarehouseEntry[] = [];
  for (const entry of payload.store.list) {
    /* 没有对应文件的索引项不加（否则悬空） */
    const source = payload.arrFileData.find((file) => file.name === entry.fileName);
    if (!source) continue;

    const fileName = taken.includes(entry.fileName)
      ? newWarehouseFileName(taken)
      : entry.fileName;
    taken.push(fileName);
    writes.push({ name: fileName, base64: source.data });
    added.push({ name: entry.name, fileName });
  }

  return ok({
    nextIndex: { index: current.index, list: [...current.list, ...added] },
    writes
  });
}
