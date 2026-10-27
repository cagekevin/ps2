import { describe, expect, it } from 'vitest';
import { decodeKuData, isKuLibraryFileName, kuLibraryKind, kuShapeOf, resolveKuGroups } from './ku-format';

/** 模拟 base64 解码：真实数据是 UTF-8 JSON 的 base64 */
function fakeDecode(base64: string): string {
  if (base64 === 'BAD') throw new Error('解码失败');
  return JSON.stringify([{ name: '解码出来的组', show: true, list: [] }]);
}

describe('kuLibraryKind', () => {
  it('按后三位识别类型', () => {
    expect(kuLibraryKind('sj_kuColABC.ini')).toBe('color');
    expect(kuLibraryKind('sj_kuGraABC.ini')).toBe('gradient');
    expect(kuLibraryKind('sj_kuFonABC.json')).toBe('font');
    expect(kuLibraryKind('sj_kuFotABC.json')).toBe('font');
    expect(kuLibraryKind('sj_kuStyABC.ini')).toBe('style');
  });

  it('非库文件算 sidecar', () => {
    expect(kuLibraryKind('kuStyle/abc.png')).toBe('sidecar');
    expect(kuLibraryKind('sj_set.json')).toBe('sidecar');
    expect(kuLibraryKind('sj_kuXYZ.ini')).toBe('sidecar');
  });

  it('isKuLibraryFileName 与类型判断一致', () => {
    expect(isKuLibraryFileName('sj_kuColABC.ini')).toBe(true);
    expect(isKuLibraryFileName('sj_set.json')).toBe(false);
  });
});

describe('kuShapeOf', () => {
  it('groups：数组且元素是组对象', () => {
    const result = kuShapeOf([{ name: '组', show: true, list: [] }]);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value.shape).toBe('groups');
  });

  it('flat：数组且首元素带 data', () => {
    const result = kuShapeOf([{ name: 'sj_kuCol1.ini', data: 'BASE64' }]);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value.shape).toBe('flat');
  });

  it('container：对象带 arrFileData', () => {
    const result = kuShapeOf({ arrFileData: [{ name: 'sj_kuCol1.ini', data: 'BASE64' }], store: {} });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value.shape).toBe('container');
  });

  it('数组里混非对象 → corrupt', () => {
    const result = kuShapeOf([42]);
    expect(result.status).toBe('error');
  });

  it('对象缺 arrFileData → corrupt', () => {
    const result = kuShapeOf({ foo: 1 });
    expect(result.status).toBe('error');
  });

  it('既不是数组也不是对象 → corrupt', () => {
    expect(kuShapeOf('text').status).toBe('error');
    expect(kuShapeOf(null).status).toBe('error');
  });
});

describe('decodeKuData', () => {
  it('正常解码', () => {
    const result = decodeKuData('QUJD', fakeDecode);
    expect(result.status).toBe('ok');
  });

  it('非字符串（原版的 false）→ corrupt', () => {
    expect(decodeKuData(false, fakeDecode).status).toBe('error');
    expect(decodeKuData(0, fakeDecode).status).toBe('error');
  });

  it('空串 → corrupt', () => {
    expect(decodeKuData('   ', fakeDecode).status).toBe('error');
  });

  it('解码抛错 → corrupt', () => {
    const result = decodeKuData('BAD', fakeDecode);
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.reason).toContain('base64');
  });

  it('解码前去掉空白', () => {
    let received = '';
    decodeKuData('AB\nCD', (text) => {
      received = text;
      return '[]';
    });
    expect(received).toBe('ABCD');
  });
});

describe('resolveKuGroups', () => {
  it('groups 形态直接返回', () => {
    const groups = [{ name: '组', show: true, list: [] }];
    const result = resolveKuGroups(groups, fakeDecode);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value).toHaveLength(1);
  });

  it('flat 形态解码 data', () => {
    const result = resolveKuGroups([{ name: 'sj_kuCol1.ini', data: 'QUJD' }], fakeDecode);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value[0]?.name).toBe('解码出来的组');
  });

  it('container 形态找库文件并解码', () => {
    const parsed = {
      arrFileData: [
        { name: 'kuStyle/abc.png', data: 'QUJD' },
        { name: 'sj_kuCol1.ini', data: 'QUJD' }
      ]
    };
    const result = resolveKuGroups(parsed, fakeDecode);
    expect(result.status).toBe('ok');
  });

  it('container 里没有库文件 → corrupt', () => {
    const parsed = { arrFileData: [{ name: 'kuStyle/abc.png', data: 'QUJD' }] };
    const result = resolveKuGroups(parsed, fakeDecode);
    expect(result.status).toBe('error');
  });

  it('内层不是 JSON → corrupt', () => {
    const result = resolveKuGroups([{ name: 'x', data: 'QUJD' }], () => 'not json');
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.reason).toContain('内层');
  });
});
