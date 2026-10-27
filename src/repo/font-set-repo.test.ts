/**
 * 字面板仓库的行为凭据：只验证「缺失怎么办 / 坏文件会不会被覆盖 / 未知键会不会被洗掉」。
 * storage 用假实现（不碰真磁盘）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readFontSetSettings,
  readQuickFonts,
  readTranslateCounter,
  updateFontSetSettings,
  updateQuickFonts
} from './font-set-repo';
import { DAILY_LIMIT } from '../domain/translate';

const h = vi.hoisted(() => ({
  files: new Map<string, string>(),
  writes: [] as { name: string; text: string; root: string }[]
}));

vi.mock('../core/storage', () => ({
  readTextResult: (name: string, root: string) => {
    const text = h.files.get(`${root}:${name}`);
    if (text === undefined) {
      return {
        status: 'error' as const,
        code: 'NOT_FOUND' as const,
        reason: '文件不存在',
        detail: ''
      };
    }
    return { status: 'ok' as const, value: text };
  },
  writeTextAtomic: (name: string, text: string, root: string) => {
    h.writes.push({ name, text, root });
    h.files.set(`${root}:${name}`, text);
    return Promise.resolve({ status: 'ok' as const, value: undefined });
  },
  exists: (name: string, root: string) => h.files.has(`${root}:${name}`)
}));

beforeEach(() => {
  h.files.clear();
  h.writes.length = 0;
});

function written(name: string): Record<string, unknown> {
  const hit = h.writes.find((item) => item.name === name);
  return JSON.parse(hit?.text ?? '{}') as Record<string, unknown>;
}

describe('font-set-repo', () => {
  it('五个文件缺失都按默认值读，读链路不创建文件', () => {
    const settings = readFontSetSettings();
    expect(settings.status).toBe('ok');
    if (settings.status === 'ok') {
      expect(settings.value.ztHierarych).toEqual([92, 48, 36, 24, 15, 12]);
      expect(settings.value.ztTranslate.from).toBe('auto');
    }

    expect(readQuickFonts()).toEqual({ status: 'ok', value: { index: 0, list: [] } });
    expect(readTranslateCounter()).toEqual({
      status: 'ok',
      value: { num: 0, max: DAILY_LIMIT, time: '' }
    });
    expect(h.writes).toHaveLength(0);
  });

  it('首次写设置 → 只写改动的键（不把默认值全刷进文件）', async () => {
    const result = await updateFontSetSettings({ ztPreview: 38 });
    expect(result.status).toBe('ok');

    expect(written('sj_set.json')).toEqual({ ztPreview: 38 });
  });

  it('坏文件：读报 CORRUPT，写被拒，一个字节都不落', async () => {
    h.files.set('legacy:sj_ztQuickFont.json', '{ 坏 JSON');

    const read = readQuickFonts();
    expect(read.status).toBe('error');
    if (read.status === 'error') expect(read.code).toBe('CORRUPT');

    const written = await updateQuickFonts((file) => file);
    expect(written.status).toBe('error');
    expect(h.writes).toHaveLength(0);
  });

  it('只改 zt*：别的页面写在同一个文件里的键原样保留', async () => {
    h.files.set(
      'legacy:sj_set.json',
      JSON.stringify({ foo: 'bar', ztShowQuick: true, ztPreview: 0, appUnit: 'px', other: { x: 1 } })
    );

    const result = await updateFontSetSettings({ ztPreview: 50 });
    expect(result.status).toBe('ok');

    const file = written('sj_set.json');
    expect(file.foo).toBe('bar');
    expect(file.other).toEqual({ x: 1 });
    expect(file.ztShowQuick).toBe(true);
    expect(file.ztPreview).toBe(50);
  });
});
