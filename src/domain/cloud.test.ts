/**
 * 云同步的形状与判据凭据。
 *
 * 只测纯函数：hash 稳定性（文件顺序无关）、快照严格校验、台账坏值、覆盖判据三态。
 * 真正的 push / pull 是协议，靠真机验证，不在这里 mock 网络。
 */
import { describe, expect, it } from 'vitest';
import {
  EMPTY_SNAPSHOT,
  buildUnit,
  decodeLedger,
  decodeSnapshot,
  needsOverwrite,
  parseGatewayData
} from './cloud';

const BASE = {
  type: 'psz_sync',
  schema: 1,
  rev: 3,
  updatedAt: 1761700000000,
  units: {}
};

describe('buildUnit', () => {
  it('hash 与文件顺序无关，files 按 path 排序', () => {
    const left = buildUnit([
      { path: '/b.json', text: '{"b":2}' },
      { path: '/a.ini', text: '{"a":1}' }
    ]);
    const right = buildUnit([
      { path: '/a.ini', text: '{"a":1}' },
      { path: '/b.json', text: '{"b":2}' }
    ]);

    expect(left.hash).toBe(right.hash);
    expect(left.files.map((file) => file.path)).toEqual(['/a.ini', '/b.json']);
  });

  it('内容变了 hash 就变', () => {
    const before = buildUnit([{ path: '/a.ini', text: '{"a":1}' }]);
    const after = buildUnit([{ path: '/a.ini', text: '{"a":2}' }]);
    expect(before.hash).not.toBe(after.hash);
  });

  it('size 是 UTF-8 字节数', () => {
    const unit = buildUnit([{ path: '/a.json', text: '中' }]);
    expect(unit.files[0]?.size).toBe(3);
  });
});

describe('decodeSnapshot', () => {
  it('最小合法快照（units 为空）通过', () => {
    const result = decodeSnapshot(BASE);
    expect(result.status).toBe('ok');
  });

  it('缺 units → CORRUPT', () => {
    const result = decodeSnapshot({ ...BASE, units: undefined });
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('CORRUPT');
      expect(result.detail).toBe('root.units');
    }
  });

  it('type / schema 不是本工具的值 → CORRUPT', () => {
    expect(decodeSnapshot({ ...BASE, type: 'other' }).status).toBe('error');
    expect(decodeSnapshot({ ...BASE, schema: 2 }).status).toBe('error');
  });

  it('rev 不是非负整数 → CORRUPT', () => {
    expect(decodeSnapshot({ ...BASE, rev: 1.5 }).status).toBe('error');
    expect(decodeSnapshot({ ...BASE, rev: -1 }).status).toBe('error');
  });

  it('file.path 不以 / 开头 → CORRUPT，detail 指到那一个文件', () => {
    const result = decodeSnapshot({
      ...BASE,
      units: {
        'style.library': {
          schema: 1,
          hash: 'h',
          files: [
            {
              path: 'sj_kuStoreInfo.ini',
              size: 1,
              content: { kind: 'inline', data: '{}', encoding: 'json' }
            }
          ]
        }
      }
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.detail).toBe('units.style.library.files[0].path');
  });

  it('content 不是 inline/json → CORRUPT', () => {
    const result = decodeSnapshot({
      ...BASE,
      units: {
        'action.library': {
          schema: 1,
          hash: 'h',
          files: [{ path: '/a.json', size: 1, content: { kind: 'remote' } }]
        }
      }
    });
    expect(result.status).toBe('error');
  });
});

describe('parseGatewayData', () => {
  it('SUCCESS + data → 取出 data', () => {
    const result = parseGatewayData('{"status":"SUCCESS","data":{"a":1}}');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value).toEqual({ a: 1 });
  });

  it('SUCCESS + data:null → ok(null)，由命令层折成空快照', () => {
    const result = parseGatewayData('{"status":"SUCCESS","data":null}');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value).toBeNull();
  });

  it('ERROR → CORRUPT，服务端原话进 detail', () => {
    const result = parseGatewayData('{"status":"ERROR","error":"未知指令: x"}');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('CORRUPT');
      expect(result.detail).toBe('server:未知指令: x');
    }
  });

  it('不是 JSON / 没有 status → CORRUPT', () => {
    expect(parseGatewayData('<html>').status).toBe('error');
    expect(parseGatewayData('{"data":{}}').status).toBe('error');
  });
});

describe('EMPTY_SNAPSHOT', () => {
  it('空快照能过快照校验，rev 固定 0', () => {
    expect(decodeSnapshot(EMPTY_SNAPSHOT).status).toBe('ok');
    expect(EMPTY_SNAPSHOT.rev).toBe(0);
  });
});

describe('decodeLedger', () => {
  it('合法台账读回两个数', () => {
    expect(decodeLedger({ rev: 2, syncedAt: 1761700000000 })).toEqual({
      rev: 2,
      syncedAt: 1761700000000
    });
  });

  it('坏值一律 null（不是坏文件）', () => {
    expect(decodeLedger(null)).toBeNull();
    expect(decodeLedger({ rev: 'x', syncedAt: 1 })).toBeNull();
    expect(decodeLedger({ rev: -1, syncedAt: 1 })).toBeNull();
    expect(decodeLedger({ rev: 1 })).toBeNull();
  });
});

describe('needsOverwrite', () => {
  it('云端更新才需要确认', () => {
    expect(needsOverwrite(1, 0)).toBe(true);
    expect(needsOverwrite(1, 1)).toBe(false);
    expect(needsOverwrite(0, 0)).toBe(false);
  });
});
