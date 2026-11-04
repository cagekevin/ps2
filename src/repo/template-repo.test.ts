/**
 * 模板库仓储：只验四条契约（storage 用假实现，不碰磁盘）
 *   1. 索引不存在 = 空库，且**不写盘**
 *   2. 索引坏了原样报 `CORRUPT`
 *   3. `updateIndex` 返回**写后的索引**（不靠「写完再读」）
 *   4. mutator 返回 `null` ⇒ 不写盘，返回当前索引
 * 另验路径两组出口（storage 相对 / jsx 绝对）、README 幂等。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ensureReadme,
  readIndex,
  removeItemDir,
  templateItemAbsDir,
  templateSourceAbs,
  templateThumbFile,
  updateIndex
} from './template-repo';
import { addFolder, emptyTemplateIndex, type TemplateIndex } from '../domain/template-library';

const h = vi.hoisted(() => ({
  files: new Map<string, string>(),
  writes: [] as { name: string; root: string }[],
  dirsRemoved: [] as { name: string; root: string }[]
}));

const OK = { status: 'ok' as const, value: undefined };

/* 绝对路径的起点：真机是 `%APPDATA%`，这里给一个固定的 posix 形态，断言不看平台 */
vi.mock('../core/cep/bridge', () => ({
  getUserDataPath: () => 'C:/Users/test/AppData/Roaming'
}));

vi.mock('../core/storage', () => ({
  /* 绝对路径要用 ROOTS.data 拼数据根，mock 里必须有（少了会 undefined.replace 崩） */
  ROOTS: { data: '/Maomao', legacy: '/SheJiZhuLi', swatch: '/FengZiSeBan' },
  readTextResult: (name: string, root: string) => {
    const text = h.files.get(`${root}:${name}`);
    if (text === undefined) {
      return { status: 'error' as const, code: 'NOT_FOUND' as const, reason: '文件不存在', detail: '' };
    }
    return { status: 'ok' as const, value: text };
  },
  writeTextAtomic: (name: string, text: string, root: string) => {
    h.writes.push({ name, root });
    h.files.set(`${root}:${name}`, text);
    return Promise.resolve(OK);
  },
  exists: (name: string, root: string) => h.files.has(`${root}:${name}`),
  removeDir: (name: string, root: string) => {
    h.dirsRemoved.push({ name, root });
    return OK;
  }
}));

const KEY = 'data:template/index.json';

beforeEach(() => {
  h.files.clear();
  h.writes.length = 0;
  h.dirsRemoved.length = 0;
});

describe('readIndex', () => {
  it('文件不存在 → 空库，且不写盘', () => {
    const r = readIndex();
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.value).toEqual(emptyTemplateIndex());
    expect(h.writes).toHaveLength(0);
  });

  it('坏 JSON → CORRUPT', () => {
    h.files.set(KEY, '{oops');
    const r = readIndex();
    expect(r.status).toBe('error');
    if (r.status === 'error') expect(r.code).toBe('CORRUPT');
  });
});

describe('updateIndex', () => {
  it('写入后返回**新索引**（不等下一次读）', async () => {
    const r = await updateIndex((current) =>
      addFolder(current, { id: 'f1', name: 'banner', parentId: null })
    );
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;

    expect(r.value.folders.map((f) => f.id)).toEqual(['f1']);
    expect(h.writes.map((w) => w.name)).toEqual(['template/index.json']);

    /* 落盘的原文能解回同一份（写的是完整索引，不是补丁） */
    const onDisk = JSON.parse(h.files.get(KEY) ?? '{}') as TemplateIndex;
    expect(onDisk.version).toBe(1);
    expect(onDisk.folders).toHaveLength(1);
  });

  it('mutator 返回 null ⇒ 不写盘，返回当前索引', async () => {
    const seed = emptyTemplateIndex();
    h.files.set(KEY, JSON.stringify(seed));

    const r = await updateIndex(() => ({ status: 'ok', value: null }));
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.value).toEqual(seed);
    expect(h.writes).toHaveLength(0);
  });

  it('mutator 失败 ⇒ 不写盘，原样上抛失败', async () => {
    const r = await updateIndex((current) =>
      addFolder(current, { id: 'f1', name: 'a', parentId: 'no-such-parent' })
    );
    expect(r.status).toBe('error');
    if (r.status === 'error') expect(r.code).toBe('NOT_FOUND');
    expect(h.writes).toHaveLength(0);
  });
});

describe('路径分两组：storage 相对 / jsx 绝对', () => {
  it('相对数据根：缩略图（给 storage 与 <img src>）', () => {
    expect(templateThumbFile('abc', '标题组')).toBe('template/PSD/abc.info/标题组.png');
  });

  it('绝对路径：条目目录与源文件（给 jsx，ExtendScript 不认相对路径）', () => {
    expect(templateItemAbsDir('abc')).toBe('C:/Users/test/AppData/Roaming/Maomao/template/PSD/abc.info');
    expect(templateSourceAbs('abc', '标题组', 'psd')).toBe(
      'C:/Users/test/AppData/Roaming/Maomao/template/PSD/abc.info/标题组.psd'
    );
  });

  it('源文件落在条目目录下（两处各拼一套就迟早漂）', () => {
    expect(templateSourceAbs('abc', '标题组', 'psd').startsWith(`${templateItemAbsDir('abc')}/`)).toBe(true);
  });

  it('中文文件名不编码（jsx 侧 new File 直接吃中文）', () => {
    expect(templateSourceAbs('abc', '标题组', 'psd')).not.toContain('%');
  });

  it('删条目 = 删整个 <id>.info 目录（storage 要相对路径）', () => {
    removeItemDir('abc');
    expect(h.dirsRemoved).toEqual([{ name: 'template/PSD/abc.info', root: 'data' }]);
  });
});

describe('ensureReadme', () => {
  it('不存在时写一次；已存在时不再写', async () => {
    await ensureReadme();
    /* 路径写死字面量：常量不外露，测试当契约守着，实现改路径这里必须跟着红 */
    expect(h.writes.map((w) => w.name)).toEqual(['template/README.md']);

    await ensureReadme();
    expect(h.writes).toHaveLength(1);
  });
});
