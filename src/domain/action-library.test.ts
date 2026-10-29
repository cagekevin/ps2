/**
 * 动作库形状与纯编辑的凭据（`05` §7.1）。
 *
 * 只测两件机器能判的事：**坏形状怎么报**、**编辑函数返回什么**。
 * 真机行为（`dz_*` 返回形状、文件实际位置）不在这里。
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GROUP,
  decodeIndex,
  decodeLibrary,
  mapPsActions,
  newWarehouseFileName,
  withGroupAdded,
  withGroupRemoved,
  withGroupRenamed,
  withItemAlias,
  withItemAliasRemoved,
  withItemsMoved,
  type ActionGroup
} from './action-library';

const library = (): ActionGroup[] => [
  { groupName: 'A', show: true, list: [{ group: 'A', name: 'a1' }, { group: 'A', name: 'a2' }] },
  { groupName: 'B', show: true, list: [{ group: 'B', name: 'b1' }] }
];

describe('decodeIndex：三种坏形状', () => {
  it('顶层不是对象 → CORRUPT', () => {
    const result = decodeIndex([]);
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('CORRUPT');
  });

  it('仓库项缺 fileName → 跳过并记账（不整份拒绝）', () => {
    const result = decodeIndex({ index: 0, list: [{ name: '有名字没文件' }, { name: 'x', fileName: 'f.json' }] });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.value.index.list).toHaveLength(1);
      expect(result.value.dropped).toHaveLength(1);
    }
  });

  it('index 越界 → 归 0（读操作不改文件）', () => {
    const result = decodeIndex({ index: 9, list: [{ name: 'x', fileName: 'f.json' }] });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value.index.index).toBe(0);
  });
});

describe('decodeLibrary：结构 reject、项 filter', () => {
  it('顶层不是数组 → CORRUPT', () => {
    expect(decodeLibrary({ groups: [] }).status).toBe('error');
  });

  it('组不是对象 → 整份 CORRUPT（结构错）', () => {
    expect(decodeLibrary([{ groupName: 'A', show: true, list: [] }, 3]).status).toBe('error');
  });

  it('动作项缺 group / name → 跳过并记账，组仍在', () => {
    const result = decodeLibrary([
      { groupName: 'A', show: true, list: [{ name: '缺 group' }, { group: 'A', name: 'ok' }] }
    ]);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.value.groups[0]?.list).toEqual([{ group: 'A', name: 'ok' }]);
      expect(result.value.dropped).toHaveLength(1);
      expect(result.value.dropped[0]?.path).toBe('root[0].list[0]');
    }
  });

  it('缺 show 按展开处理；空串 alias = 无别名', () => {
    const result = decodeLibrary([
      { groupName: 'A', list: [{ group: 'A', name: 'a1', alias: '' }] }
    ]);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.value.groups[0]?.show).toBe(true);
      expect(result.value.groups[0]?.list[0]).toEqual({ group: 'A', name: 'a1' });
    }
  });
});

describe('编辑函数', () => {
  it('删分组删到空 → 补「默认分组」（官方 bug 修正）', () => {
    const one = [{ groupName: 'A', show: true, list: [] }];
    const result = withGroupRemoved(one, 0);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.groupName).toBe(DEFAULT_GROUP);
    }
  });

  it('改名不查重（官方也不查）', () => {
    const result = withGroupRenamed(library(), 1, 'A');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value.map((g) => g.groupName)).toEqual(['A', 'A']);
  });

  it('新增分组按 afterIndex 插在其后', () => {
    const next = withGroupAdded(library(), 'C', 0);
    expect(next.map((g) => g.groupName)).toEqual(['A', 'C', 'B']);
  });

  it('设别名保持 group / name；空串 = 删别名', () => {
    const aliased = withItemAlias(library(), 0, 0, '美颜');
    expect(aliased.status).toBe('ok');
    if (aliased.status === 'ok') {
      expect(aliased.value[0]?.list[0]).toEqual({ group: 'A', name: 'a1', alias: '美颜' });
    }

    const removed = withItemAliasRemoved(library(), 0, 0);
    expect(removed.status).toBe('ok');
    if (removed.status === 'ok') {
      expect(removed.value[0]?.list[0]).toEqual({ group: 'A', name: 'a1' });
    }
  });

  it('跨组移动：源组少一项、目标组多一项，group 字段跟着走', () => {
    const moved = withItemsMoved(library(), 0, 0, 1, 0, 'after');
    expect(moved.status).toBe('ok');
    if (moved.status === 'ok') {
      expect(moved.value[0]?.list.map((i) => i.name)).toEqual(['a2']);
      expect(moved.value[1]?.list.map((i) => i.name)).toEqual(['b1', 'a1']);
    }
  });

  it('下标越界 → VALIDATION（不静默 no-op）', () => {
    expect(withGroupRemoved(library(), 5).status).toBe('error');
    const bad = withItemsMoved(library(), 0, 9, 1, 0, 'before');
    expect(bad.status).toBe('error');
  });
});

describe('mapPsActions（唯一映射点）', () => {
  it('两种包装都认', () => {
    const asArray = mapPsActions([{ name: '组1', children: [{ name: '动作1' }] }]);
    expect(asArray).toEqual({ status: 'ok', value: [{ group: '组1', name: '动作1' }] });

    const asInfo = mapPsActions({ info: [{ name: '组1', children: [{ name: '动作1' }] }] });
    expect(asInfo).toEqual({ status: 'ok', value: [{ group: '组1', name: '动作1' }] });
  });

  it('形状不符 → CORRUPT（不谎报没有动作）', () => {
    const result = mapPsActions('nope');
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('CORRUPT');
  });
});

describe('newWarehouseFileName', () => {
  it('前缀 sj_dz、后缀 .json、不与已有名冲突', () => {
    const name = newWarehouseFileName(['a.json']);
    expect(name.startsWith('sj_dz')).toBe(true);
    expect(name.endsWith('.json')).toBe(true);
    expect(name).not.toBe('a.json');
  });
});
