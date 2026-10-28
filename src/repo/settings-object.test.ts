/**
 * `repo/settings-object` 的判据：`sj_set.json` 的顶层形状。
 *
 * 这两条原先在 `json-file.test.ts` 里 —— 解码搬出 IO 引擎后，测试跟着搬，
 * 否则「测试文件在测另一个模块」。
 */
import { describe, expect, it } from 'vitest';
import { decodeSettingsObject } from './settings-object';

describe('decodeSettingsObject', () => {
  it('顶层不是对象 → CORRUPT', () => {
    const result = decodeSettingsObject([1, 2]);

    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('CORRUPT');
  });

  it('对象原样返回（同一个引用，写回时保住别的页面的键）', () => {
    const raw = { a: 1, other: 'x' };

    const result = decodeSettingsObject(raw);
    if (result.status === 'error') throw new Error('应当成功');
    expect(result.value).toBe(raw);
  });
});
