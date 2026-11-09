/**
 * DLSS 两个解析器的 accept 与约定值（`core/ps/dlss-raw.ts`）。
 *
 * 只测「形状怎么收窄、约定值折成哪个码」—— 文案不在这里断言（那是 `MSG` 的事）。
 */
import { describe, expect, it } from 'vitest';
import { dlssExportRaw, dlssPlacedRaw } from './dlss-raw';

describe('dlssExportRaw', () => {
  it('正常载荷原样收窄', () => {
    const result = dlssExportRaw(
      JSON.stringify({ left: 10, top: 20, width: 300, height: 200, layerName: '图层 A' })
    );

    expect(result).toEqual({
      status: 'ok',
      value: { left: 10, top: 20, width: 300, height: 200, layerName: '图层 A' }
    });
  });

  it.each([
    ['no-doc', 'PS_NO_DOC'],
    ['layer-too-big', 'PS_REJECTED'],
    ['result-missing', 'PS_ERROR']
  ])('约定值 %s 折成 %s', (raw, code) => {
    const result = dlssExportRaw(raw);

    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.code).toBe(code);
    expect(result.detail).toBe(`raw:${raw}`);
  });

  it('缺字段 / 尺寸为 0：PS_BAD_PAYLOAD，detail 指出字段', () => {
    const missing = dlssExportRaw(JSON.stringify({ left: 0, top: 0, width: 10 }));
    expect(missing.status).toBe('error');
    if (missing.status !== 'error') return;
    expect(missing.code).toBe('PS_BAD_PAYLOAD');
    expect(missing.detail).toContain('field:size');

    const zero = dlssExportRaw(
      JSON.stringify({ left: 0, top: 0, width: 0, height: 10, layerName: 'a' })
    );
    expect(zero.status).toBe('error');
  });

  it('不是对象：PS_BAD_PAYLOAD', () => {
    const result = dlssExportRaw('"a string"');
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.code).toBe('PS_BAD_PAYLOAD');
  });
});

describe('dlssPlacedRaw', () => {
  it('layer 必须带落点', () => {
    const result = dlssPlacedRaw(
      JSON.stringify({ mode: 'layer', name: 'A', left: 1, top: 2, width: 10, height: 20 })
    );

    expect(result).toEqual({
      status: 'ok',
      value: { mode: 'layer', name: 'A', left: 1, top: 2, width: 10, height: 20 }
    });
  });

  it('layer 缺落点：PS_BAD_PAYLOAD（对齐结果要能验）', () => {
    const result = dlssPlacedRaw(JSON.stringify({ mode: 'layer', name: 'A', width: 10, height: 20 }));

    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.code).toBe('PS_BAD_PAYLOAD');
    expect(result.detail).toContain('field:offset');
  });

  it('document 不带落点', () => {
    const result = dlssPlacedRaw(
      JSON.stringify({ mode: 'document', name: 'A · DLSS NR 2x', width: 40, height: 60 })
    );

    expect(result).toEqual({
      status: 'ok',
      value: { mode: 'document', name: 'A · DLSS NR 2x', width: 40, height: 60 }
    });
  });

  it('mode 认不出：PS_BAD_PAYLOAD', () => {
    const result = dlssPlacedRaw(JSON.stringify({ mode: 'other', name: 'A', width: 1, height: 1 }));

    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.detail).toContain('field:mode');
  });

  it('result-missing 折 PS_ERROR（故障，红）', () => {
    const result = dlssPlacedRaw('result-missing');

    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.code).toBe('PS_ERROR');
  });
});
