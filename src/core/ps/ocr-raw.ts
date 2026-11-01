/**
 * OCR 唯一的私有解析器（导出画布）。
 *
 * **单独一个文件**：能力表要 import 它，写进 `./ocr.ts` 就会形成
 * `capabilities ↔ ocr` 运行时环（与 `text-batch-raw.ts` 同一个理由）。
 *
 * 建层的解析器不在这里 —— 建层走 `text-batch` 的 `createReportRaw`（同一个入口）。
 */

import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import { unwrapRaw } from './raw';

/** 导出结果：jsx 返回图片绝对路径；`no-doc` 折 `PS_NO_DOC`，空串算宿主没给结果 */
export function exportPathRaw(raw: string): Result<string> {
  const guard = unwrapRaw(raw);
  if (guard.status === 'error') return guard;

  const path = raw.trim();
  if (!path) return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, 'raw:empty');
  return ok(path);
}

