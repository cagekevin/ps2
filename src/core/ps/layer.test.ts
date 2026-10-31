import { describe, expect, it } from 'vitest';
import { layerStateRaw, selectionCountRaw } from './layer';

/**
 * 这两个解析器是 **layer 域私有**的（只服务 `CAP.layerState` / `CAP.selectionCount`），
 * 所以测试也留在本域，不混进 `raw.test.ts` —— 那边只测通用骨架。
 */
describe('layerStateRaw', () => {
  it('切第一个 | ：名称里含 | 时只切一次', () => {
    const result = layerStateRaw('text|标题|副标');
    expect(result).toEqual({ status: 'ok', value: { kind: 'text', name: '标题|副标' } });
  });

  it('没有分隔符 → PS_ERROR（宿主协议不成立，不是数据坏）', () => {
    const result = layerStateRaw('text');
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('PS_ERROR');
  });

  it('约定值先折失败（no-doc 不该被当成分隔符缺失）', () => {
    const result = layerStateRaw('no-doc');
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('PS_NO_DOC');
  });
});

describe('selectionCountRaw', () => {
  it('整数串 → number，前后空白不影响', () => {
    expect(selectionCountRaw('3')).toEqual({ status: 'ok', value: 3 });
    expect(selectionCountRaw(' 12 ')).toEqual({ status: 'ok', value: 12 });
  });

  it('非整数 / 负数 / 非数字 → CORRUPT（形状不对，不是执行失败）', () => {
    for (const raw of ['3.5', '-2', 'abc']) {
      const result = selectionCountRaw(raw);
      expect(result.status).toBe('error');
      if (result.status === 'error') expect(result.code).toBe('CORRUPT');
    }
  });

  it('空串 → PS_BAD_PAYLOAD（`Number(\'\')` 是 0，不判就会静默当成「选中 0 个」）', () => {
    const result = selectionCountRaw('   ');
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('PS_BAD_PAYLOAD');
  });

  it('约定值先折失败（-1 是 PS_REJECTED，不是「负数」）', () => {
    const result = selectionCountRaw('-1');
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('PS_REJECTED');
  });
});
