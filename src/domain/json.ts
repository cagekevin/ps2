/**
 * 【范本】JSON 解析（纯函数）
 * 全项目唯一的「文本 → unknown」入口，统一把解析失败归成 corrupt。
 */

import type { ReadOutcome } from '../types/read';

export function parseJson(text: string): ReadOutcome<unknown> {
  try {
    return { status: 'ok', value: JSON.parse(text) as unknown };
  } catch {
    return { status: 'corrupt', reason: '不是合法 JSON' };
  }
}
