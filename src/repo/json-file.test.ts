/**
 * `repo/json-file` 的行为凭据（仓库层第一个单测）。
 *
 * 覆盖三个入口的差别：文件必须存在 / 缺失按空值 / 缺失即首次创建。
 * storage 用假实现（不碰真磁盘），只验证「读-改-写」的判据。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  decodeRawRecords,
  mutateJsonFile,
  updateJsonFile,
  updateOrCreateJsonFile
} from './json-file';

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

const FILE = 'demo.json';

beforeEach(() => {
  h.files.clear();
  h.writes.length = 0;
});

describe('mutateJsonFile（文件必须存在）', () => {
  it('文件不存在 → NOT_FOUND，不执行 mutator、不写盘', async () => {
    let called = false;
    const result = await mutateJsonFile(FILE, 'data', '测试', decodeRawRecords, (records) => {
      called = true;
      records.push({ text: 'x' });
      return records;
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('NOT_FOUND');
    expect(called).toBe(false);
    expect(h.writes).toHaveLength(0);
  });

  it('坏 JSON → CORRUPT，不执行 mutator', async () => {
    h.files.set(`data:${FILE}`, '{ 这不是 JSON');
    let called = false;

    const result = await mutateJsonFile(FILE, 'data', '测试', decodeRawRecords, (records) => {
      called = true;
      return records;
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('CORRUPT');
    expect(called).toBe(false);
    expect(h.writes).toHaveLength(0);
  });

  it('数组里混入非对象 → CORRUPT，detail 指出下标', async () => {
    h.files.set(`data:${FILE}`, '[{"a":1}, 2]');

    const result = await mutateJsonFile(FILE, 'data', '测试', decodeRawRecords, (records) => records);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('CORRUPT');
      expect(result.detail).toBe('root[1]');
    }
    expect(h.writes).toHaveLength(0);
  });

  it('mutator 返回 null → 不写盘', async () => {
    h.files.set(`data:${FILE}`, '[{"text":"a"}]');

    const result = await mutateJsonFile(FILE, 'data', '测试', decodeRawRecords, () => null);

    expect(result.status).toBe('ok');
    expect(h.writes).toHaveLength(0);
  });

  it('正常路径 → 写入改后的内容', async () => {
    h.files.set(`data:${FILE}`, '[{"text":"a"}]');

    const result = await mutateJsonFile(FILE, 'data', '测试', decodeRawRecords, (records) => {
      records.push({ text: 'b' });
      return records;
    });

    expect(result.status).toBe('ok');
    expect(h.writes).toHaveLength(1);
    expect(JSON.parse(h.writes[0]?.text ?? '[]')).toHaveLength(2);
  });
});

describe('updateJsonFile（缺失 = 空值）', () => {
  it('文件不存在 → 按 missing 空值继续并写盘', async () => {
    const result = await updateJsonFile(
      FILE,
      'data',
      '测试',
      decodeRawRecords,
      (records) => {
        records.push({ text: 'a' });
        return records;
      },
      { missing: () => [] }
    );

    expect(result.status).toBe('ok');
    expect(h.writes).toHaveLength(1);
    expect(JSON.parse(h.writes[0]?.text ?? '[]')).toHaveLength(1);
  });

  it('坏 JSON 仍然拒绝（不当作空值）', async () => {
    h.files.set(`data:${FILE}`, 'nope');

    const result = await updateJsonFile(
      FILE,
      'data',
      '测试',
      decodeRawRecords,
      (records) => records,
      { missing: () => [] }
    );

    expect(result.status).toBe('error');
    expect(h.writes).toHaveLength(0);
  });
});

describe('updateOrCreateJsonFile（缺失 = 首次创建）', () => {
  it('文件不存在 → 创建', async () => {
    const result = await updateOrCreateJsonFile(
      FILE,
      'data',
      '测试',
      decodeRawRecords,
      (records) => {
        records.push({ text: 'a' });
        return records;
      },
      { missing: () => [] }
    );

    expect(result.status).toBe('ok');
    expect(h.writes).toHaveLength(1);
    expect(JSON.parse(h.writes[0]?.text ?? '[]')).toHaveLength(1);
  });

  it('文件已存在 → 走读改写，不当成新建', async () => {
    h.files.set(`data:${FILE}`, '[{"text":"a"}]');

    const result = await updateOrCreateJsonFile(
      FILE,
      'data',
      '测试',
      decodeRawRecords,
      (records) => {
        records.push({ text: 'b' });
        return records;
      },
      { missing: () => [] }
    );

    expect(result.status).toBe('ok');
    expect(JSON.parse(h.writes[0]?.text ?? '[]')).toHaveLength(2);
  });
});
