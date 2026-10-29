/**
 * `repo/json-file` 的行为凭据（仓库层第一个单测）。
 *
 * 覆盖三个入口的差别：文件必须存在 / 缺失按空值 / 缺失即首次创建。
 * storage 用假实现（不碰真磁盘），只验证「读-改-写」的判据。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, failWithDetail, ok } from '../types/result';
import {
  mutateJsonFile,
  readOrEmpty,
  updateJsonFile,
  updateOrCreateJsonFile
} from './json-file';
import { decodeRawRecords } from './settings-object';

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
      return ok(records);
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
      return ok(records);
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('CORRUPT');
    expect(called).toBe(false);
    expect(h.writes).toHaveLength(0);
  });

  it('数组里混入非对象 → CORRUPT，detail 指出下标', async () => {
    h.files.set(`data:${FILE}`, '[{"a":1}, 2]');

    const result = await mutateJsonFile(FILE, 'data', '测试', decodeRawRecords, (records) => ok(records));

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('CORRUPT');
      expect(result.detail).toBe('root[1]');
    }
    expect(h.writes).toHaveLength(0);
  });

  it('mutator 返回 null → 不写盘', async () => {
    h.files.set(`data:${FILE}`, '[{"text":"a"}]');

    const result = await mutateJsonFile(FILE, 'data', '测试', decodeRawRecords, () => ok(null));

    expect(result.status).toBe('ok');
    expect(h.writes).toHaveLength(0);
  });

  it('正常路径 → 写入改后的内容', async () => {
    h.files.set(`data:${FILE}`, '[{"text":"a"}]');

    const result = await mutateJsonFile(FILE, 'data', '测试', decodeRawRecords, (records) => {
      records.push({ text: 'b' });
      return ok(records);
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
        return ok(records);
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
      (records) => ok(records),
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
        return ok(records);
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
        return ok(records);
      },
      { missing: () => [] }
    );

    expect(result.status).toBe('ok');
    expect(JSON.parse(h.writes[0]?.text ?? '[]')).toHaveLength(2);
  });
});

describe('readOrEmpty', () => {
  it('NOT_FOUND → 默认值（首次运行不是故障）', () => {
    expect(readOrEmpty(fail('NOT_FOUND', '文件不存在'), () => ok([]))).toEqual(ok([]));
  });

  it('其它失败原样上抛，不换成默认值', () => {
    const corrupt = failWithDetail('CORRUPT', '坏 JSON', 'raw:x');

    expect(readOrEmpty(corrupt, () => ok([]))).toEqual(corrupt);
  });

  it('成功原样返回', () => {
    expect(readOrEmpty(ok([1]), () => ok([]))).toEqual(ok([1]));
  });
});

describe('updateOrCreateJsonFileOr（mutator 可以直接失败）', () => {
  it('mutator 返回 fail → 原样上抛，一个字节都不写', async () => {
    h.files.set(`legacy:${FILE}`, JSON.stringify([{ text: 'a' }]));

    const result = await updateOrCreateJsonFile(
      FILE,
      'legacy',
      '测试',
      decodeRawRecords,
      () => failWithDetail('VALIDATION', '下标越界', 'index:9'),
      { missing: () => [] }
    );

    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('VALIDATION');
    expect(h.writes).toHaveLength(0);
  });

  it('mutator 返回 ok(null) → 不写，但结果仍是 ok（「不需要写」不是失败）', async () => {
    h.files.set(`legacy:${FILE}`, JSON.stringify([{ text: 'a' }]));

    const result = await updateOrCreateJsonFile(
      FILE,
      'legacy',
      '测试',
      decodeRawRecords,
      () => ok(null),
      { missing: () => [] }
    );

    expect(result.status).toBe('ok');
    expect(h.writes).toHaveLength(0);
  });

  it('文件不存在 → 用 missing 兜底后执行 mutator，首次创建', async () => {
    const result = await updateOrCreateJsonFile(
      FILE,
      'legacy',
      '测试',
      decodeRawRecords,
      (records) => ok([...records, { text: 'new' }]),
      { missing: () => [] }
    );

    expect(result.status).toBe('ok');
    expect(h.writes).toHaveLength(1);
  });
});

describe('并发写：mutator 拿到的是队列内最新记录', () => {
  /**
   * 这条是 `TD-01-16` 的凭据：`commands.patchItem` 把「该项还在不在」的判断放在 mutator 里，
   * 只有当 mutator 拿到**队列内刚读到的**记录时，那个判断才有效（否则两次读之间被删 = 假成功）。
   */
  it('第二个 mutator 看到的是第一个写完之后的内容', async () => {
    h.files.set(`data:${FILE}`, JSON.stringify([{ id: 'a' }]));
    const seen: number[] = [];

    const first = updateOrCreateJsonFile(
      FILE,
      'data',
      '测试',
      decodeRawRecords,
      (records) => {
        seen.push(records.length);
        return ok([]); // 把它删空
      },
      { missing: () => [] }
    );
    const second = updateOrCreateJsonFile(
      FILE,
      'data',
      '测试',
      decodeRawRecords,
      (records) => {
        seen.push(records.length);
        return ok(records);
      },
      { missing: () => [] }
    );

    await Promise.all([first, second]);

    /* 第二次看到 0 条 = 真的重读了；若拿到读缓存就会看到 1 条，patchItem 的存在性判断随即失效 */
    expect(seen).toEqual([1, 0]);
  });
});
