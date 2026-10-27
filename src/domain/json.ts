/**
 * 【范本】JSON 解析（纯函数）
 * 全项目唯一的「文本 → unknown」入口，统一把解析失败归成 CORRUPT。
 */

import { fail, ok, type Result } from '../types/result';

export function parseJson(text: string): Result<unknown> {
  try {
    return ok(JSON.parse(text) as unknown);
  } catch {
    return fail('CORRUPT', '不是合法 JSON');
  }
}
