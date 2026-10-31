import { describe, expect, it } from 'vitest';
import type { Result } from '../types/result';
import {
  addFolder,
  addItem,
  childFolders,
  decodeTemplateIndex,
  emptyTemplateIndex,
  folderPath,
  itemsOf,
  moveItem,
  normalizeFolderId,
  removeFolder,
  removeItem,
  renameFolder,
  renameItem,
  TEMPLATE_VERSION,
  type TemplateIndex,
  type TemplateItem
} from './template-library';

/* ---------------- 夹具 ---------------- */

const item = (over: Partial<TemplateItem> = {}): TemplateItem => ({
  id: 'i1',
  file: '标题组',
  ext: 'psd',
  name: '标题组',
  folderId: null,
  width: 800,
  height: 600,
  createdAt: 1000,
  ...over
});

/** 两夹（根 a / a 下 b）+ 三条目（根两条、b 里一条） */
function fixture(): TemplateIndex {
  return {
    version: TEMPLATE_VERSION,
    folders: [
      { id: 'fa', name: 'banner', parentId: null },
      { id: 'fb', name: 'sub', parentId: 'fa' }
    ],
    items: [
      item({ id: 'i1', createdAt: 1000 }),
      item({ id: 'i2', createdAt: 3000 }),
      item({ id: 'i3', folderId: 'fa', createdAt: 2000 })
    ]
  };
}

const errCode = (r: Result<unknown>): string => (r.status === 'error' ? r.code : 'ok');

/* ---------------- 解码 ---------------- */

describe('decodeTemplateIndex', () => {
  it('空索引解码通过', () => {
    const r = decodeTemplateIndex({ version: 1, folders: [], items: [] });
    expect(r.status).toBe('ok');
  });

  it('不是对象 → CORRUPT', () => {
    expect(errCode(decodeTemplateIndex('nope'))).toBe('CORRUPT');
  });

  it('version 不是 1 → CORRUPT（不迁移）', () => {
    expect(errCode(decodeTemplateIndex({ version: 2, folders: [], items: [] }))).toBe('CORRUPT');
  });

  it('folders 不是数组 → CORRUPT', () => {
    expect(errCode(decodeTemplateIndex({ version: 1, folders: {}, items: [] }))).toBe('CORRUPT');
  });

  it('条目缺 id → CORRUPT（detail 指到字段路径）', () => {
    const r = decodeTemplateIndex({
      version: 1,
      folders: [],
      items: [{ name: 'x', ext: 'psd', folderId: null, width: 1, height: 1, createdAt: 0 }]
    });
    expect(errCode(r)).toBe('CORRUPT');
    if (r.status === 'error') expect(r.detail).toContain('items[0].id');
  });

  it('宽度写成字符串 → CORRUPT', () => {
    const r = decodeTemplateIndex({
      version: 1,
      folders: [],
      items: [{ id: 'a', file: 'f', ext: 'psd', name: 'n', folderId: null, width: '800', height: 1, createdAt: 0 }]
    });
    expect(errCode(r)).toBe('CORRUPT');
  });
});

describe('emptyTemplateIndex', () => {
  it('版本为 1、两个空数组', () => {
    expect(emptyTemplateIndex()).toEqual({ version: 1, folders: [], items: [] });
  });
});

/* ---------------- 读 ---------------- */

describe('childFolders', () => {
  it('只返回同父级，按名字升序', () => {
    const index: TemplateIndex = {
      version: 1,
      folders: [
        { id: 'f2', name: 'b', parentId: null },
        { id: 'f1', name: 'a', parentId: null },
        { id: 'f3', name: 'c', parentId: 'f1' }
      ],
      items: []
    };
    expect(childFolders(index, null).map((f) => f.name)).toEqual(['a', 'b']);
    expect(childFolders(index, 'f1').map((f) => f.name)).toEqual(['c']);
  });
});

describe('folderPath', () => {
  it('根到当前，逐层', () => {
    expect(folderPath(fixture(), 'fb').map((f) => f.id)).toEqual(['fa', 'fb']);
  });

  it('根层返回空数组', () => {
    expect(folderPath(fixture(), null)).toEqual([]);
  });

  it('id 不存在返回空数组（不抛）', () => {
    expect(folderPath(fixture(), 'nope')).toEqual([]);
  });
});

describe('itemsOf', () => {
  it('只取本层，createdAt 倒序', () => {
    expect(itemsOf(fixture(), null).map((i) => i.id)).toEqual(['i2', 'i1']);
    expect(itemsOf(fixture(), 'fa').map((i) => i.id)).toEqual(['i3']);
  });
});

/* ---------------- 文件夹编辑 ---------------- */

describe('addFolder', () => {
  it('同父级重名 → VALIDATION', () => {
    const r = addFolder(fixture(), { id: 'fx', name: 'banner', parentId: null });
    expect(errCode(r)).toBe('VALIDATION');
  });

  it('不同父级同名允许', () => {
    const r = addFolder(fixture(), { id: 'fx', name: 'banner', parentId: 'fa' });
    expect(r.status).toBe('ok');
  });

  it('父级不存在 → NOT_FOUND', () => {
    expect(errCode(addFolder(fixture(), { id: 'fx', name: 'x', parentId: 'nope' }))).toBe('NOT_FOUND');
  });
});

describe('renameFolder', () => {
  it('改成同父级已用的名字 → VALIDATION', () => {
    const index: TemplateIndex = {
      version: 1,
      folders: [
        { id: 'f1', name: 'a', parentId: null },
        { id: 'f2', name: 'b', parentId: null }
      ],
      items: []
    };
    expect(errCode(renameFolder(index, 'f2', 'a'))).toBe('VALIDATION');
  });

  it('改成自己原来的名字不算重名', () => {
    expect(renameFolder(fixture(), 'fa', 'banner').status).toBe('ok');
  });

  it('空名 → VALIDATION；id 不存在 → NOT_FOUND', () => {
    expect(errCode(renameFolder(fixture(), 'fa', '  '))).toBe('VALIDATION');
    expect(errCode(renameFolder(fixture(), 'nope', 'x'))).toBe('NOT_FOUND');
  });
});

describe('removeFolder', () => {
  it('空文件夹可删', () => {
    const index: TemplateIndex = {
      version: 1,
      folders: [{ id: 'f1', name: 'a', parentId: null }],
      items: []
    };
    const r = removeFolder(index, 'f1');
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.value.folders).toHaveLength(0);
  });

  it('有子文件夹 → VALIDATION', () => {
    expect(errCode(removeFolder(fixture(), 'fa'))).toBe('VALIDATION');
  });

  it('有条目 → VALIDATION', () => {
    const index: TemplateIndex = {
      version: 1,
      folders: [{ id: 'f1', name: 'a', parentId: null }],
      items: [item({ folderId: 'f1' })]
    };
    expect(errCode(removeFolder(index, 'f1'))).toBe('VALIDATION');
  });

  it('id 不存在 → NOT_FOUND', () => {
    expect(errCode(removeFolder(fixture(), 'nope'))).toBe('NOT_FOUND');
  });
});

/* ---------------- 条目编辑 ---------------- */

describe('addItem', () => {
  it('id 已存在 → VALIDATION', () => {
    expect(errCode(addItem(fixture(), item({ id: 'i1' })))).toBe('VALIDATION');
  });

  it('folderId 指向不存在的文件夹 → NOT_FOUND', () => {
    expect(errCode(addItem(fixture(), item({ id: 'new', folderId: 'nope' })))).toBe('NOT_FOUND');
  });

  it('成功时条目追加在末尾', () => {
    const r = addItem(fixture(), item({ id: 'new' }));
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.value.items[r.value.items.length - 1]?.id).toBe('new');
  });
});

describe('renameItem', () => {
  it('只改 name，file / ext 不动（路径靠它们）', () => {
    const r = renameItem(fixture(), 'i1', '新名字');
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    const next = r.value.items.find((i) => i.id === 'i1');
    expect(next?.name).toBe('新名字');
    expect(next?.file).toBe('标题组');
    expect(next?.ext).toBe('psd');
  });

  it('允许重名（两个条目同名）', () => {
    expect(renameItem(fixture(), 'i1', '标题组').status).toBe('ok');
  });

  it('空名 → VALIDATION；id 不存在 → NOT_FOUND', () => {
    expect(errCode(renameItem(fixture(), 'i1', ''))).toBe('VALIDATION');
    expect(errCode(renameItem(fixture(), 'nope', 'x'))).toBe('NOT_FOUND');
  });
});

describe('moveItem', () => {
  it('移到指定文件夹', () => {
    const r = moveItem(fixture(), 'i1', 'fa');
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.value.items.find((i) => i.id === 'i1')?.folderId).toBe('fa');
  });

  it('移到根（null）', () => {
    const r = moveItem(fixture(), 'i3', null);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.value.items.find((i) => i.id === 'i3')?.folderId).toBeNull();
  });

  it('目标文件夹不存在 → NOT_FOUND；条目不存在 → NOT_FOUND', () => {
    expect(errCode(moveItem(fixture(), 'i1', 'nope'))).toBe('NOT_FOUND');
    expect(errCode(moveItem(fixture(), 'nope', 'fa'))).toBe('NOT_FOUND');
  });
});

describe('removeItem', () => {
  it('删掉后不再存在', () => {
    const r = removeItem(fixture(), 'i1');
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.value.items.some((i) => i.id === 'i1')).toBe(false);
  });

  it('id 不存在 → NOT_FOUND', () => {
    expect(errCode(removeItem(fixture(), 'nope'))).toBe('NOT_FOUND');
  });
});

describe('normalizeFolderId', () => {
  it('存在的 id 原样返回', () => {
    expect(normalizeFolderId(fixture(), 'fa')).toBe('fa');
  });

  it('指向不存在的文件夹 → null', () => {
    expect(normalizeFolderId(fixture(), 'nope')).toBeNull();
  });

  it('null 仍是 null', () => {
    expect(normalizeFolderId(fixture(), null)).toBeNull();
  });
});
