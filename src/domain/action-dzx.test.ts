/**
 * `.dzx` 编解码与导入计划（`05` §7.1）。
 *
 * 三个判据：往返不丢内容、坏输入一律 CORRUPT、追加模式只在**文件名**上去重。
 */
import { describe, expect, it } from 'vitest';
import { decodeDzx, encodeDzx, planImportFiles } from './action-dzx';
import type { WarehouseIndex } from './action-library';

const index: WarehouseIndex = { index: 0, list: [{ name: '默认仓库', fileName: 'a.json' }] };

describe('encode / decode 往返', () => {
  it('内容与索引都不丢', () => {
    const payload = encodeDzx(index, [{ name: 'a.json', data: 'eyJ4IjoxfQ==' }]);
    const decoded = decodeDzx(JSON.parse(JSON.stringify(payload)));

    expect(decoded.status).toBe('ok');
    if (decoded.status === 'ok') {
      expect(decoded.value.arrFileData).toEqual([{ name: 'a.json', data: 'eyJ4IjoxfQ==' }]);
      expect(decoded.value.store.list[0]?.fileName).toBe('a.json');
    }
  });

  it('坏输入三种都 CORRUPT（顶层/缺项/缺内容）', () => {
    for (const bad of [
      [],
      { arrFileData: [{ name: 'a.json' }], store: index },
      { arrFileData: [{ data: 'x' }], store: index },
      { arrFileData: 'nope', store: index }
    ]) {
      expect(decodeDzx(bad).status, JSON.stringify(bad)).toBe('error');
    }
  });
});

describe('planImportFiles', () => {
  it('替换：索引换成预设的，旧文件名记进 removed（不删文件）', () => {
    const payload = {
      arrFileData: [{ name: 'b.json', data: 'x' }],
      store: { index: 1, list: [{ name: '新仓库', fileName: 'b.json' }] }
    };
    const plan = planImportFiles(index, payload, false);

    expect(plan.status).toBe('ok');
    if (plan.status === 'ok') {
      expect(plan.value.nextIndex.index).toBe(0);
      expect(plan.value.nextIndex.list.map((e) => e.fileName)).toEqual(['b.json']);
      /* 旧文件名不出现在计划里：替换不删文件（`05` §3.3），列出来反而像要清理 */
      expect(JSON.stringify(plan.value)).not.toContain('a.json');
      expect(plan.value.writes).toEqual([{ name: 'b.json', base64: 'x' }]);
    }
  });

  it('追加：文件名冲突时改名，仓库名保持预设里的，index 不变', () => {
    const payload = {
      arrFileData: [{ name: 'a.json', data: 'x' }],
      store: { index: 0, list: [{ name: '另一个名字', fileName: 'a.json' }] }
    };
    const plan = planImportFiles(index, payload, true);

    expect(plan.status).toBe('ok');
    if (plan.status === 'ok') {
      expect(plan.value.nextIndex.index).toBe(0);
      expect(plan.value.nextIndex.list).toHaveLength(2);
      expect(plan.value.nextIndex.list[1]?.name).toBe('另一个名字');
      expect(plan.value.nextIndex.list[1]?.fileName).not.toBe('a.json');
      /* 写入用的是改名后的文件名，否则会覆盖已有仓库 */
      expect(plan.value.writes[0]?.name).toBe(plan.value.nextIndex.list[1]?.fileName);
    }
  });

  it('追加：不冲突时原样写入', () => {
    const payload = {
      arrFileData: [{ name: 'c.json', data: 'y' }],
      store: { index: 0, list: [{ name: 'C', fileName: 'c.json' }] }
    };
    const plan = planImportFiles(index, payload, true);

    expect(plan.status).toBe('ok');
    if (plan.status === 'ok') expect(plan.value.writes).toEqual([{ name: 'c.json', base64: 'y' }]);
  });
});

describe('索引项必须有对应写入（不制造悬空项）', () => {
  it('替换：store 里没有文件的项被丢掉', () => {
    const payload = {
      arrFileData: [{ name: 'b.json', data: 'x' }],
      store: { index: 0, list: [{ name: 'B', fileName: 'b.json' }, { name: '幽灵', fileName: 'z.json' }] }
    };
    const plan = planImportFiles(index, payload, false);

    expect(plan.status).toBe('ok');
    if (plan.status === 'ok') expect(plan.value.nextIndex.list.map((e) => e.fileName)).toEqual(['b.json']);
  });

  it('追加：没有文件的项不进索引', () => {
    const payload = {
      arrFileData: [],
      store: { index: 0, list: [{ name: '幽灵', fileName: 'z.json' }] }
    };
    const plan = planImportFiles(index, payload, true);

    expect(plan.status).toBe('ok');
    if (plan.status === 'ok') {
      expect(plan.value.nextIndex.list).toHaveLength(1);
      expect(plan.value.writes).toHaveLength(0);
    }
  });
});
