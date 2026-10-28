/**
 * 能力表 ↔ 探测清单的一致性。
 *
 * `PS-CHANNEL-NOTES` §五：加/删 jsx 函数必须同步改 `VENDOR_FUNCS`，漏了会出现
 * 「能力永远不可用」的假故障——**已经发生过一次**。能力表落地后，新增能力只需加一行，
 * 更容易漏掉这一份，所以把「漏了」变成编译后立刻红。
 */
import { describe, expect, it, vi } from 'vitest';
import { CAP } from './capabilities';
import { CORE_FUNCS, CORE_REQUIRED, VENDOR_FUNCS, VENDOR_REQUIRED } from './init';

/* init 会拉起 storage / logger，node 环境下这两个模块读不到 CEP 环境，用假实现挡住 */
vi.mock('../storage', () => ({ ROOTS: { data: 'data', legacy: 'legacy' } }));
vi.mock('../logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

describe('VENDOR_FUNCS', () => {
  it('覆盖表里每一个 vendor 能力（表里加一行，这里必须同时加）', () => {
    const probed: readonly string[] = VENDOR_FUNCS;
    const missing = Object.values(CAP)
      .filter((spec) => spec.gate === 'vendor')
      .map((spec) => spec.fn)
      .filter((fn) => !probed.includes(fn));

    expect(missing).toEqual([]);
  });

  it('调度通道的宿主函数与环境注入始终在清单里', () => {
    /* 这两个不是「某个能力」，但没有它们全部 vendor 能力都跑不起来 */
    expect(VENDOR_FUNCS).toContain('ps_onJsx');
    expect(VENDOR_FUNCS).toContain('Sys_setSystemEnvInfo');
  });
});

describe('必需 / 可选分级', () => {
  it('必需清单必须是探测清单的子集（写错名字等于永不触发）', () => {
    for (const fn of CORE_REQUIRED) expect(CORE_FUNCS).toContain(fn);
    for (const fn of VENDOR_REQUIRED) expect(VENDOR_FUNCS).toContain(fn);
  });

  it('必需清单只留「缺了整门就没意义」的，别把单个能力塞进来', () => {
    /* 缺 mm_diag_vendor 只该影响诊断页、缺 mm_layer_getSelection 只该影响 4 个多选能力；
       塞进必需清单会让字体面板一起变红 */
    expect(CORE_REQUIRED).not.toContain('mm_diag_vendor');
    expect(CORE_REQUIRED).not.toContain('mm_layer_getSelection');
    expect(CORE_REQUIRED).not.toContain('mm_style_applyColor');
    expect(VENDOR_REQUIRED).not.toContain('cy_zoom');
    expect(VENDOR_REQUIRED).not.toContain('ztgl_setFont');
  });
});

describe('CORE_FUNCS', () => {
  it('覆盖表里每一个 core 能力（表里加一行，这里必须同时加）', () => {
    const probed: readonly string[] = CORE_FUNCS;
    const missing = Object.values(CAP)
      .filter((spec) => spec.gate === 'core')
      .map((spec) => spec.fn)
      .filter((fn) => !probed.includes(fn));

    expect(missing).toEqual([]);
  });

  it('不进表但必须探到的自有 jsx 在清单里', () => {
    /* 图层与诊断是基础设施，不在能力表里；少了它们整块 core 都不可用 */
    expect(CORE_FUNCS).toContain('mm_layer_getState');
    expect(CORE_FUNCS).toContain('mm_layer_getSelection');
    expect(CORE_FUNCS).toContain('mm_diag_vendor');
  });
});
