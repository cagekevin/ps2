/**
 * `repo/font-repo` 的导入覆盖与回滚行为（仓库层第二个单测）。
 *
 * 关键判据：**不留半份数据**——标签写失败时评分的 `.bak` 必须被用回。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { replaceFontArchive } from './font-repo';

const h = vi.hoisted(() => ({
  writes: [] as string[],
  restores: [] as string[],
  failWrite: null as string | null
}));

vi.mock('../core/storage', () => ({
  readTextResult: () => ({
    status: 'error' as const,
    code: 'NOT_FOUND' as const,
    reason: '文件不存在',
    detail: ''
  }),
  writeTextAtomic: (name: string) => {
    if (h.failWrite === name) {
      return Promise.resolve({
        status: 'error' as const,
        code: 'IO_ERROR' as const,
        reason: '写入失败',
        detail: 'disk'
      });
    }
    h.writes.push(name);
    return Promise.resolve({ status: 'ok' as const, value: undefined });
  },
  exists: () => false,
  restoreBackup: (name: string) => {
    h.restores.push(name);
    return { status: 'ok' as const, value: undefined };
  }
}));

const TAGS = 'sj_ztglTags.ini';
const STARS = 'sj_ztglStar.ini';

beforeEach(() => {
  h.writes.length = 0;
  h.restores.length = 0;
  h.failWrite = null;
});

describe('replaceFontArchive', () => {
  it('两个文件都写成功 → 不回滚', async () => {
    const result = await replaceFontArchive([{ text: 'a' }], [{ name: 'A', star: 3 }]);

    expect(result.status).toBe('ok');
    expect(h.writes).toEqual([STARS, TAGS]);
    expect(h.restores).toHaveLength(0);
  });

  it('标签写失败 → 用评分的 .bak 回滚，提示写明已回滚', async () => {
    h.failWrite = TAGS;

    const result = await replaceFontArchive([{ text: 'a' }], [{ name: 'A', star: 3 }]);

    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.reason).toContain('评分已回滚');
    expect(h.restores).toEqual([STARS]);
  });

  it('评分写失败 → 直接失败，不写标签、不回滚', async () => {
    h.failWrite = STARS;

    const result = await replaceFontArchive([{ text: 'a' }], [{ name: 'A', star: 3 }]);

    expect(result.status).toBe('error');
    expect(h.writes).not.toContain(TAGS);
    expect(h.restores).toHaveLength(0);
  });

  it('导入文件没有 stars → 只写标签', async () => {
    const result = await replaceFontArchive([{ text: 'a' }]);

    expect(result.status).toBe('ok');
    expect(h.writes).toEqual([TAGS]);
  });
});
