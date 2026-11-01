/**
 * 凭证命令层：设置页与 `core/credentials` 之间唯一的接线处。
 *
 * 只有两个动作 —— **读一段文本** / **贴一段文本**。设置页不再一个字段一个输入框：
 * 用户要做的只是「整段粘贴 + 保存」，字段级的读写交给 `core/credentials` 解析。
 *
 * 页面不许直接 import `core/credentials`（`CONVENTIONS` §9：页面零底层）。
 */

import { importCredentialsText, readCredentialsText } from '../core/credentials';
import type { Result } from '../types/result';

/** 当前配置的原文（含模板）：给设置页那个大输入框当初始值 */
export function getCredentialsText(): Result<string> {
  return readCredentialsText();
}

/** 整段导入：只覆盖文本里出现的节，另一节原样保留 */
export function setCredentialsText(text: string): Promise<Result<void>> {
  return importCredentialsText(text);
}
