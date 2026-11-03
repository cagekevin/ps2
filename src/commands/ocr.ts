/**
 * OCR 命令层：页面与 `core` 之间唯一的接线处。
 *
 * 两条凭证命令 + 一条识别命令。**页面不许直接 import `core/ocr`**。
 * 三条硬规则照 `CONVENTIONS` §9：不碰 DOM、不弹 toast、只返回 `Result<T>`。
 *
 * 识别链的顺序不能改（每一步失败都原样透传，不留半成品）：
 *   凭证 → 导出 → 判体积 → 读 base64 → 识别 → 布局 → 建层 → 删临时图
 * 「先建层再删图」是因为失败时保留临时图对排查有用；成功才删。
 *
 * **唯一的「不抛」例外**（`刀 4` 允许的两类之一：清理路径）：`dropTemp` 删临时图失败只
 * `log.warn`。删不掉不影响业务，也不许把它变成用户可见的失败——那是拿一个无关的错掩盖真正的错。
 */

import { MASTER_GROUP_NAME, OCR_MAX_IMAGE_BYTES, OCR_QUALITIES } from '../config';
import { recognize } from '../core/ocr/baidu';
import { readOcrCredentials } from '../core/credentials';
import { exportImage } from '../core/ps/ocr';
import { createTextLayers } from '../core/ps/text-batch';
import { fileSizeAt, readBase64At, removeFileAt } from '../core/storage';
import { log } from '../core/logger';
import { toOcrGroups } from '../domain/ocr';
import { DEFAULT_CREATE_FONT } from '../domain/text-batch';
import { MSG } from '../types/messages';
import type { OcrOffset } from '../types/ocr';
import { failWithDetail, ok, type Result } from '../types/result';



/** 删临时图：失败只记日志（临时产物删不掉不该让用户以为识别失败） */
function dropTemp(path: string): void {
  if (!path) return;
  const removed = removeFileAt(path);
  if (removed.status === 'error') log.warn('删除 OCR 临时图失败', { detail: removed.detail });
}

/**
 * 当前画布（有像素选区时只识别选区）→ 文字图层。
 *
 * 一次点击 = 一次 `suspendHistory`（撤销一步全撤）。识别结果**不返回给页面展示**：
 * 层已经在画布上，要改字去批量文字弹窗的「改字」页点「全部」。
 */
export async function ocrToLayers(): Promise<
  Result<{ groups: number; layers: number; dropped: number; fontMissing: boolean }>
> {
  const credentials = readOcrCredentials();
  if (credentials.status === 'error') {
    /* 还没配凭证是「设置缺失」，不是「文件不存在」：换一句话说，用户才知道去哪补 */
    if (credentials.code === 'NOT_FOUND') {
      return failWithDetail('NOT_FOUND', MSG.ocr.noCredentials, credentials.detail);
    }
    return credentials;
  }

  let imagePath = '';
  /* `offset` 与 `imagePath` 同生命周期：体积循环里导出可能调 1–3 次，
     拿第一轮的偏移配第三轮的图，建层会整体错位（plan 18 §5.2） */
  let offset: OcrOffset = { left: 0, top: 0 };
  let bytes = 0;

  for (const quality of OCR_QUALITIES) {
    const exported = await exportImage(quality);
    if (exported.status === 'error') {
      dropTemp(imagePath);
      return exported;
    }
    imagePath = exported.value.path;
    offset = exported.value.offset;

    const size = fileSizeAt(imagePath);
    if (size.status === 'error') {
      dropTemp(imagePath);
      return size;
    }
    bytes = size.value;
    if (bytes <= OCR_MAX_IMAGE_BYTES) break;
  }

  if (bytes > OCR_MAX_IMAGE_BYTES) {
    dropTemp(imagePath);
    return failWithDetail('VALIDATION', MSG.ocr.imageTooLarge, `bytes:${bytes}`);
  }

  const data = readBase64At(imagePath);
  if (data.status === 'error') {
    dropTemp(imagePath);
    return data;
  }

  const recognized = await recognize(data.value, credentials.value);
  dropTemp(imagePath);
  if (recognized.status === 'error') return recognized;

  const layout = toOcrGroups(recognized.value.blocks, offset);
  if (!layout.groups.length) {
    return failWithDetail('VALIDATION', MSG.ocr.empty, `dropped:${recognized.value.dropped}`);
  }

  /* 建层走「批量文字」那个唯一入口（`mode: 'absolute'` 那一支），不另写一套 */
  const created = await createTextLayers({
    mode: 'absolute',
    master: MASTER_GROUP_NAME,
    /* 字体只有一处出处：`DEFAULT_CREATE_FONT`（与「新建」同一份，jsx 不写字体名） */
    font: { ...DEFAULT_CREATE_FONT },
    groups: layout.groups
  });
  if (created.status === 'error') return created;

  return ok({
    groups: layout.groups.length,
    layers: created.value.ok,
    dropped: recognized.value.dropped,
    fontMissing: created.value.fontMissing
  });
}
