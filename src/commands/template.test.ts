/**
 * 模板库命令：只钉「交给 vendor 的载荷形状」这一条。
 *
 * 为什么值得一条测试：2026-11-04 的「应用模板提示打开错误，找不到PSD」不是路径拼错，
 * 而是载荷字段名错 —— vendor `mb_useTemplate` 读 `obj.name` 拼磁盘路径，我们发的是 `file`，
 * 于是拼出 `<id>.info/undefined.psd`。这种错编译期拦不住（载荷是 `interface`，字段可选性靠人），
 * 只能靠断言钉住「发出去的键叫 name，值是磁盘主干」。
 */
import { describe, expect, it, vi } from 'vitest';
import { placeTemplate } from './template';

const h = vi.hoisted(() => ({ applied: [] as Record<string, unknown>[] }));

vi.mock('../core/ps/template', () => ({
  addTemplate: vi.fn(),
  applyTemplate: (payload: Record<string, unknown>) => {
    h.applied.push(payload);
    return Promise.resolve({ status: 'ok' as const, value: undefined });
  },
  openSource: vi.fn(),
  rebuildThumb: vi.fn(),
  openLibraryDir: vi.fn()
}));

/* 索引里「磁盘主干 file」与「显示名 name」故意不同，才能验出发错字段 */
const ITEM = {
  id: 'FI14284D3B9E1E1559',
  file: '圈02',
  ext: 'psd',
  name: '圈02（改过名）',
  folderId: null,
  width: 170,
  height: 171,
  createdAt: 0
};

vi.mock('../repo/template-repo', () => ({
  readIndex: () => ({ status: 'ok' as const, value: { version: 1, folders: [], items: [ITEM] } }),
  updateIndex: vi.fn(),
  ensureReadme: vi.fn(),
  removeItemDir: vi.fn(),
  templateDir: vi.fn(),
  templateItemAbsDir: () => 'C:/abs/template/PSD/FI14284D3B9E1E1559.info',
  templateSourceAbs: () => 'C:/abs/template/PSD/FI14284D3B9E1E1559.info/圈02.psd',
  templateLibraryAbsDir: () => 'C:/abs/template',
  templatePsdAbsDir: () => 'C:/abs/template/PSD'
}));

describe('placeTemplate 的载荷', () => {
  it('name 发磁盘文件名主干（不是显示名），且不发 file', async () => {
    await placeTemplate(ITEM.id);

    expect(h.applied).toHaveLength(1);
    const payload = h.applied[0] ?? {};
    expect(payload.name).toBe('圈02');
    expect(payload.file).toBeUndefined();
    expect(payload.ext).toBe('psd');
    expect(payload.id).toBe(ITEM.id);
  });

  it('path 发库的 PSD 根目录绝对路径', async () => {
    h.applied.length = 0;
    await placeTemplate(ITEM.id);
    expect(h.applied[0]?.path).toBe('C:/abs/template/PSD');
  });

  /*
   * status 必须是 0：1 会让 vendor 走「置入链接智能对象」分支，置入态下它的对齐调用
   * 会被 PS 判为不可用（每次应用弹「命令"对齐"当前不可用」），产物形态也不是计划的「复制顶层图层」。
   */
  it('status 发 0（复制顶层图层），不是 1（置入链接智能对象）', async () => {
    h.applied.length = 0;
    await placeTemplate(ITEM.id);
    expect(h.applied[0]?.status).toBe(0);
  });

  it('条目不存在 → NOT_FOUND，不发 PS 调用', async () => {
    h.applied.length = 0;
    const result = await placeTemplate('no-such-id');
    expect(result.status).toBe('error');
    expect(h.applied).toHaveLength(0);
  });
});
