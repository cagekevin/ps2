/**
 * 【范本】JSON 解析（纯函数）
 * 全项目唯一的「不可信文本 → unknown」入口。
 *
 * 落在 types/ 而不是 domain/：core / domain / repo 三层都要用它，
 * 而 core 不能 import domain（依赖方向见 CONVENTIONS.md §3）——types 是唯一共同下层。
 * 全仓 `JSON.parse` 字面量只允许出现在本文件。
 *
 * `label` 必填：失败原因要说清「哪份文本」不是合法 JSON，不许给一句笼统的通用文案。
 */

import { failWithDetail, ok, type Result } from './result';

export function parseJson(text: string, label: string): Result<unknown> {
  try {
    return ok(JSON.parse(text) as unknown);
  } catch (error) {
    return failWithDetail('CORRUPT', `${label}不是合法 JSON`, String(error));
  }
}
