/**
 * 云同步要的两个整包出入口（`collectBundle` / `applyBundle`）。
 *
 * storage 用假实现（不碰真磁盘）：要验的是「读原文」与「写序」这两条顺序约束，
 * 以及「载荷缺文件时一个文件都不写」——那是下载覆盖本地前的唯一保护。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyBundle, collectBundle, updateLibrary } from './action-repo';

const h = vi.hoisted(() => ({
  files: new Map<string, string>(),
  writes: [] as { name: string; text: string; root: string }[]
}));

const OK = { status: 'ok' as const, value: undefined };

vi.mock('../core/storage', () => ({
  readTextResult: (name: string, root: string) => {
    const text = h.files.get(`${root}:${name}`);
    if (text === undefined) {
      return { status: 'error' as const, code: 'NOT_FOUND' as const, reason: '文件不存在', detail: '' };
    }
    return { status: 'ok' as const, value: text };
  },
  readTextAt: () => ({ status: 'error' as const, code: 'NOT_FOUND' as const, reason: '文件不存在', detail: '' }),
  writeTextAtomic: (name: string, text: string, root: string) => {
    h.writes.push({ name, text, root });
    h.files.set(`${root}:${name}`, text);
    return Promise.resolve(OK);
  },
  writeTextAtAtomic: () => Promise.resolve(OK),
  removeFile: () => OK,
  exists: (name: string, root: string) => h.files.has(`${root}:${name}`)
}));

/* `action-repo` 还 import 了扩展目录（自带预设），本组用例不碰它 */
vi.mock('../core/cep/bridge', () => ({ getExtensionPath: () => '/ext' }));

const INDEX_TEXT = JSON.stringify({
  index: 0,
  list: [{ name: '默认仓库', fileName: 'sj_dz.json' }]
});

const LIBRARY_TEXT = JSON.stringify([
  { groupName: '默认分组', show: true, list: [{ group: '默认分组', name: '动作一' }] }
]);

beforeEach(() => {
  h.files.clear();
  h.writes.length = 0;
});

describe('collectBundle', () => {
  it('返回索引与每个仓库文件的原文', () => {
    h.files.set('legacy:sj_dzStoreInfo.json', INDEX_TEXT);
    h.files.set('legacy:sj_dz.json', LIBRARY_TEXT);

    const bundle = collectBundle();
    expect(bundle.status).toBe('ok');
    if (bundle.status === 'error') return;

    expect(bundle.value.indexText).toBe(INDEX_TEXT);
    expect(bundle.value.files).toEqual([{ name: 'sj_dz.json', text: LIBRARY_TEXT }]);
  });

  it('索引登记的仓库文件缺失 → 原码透传，detail 带文件名', () => {
    h.files.set('legacy:sj_dzStoreInfo.json', INDEX_TEXT);

    const bundle = collectBundle();
    expect(bundle.status).toBe('error');
    if (bundle.status === 'error') {
      expect(bundle.code).toBe('NOT_FOUND');
      expect(bundle.detail).toContain('file:sj_dz.json');
    }
  });
});

describe('applyBundle', () => {
  it('载荷缺仓库文件 → CORRUPT，且一个文件都不写', async () => {
    const result = await applyBundle({ indexText: INDEX_TEXT, files: [] });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('CORRUPT');
      expect(result.detail).toBe('missing:sj_dz.json');
    }
    expect(h.writes).toHaveLength(0);
  });

  it('仓库文件解不出 → 一个文件都不写', async () => {
    const result = await applyBundle({
      indexText: INDEX_TEXT,
      files: [{ name: 'sj_dz.json', text: '{' }]
    });

    expect(result.status).toBe('error');
    expect(h.writes).toHaveLength(0);
  });

  it('先写仓库文件、最后写索引，且都是原文', async () => {
    const result = await applyBundle({
      indexText: INDEX_TEXT,
      files: [{ name: 'sj_dz.json', text: LIBRARY_TEXT }]
    });

    expect(result.status).toBe('ok');
    expect(h.writes.map((write) => write.name)).toEqual(['sj_dz.json', 'sj_dzStoreInfo.json']);
    expect(h.writes[0]?.text).toBe(LIBRARY_TEXT);
    expect(h.writes[1]?.text).toBe(INDEX_TEXT);
  });
});

describe('updateLibrary', () => {
  it('写回的仍是**裸数组**（不能把读视图的 dropped 记账写进库文件）', async () => {
    h.files.set('legacy:sj_dzStoreInfo.json', INDEX_TEXT);
    h.files.set('legacy:sj_dz.json', LIBRARY_TEXT);

    const result = await updateLibrary((groups) => {
      const next = groups.map((group) => ({ ...group, groupName: '改过的分组' }));
      return { status: 'ok', value: next };
    });

    expect(result.status).toBe('ok');
    const written = h.files.get('legacy:sj_dz.json') ?? '';
    const parsed: unknown = JSON.parse(written);
    /* 库文件形状 = 裸数组；写成 `{ groups, dropped }` 会让下一次读直接 CORRUPT */
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('索引里没有仓库文件 → 不写盘', async () => {
    h.files.set('legacy:sj_dzStoreInfo.json', JSON.stringify({ index: 0, list: [] }));

    const result = await updateLibrary(() => ({ status: 'ok', value: null }));
    expect(result.status).toBe('error');
    expect(h.writes).toHaveLength(0);
  });
});
