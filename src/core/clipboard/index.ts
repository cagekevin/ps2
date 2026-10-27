/**
 * 【范本】剪贴板
 * 唯一复制入口。file:// 下 navigator.clipboard 可能不可用，自动降级到 execCommand。
 * 失败走全仓唯一形状 Result（失败原因：两条路都不行时才失败）。
 */

import { fail, ok, type Result } from '../../types/result';

export async function copyText(text: string): Promise<Result<void>> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return ok(undefined);
    }
  } catch {
    /* 继续走降级 */
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(area);
    return copied ? ok(undefined) : fail('IO_ERROR', '浏览器拒绝了复制命令');
  } catch {
    return fail('IO_ERROR', '复制失败');
  }
}
