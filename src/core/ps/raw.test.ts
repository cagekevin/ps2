import { describe, expect, it } from 'vitest';
import { failWithDetail, ok, type Result } from '../../types/result';
import {
  envelopeMessage,
  isOkSentinel,
  lenientVoid,
  parseDataEnvelope,
  parseErrEnvelope,
  parseFontFamily,
  parseJsxRaw,
  parseSystemFontList,
  passthrough,
  strictData,
  strictPayload,
  strictVoid,
  unwrapRaw
} from './raw';

describe('unwrapRaw', () => {
  it('约定失败码折成对应子码，detail 带原始值', () => {
    const result = unwrapRaw('no-doc');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('PS_NO_DOC');
      expect(result.detail).toBe('raw:no-doc');
    }
    expect(unwrapRaw('-1').status).toBe('error');
    expect(unwrapRaw('skipped').status).toBe('error');
    expect(unwrapRaw('not-shape').status).toBe('error');
  });

  it('前后空白不影响判定', () => {
    const result = unwrapRaw('  no-doc\n');
    if (result.status === 'error') expect(result.code).toBe('PS_NO_DOC');
    else throw new Error('应当失败');
  });

  it('非约定值算成功', () => {
    expect(unwrapRaw('ok').status).toBe('ok');
    expect(unwrapRaw('1').status).toBe('ok');
  });
});

describe('parseJsxRaw', () => {
  it('合法 JSON 原样透出', () => {
    const result = parseJsxRaw('{"a":1}');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value).toEqual({ a: 1 });
  });

  it('非 JSON → PS_ERROR（宿主没给出可解析的结果），detail 带原文', () => {
    /* `CORRUPT` 是「数据不认识」；jsx 返回值不是 JSON = 宿主这次没给结果，
       真机见过 `zt_getFontSimpleInfo` 返回 `undefined` → 报 CORRUPT 会让人以为是文件坏了 */
    const result = parseJsxRaw('not json');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('PS_ERROR');
      expect(result.reason).toContain('jsx 返回值');
      expect(result.detail).toContain('not json');
    }
  });

  it('raw 是 undefined → detail 能看出是 undefined（光看 SyntaxError 猜不出）', () => {
    const result = parseJsxRaw('undefined');
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.detail).toContain('raw:undefined');
  });
});

describe('isOkSentinel', () => {
  it('ok / OK / 带空白都算哨兵', () => {
    expect(isOkSentinel('ok')).toBe(true);
    expect(isOkSentinel('OK')).toBe(true);
    expect(isOkSentinel('  ok\n')).toBe(true);
  });

  it('其它值不算哨兵', () => {
    expect(isOkSentinel('1')).toBe(false);
    expect(isOkSentinel('{"arr":[]}')).toBe(false);
  });
});

describe('envelopeMessage', () => {
  it('取宿主的 msg（trim 前后空白）', () => {
    expect(envelopeMessage({ err: 1, msg: '请选择文字图层', code: 0 })).toBe('请选择文字图层');
    expect(envelopeMessage({ err: 1, msg: ' 字体缺失 ' })).toBe('字体缺失');
  });

  it('没有 msg / msg 不是字符串 → 空串（调用方走兜底文案）', () => {
    expect(envelopeMessage({ err: 1 })).toBe('');
    expect(envelopeMessage({ err: 1, msg: null })).toBe('');
    expect(envelopeMessage({ code: 'OK' })).toBe('');
    expect(envelopeMessage('not json')).toBe('');
    expect(envelopeMessage(null)).toBe('');
  });
});

describe('parseErrEnvelope', () => {
  it('解析 {err:1}', () => {
    const parsed = parseErrEnvelope('{"err":1}');
    expect(parsed.status).toBe('ok');
    if (parsed.status === 'ok') expect(parsed.value).toBe(1);
  });

  it('没有 err 字段 → CORRUPT（不再有 null 通道）', () => {
    const parsed = parseErrEnvelope('{"data":1}');
    expect(parsed.status).toBe('error');
    if (parsed.status === 'error') expect(parsed.code).toBe('CORRUPT');
  });

  it('不是 JSON → PS_ERROR（宿主没给出可解析的结果）', () => {
    const parsed = parseErrEnvelope('garbage');
    expect(parsed.status).toBe('error');
    if (parsed.status === 'error') expect(parsed.code).toBe('PS_ERROR');
  });
});

/* ---------------- 能力表用的具名解析器 ---------------- */

/** 六种 raw 覆盖了目前观测到的全部形态，迁移时逐条对账 code + reason */
const RAWS = {
  normal: '{"err":0}',
  noDoc: 'no-doc',
  rejected: '-1',
  errMsg: '{"err":1,"msg":"请选择文字图层"}',
  errBare: '{"err":1}',
  garbage: 'not json'
} as const;

const FALLBACK = '兜底文案';

function verdict(result: Result<unknown>): string {
  return result.status === 'ok' ? 'ok' : `${result.code}:${result.reason}`;
}

describe('passthrough', () => {
  it('原样交出 raw，连约定值都不折', () => {
    expect(passthrough(RAWS.noDoc)).toEqual(ok('no-doc'));
    expect(passthrough(RAWS.rejected)).toEqual(ok('-1'));
    expect(passthrough('{"arr":[]}')).toEqual(ok('{"arr":[]}'));
  });
});

describe('lenientVoid', () => {
  const parse = lenientVoid(FALLBACK);

  it('约定值折成对应码', () => {
    expect(verdict(parse(RAWS.noDoc))).toBe('PS_NO_DOC:没有打开的文档');
    expect(verdict(parse(RAWS.rejected))).toBe('PS_REJECTED:PS 拒绝执行，请确认已选中图层');
  });

  it('err:1 取宿主 msg，没给才用兜底', () => {
    expect(verdict(parse(RAWS.errMsg))).toBe('VALIDATION:请选择文字图层');
    expect(verdict(parse(RAWS.errBare))).toBe(`VALIDATION:${FALLBACK}`);
  });

  it('解析不出结构按成功（UNVERIFIED 的历史妥协）', () => {
    expect(verdict(parse(RAWS.garbage))).toBe('ok');
    expect(verdict(parse(RAWS.normal))).toBe('ok');
  });
});

describe('strictVoid', () => {
  const parse = strictVoid(FALLBACK);

  it('码与 reason 与 lenientVoid 相同', () => {
    expect(verdict(parse(RAWS.noDoc))).toBe('PS_NO_DOC:没有打开的文档');
    expect(verdict(parse(RAWS.rejected))).toBe('PS_REJECTED:PS 拒绝执行，请确认已选中图层');
    expect(verdict(parse(RAWS.errMsg))).toBe('VALIDATION:请选择文字图层');
    expect(verdict(parse(RAWS.errBare))).toBe(`VALIDATION:${FALLBACK}`);
    expect(verdict(parse(RAWS.normal))).toBe('ok');
  });

  it('唯一区别：解析不出即失败（不许当成功）', () => {
    const garbage = parse(RAWS.garbage);
    expect(garbage.status).toBe('error');
    if (garbage.status === 'error') expect(garbage.code).toBe('PS_ERROR');
  });

  it('是 JSON 但没有 err 字段也算 CORRUPT', () => {
    const noErr = parse('{"data":1}');
    expect(noErr.status).toBe('error');
    if (noErr.status === 'error') expect(noErr.code).toBe('CORRUPT');
  });
});

describe('strictData', () => {
  const parse = strictData(FALLBACK);

  it('err !== 0 当失败，detail 带 err 值', () => {
    expect(parse(RAWS.errMsg)).toEqual(failWithDetail('VALIDATION', '请选择文字图层', 'err:1'));
    expect(parse(RAWS.errBare)).toEqual(failWithDetail('VALIDATION', FALLBACK, 'err:1'));
  });

  it('err 为 0 时交 data 载荷（没有 data 字段就交整份）', () => {
    expect(parse('{"err":0,"data":{"size":12}}')).toEqual(ok({ size: 12 }));
    expect(parse('{"err":0}')).toEqual(ok({ err: 0 }));
  });

  it('折约定值：no-doc → PS_NO_DOC、-1 → PS_REJECTED', () => {
    /* 以前这里不折，`no-doc` 会落成 `CORRUPT`「不是合法 JSON」——那不是「数据坏了」，
       是宿主说「没打开文档」。真机 2026-10-28 给的正是 `PS_NO_DOC` */
    expect(verdict(parse(RAWS.noDoc))).toBe('PS_NO_DOC:没有打开的文档');
    expect(verdict(parse(RAWS.rejected))).toBe('PS_REJECTED:PS 拒绝执行，请确认已选中图层');
  });

  it('非 JSON → PS_ERROR（宿主没给出可解析的结果）', () => {
    const result = parse(RAWS.garbage);
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('PS_ERROR');
  });
});

describe('parseDataEnvelope', () => {
  it('拆 data，不判 err', () => {
    expect(parseDataEnvelope('{"err":1,"data":{"a":1}}')).toEqual(ok({ a: 1 }));
    expect(parseDataEnvelope(RAWS.errBare)).toEqual(ok({ err: 1 }));
  });

  it('no-doc / 非 JSON → PS_ERROR（不折约定值，但「不是 JSON」归宿主侧）', () => {
    /* `parseDataEnvelope` 不折约定值（它只拆 data、不判 err）；但「不是合法 JSON」已经不是
       「数据不认识」，而是宿主没给出可解析的结果 → `PS_ERROR` */
    for (const raw of [RAWS.noDoc, RAWS.garbage]) {
      const result = parseDataEnvelope(raw);
      expect(result.status).toBe('error');
      if (result.status === 'error') expect(result.code).toBe('PS_ERROR');
    }
  });
});

describe('strictPayload', () => {
  /* `ys_getFontInfo` / `ys_getGradientInfo` 那一档：false = 图层不适用、err:1 = 读失败、其余当载荷 */
  const parse = strictPayload({
    whenFalse: '图层不适用',
    whenFailed: '读取失败',
    accept: (data) => (data === null || data === undefined ? null : data)
  });

  it('false → VALIDATION（图层不适用，不是故障）', () => {
    expect(verdict(parse('false'))).toBe('VALIDATION:图层不适用');
  });

  it('err:1 取宿主 msg，没给才用兜底', () => {
    expect(verdict(parse(RAWS.errMsg))).toBe('PS_ERROR:请选择文字图层');
    expect(verdict(parse(RAWS.errBare))).toBe('PS_ERROR:读取失败');
  });

  it('载荷不合格（accept 返回 null）→ PS_ERROR', () => {
    expect(verdict(parse('null'))).toBe('PS_ERROR:读取失败');
  });

  it('正常载荷 → ok，accept 拿到的是拆包后的 data', () => {
    expect(parse('{"err":0,"data":{"fonts":[1]}}')).toEqual(ok({ fonts: [1] }));
  });

  it('非 JSON → PS_ERROR（不折约定值，但「不是 JSON」归宿主侧）', () => {
    const garbage = parse(RAWS.garbage);
    expect(garbage.status).toBe('error');
    if (garbage.status === 'error') expect(garbage.code).toBe('PS_ERROR');
  });
});

describe('parseSystemFontList', () => {
  it('`ok` / `OK` 哨兵 → sentinel（数据已写 SysFont2.json）', () => {
    expect(parseSystemFontList('ok')).toEqual({ status: 'ok', value: { kind: 'sentinel' } });
    expect(parseSystemFontList(' OK ')).toEqual({ status: 'ok', value: { kind: 'sentinel' } });
  });

  it('数组 → list', () => {
    const result = parseSystemFontList('[{"family":"A"}]');

    if (result.status === 'error') throw new Error('应当成功');
    expect(result.value.kind).toBe('list');
  });

  it('不是数组 → CORRUPT（不当成「没有字体」）', () => {
    const result = parseSystemFontList('{"arr":[]}');

    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('CORRUPT');
  });
});

describe('parseFontFamily', () => {
  it('信封里的 family → 原样返回', () => {
    expect(parseFontFamily('{"err":0,"data":{"family":"思源黑体"}}')).toEqual({
      status: 'ok',
      value: '思源黑体'
    });
  });

  it('裸载荷（没有 data 字段）也认', () => {
    expect(parseFontFamily('{"family":"Arial"}')).toEqual({ status: 'ok', value: 'Arial' });
  });

  it('没有 family / 类型不对 → CORRUPT（不折成空串让调用方猜）', () => {
    for (const raw of ['{"err":0,"data":{}}', '"裸字符串"', '{"family":""}']) {
      const result = parseFontFamily(raw);
      expect(result.status).toBe('error');
      if (result.status === 'error') expect(result.code).toBe('CORRUPT');
    }
  });
});
