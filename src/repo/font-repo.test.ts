/**
 * `repo/font-repo` 的导入覆盖与回滚行为（仓库层第二个单测）。
 *
 * 关键判据：**不留半份数据**——标签写失败时评分的 `.bak` 必须被用回。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readClassification, readSystemFontCache, replaceFontArchive } from './font-repo';

const h = vi.hoisted(() => ({
  writes: [] as string[],
  restores: [] as string[],
  failWrite: null as string | null,
  /** 非 null = 读盘返回这段文本；null = 文件不存在 */
  text: null as string | null
}));

vi.mock('../core/storage', () => ({
  readTextResult: () =>
    h.text === null
      ? {
          status: 'error' as const,
          code: 'NOT_FOUND' as const,
          reason: '文件不存在',
          detail: ''
        }
      : { status: 'ok' as const, value: h.text },
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
  h.text = null;
});

describe('readSystemFontCache', () => {
  it('arr 为空 → CORRUPT（「有文件但没有字体」不是「没缓存」）', () => {
    h.text = JSON.stringify({ arr: [] });

    const result = readSystemFontCache();

    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('CORRUPT');
  });

  it('allowEmpty: true → 空列表也算读成功', () => {
    h.text = JSON.stringify({ arr: [] });

    const result = readSystemFontCache({ allowEmpty: true });

    expect(result.status).toBe('ok');
  });

  it('缺文件 → NOT_FOUND（首次运行，交给命令层去问 jsx）', () => {
    const result = readSystemFontCache();

    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('NOT_FOUND');
  });
});

describe('readClassification', () => {
  it('缺文件 = 空分类（与标签/星级同一条判据）', () => {
    const result = readClassification();

    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value.categories).toEqual([]);
  });
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
