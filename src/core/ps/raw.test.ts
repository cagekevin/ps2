import { describe, expect, it } from 'vitest';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import {
  envelopeMessage,
  lenientVoid,
  parseDataEnvelope,
  parseErrEnvelope,
  parseFontFamily,
  parseJsxRaw,
  parseSystemFontList,
  passthrough,
  strictData,
  strictPayload,
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

  it('非 JSON → PS_BAD_PAYLOAD（宿主没给出可解析的结果），detail 带原文', () => {
    /* 不是 `CORRUPT`（那是文件坏），也不是 `PS_ERROR`（那是执行失败）：
       宿主这次没给结果 —— 真机见过 `zt_getFontSimpleInfo` 返回 `undefined` */
    const result = parseJsxRaw('not json');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('PS_BAD_PAYLOAD');
      /* 生产者自己从表里取句子（消费者只转发，不补字） */
      expect(result.reason).toBe(MSG.codeReason.PS_BAD_PAYLOAD);
      expect(result.detail).toContain('not json');
    }
  });

  it('raw 是 undefined → detail 能看出是 undefined（光看 SyntaxError 猜不出）', () => {
    const result = parseJsxRaw('undefined');
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.detail).toContain('raw:undefined');
  });
});

describe('parseSystemFontList 的哨兵分支', () => {
  it('ok / OK / 带空白都算哨兵（数据已写 SysFont2.json）', () => {
    for (const raw of ['ok', 'OK', '  ok\n']) {
      expect(parseSystemFontList(raw)).toEqual(ok({ kind: 'sentinel' }));
    }
  });

  it('不是哨兵时：数组当 list，其它一律失败', () => {
    expect(parseSystemFontList('[1,2]')).toEqual(ok({ kind: 'list', value: [1, 2] }));
    expect(parseSystemFontList('{"arr":[]}').status).toBe('error');
    expect(parseSystemFontList('1').status).toBe('error');
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

  it('没有 err 字段 → PS_BAD_PAYLOAD（信封不是我们认识的形状，不是文件坏）', () => {
    const parsed = parseErrEnvelope('{"data":1}');
    expect(parsed.status).toBe('error');
    if (parsed.status === 'error') expect(parsed.code).toBe('PS_BAD_PAYLOAD');
  });

  it('不是 JSON → PS_BAD_PAYLOAD（宿主没给出可解析的结果）', () => {
    const parsed = parseErrEnvelope('garbage');
    expect(parsed.status).toBe('error');
    if (parsed.status === 'error') expect(parsed.code).toBe('PS_BAD_PAYLOAD');
  });
});

/* ---------------- 能力表用的具名解析器 ---------------- */

/** 七种 raw 覆盖了目前观测到的全部形态，迁移时逐条对账 code + reason */
const RAWS = {
  normal: '{"err":0}',
  /* 真机 2026-10-30：`ztgl_setFont` 成功后宿主回这个，没有 `err` 字段 */
  codeOk: '{"code":"OK"}',
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

  it('约定值折成对应码，句子来自表', () => {
    expect(verdict(parse(RAWS.noDoc))).toBe(`PS_NO_DOC:${MSG.codeReason.PS_NO_DOC}`);
    expect(verdict(parse(RAWS.rejected))).toBe(`PS_REJECTED:${MSG.codeReason.PS_REJECTED}`);
  });

  it('err:1 取宿主原话；没给才用兜底（core 里唯一的例外，属宿主话）', () => {
    expect(verdict(parse(RAWS.errMsg))).toBe('VALIDATION:请选择文字图层');
    expect(verdict(parse(RAWS.errBare))).toBe(`VALIDATION:${FALLBACK}`);
  });

  it('宿主明确说过的成功写法才当成功（每条都有真机依据）', () => {
    expect(verdict(parse(RAWS.normal))).toBe('ok');
    /* `ztgl_setFont` 换好字体后回这句，没有 err 字段 */
    expect(verdict(parse(RAWS.codeOk))).toBe('ok');
    /* PS 写操作成功时常常什么都不回 */
    for (const raw of ['undefined', '', 'null']) expect(verdict(parse(raw))).toBe('ok');
    /* `zt_setFontVision` 回 0；调度约定 r != -1 即成功 */
    for (const raw of ['0', '1']) expect(verdict(parse(raw))).toBe('ok');
  });

  it('认不出就报 PS_BAD_PAYLOAD + 原文进 detail（两个方向都不猜）', () => {
    for (const raw of [RAWS.garbage, '{"data":1}', '{"code":"NG"}']) {
      const result = parse(raw);
      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.code).toBe('PS_BAD_PAYLOAD');
        expect(result.reason).toBe(MSG.badPayload);
        expect(result.detail).toContain('raw:');
      }
    }
  });
});

describe('strictData', () => {
  const parse = strictData(FALLBACK);

  it('err !== 0 当失败：码 VALIDATION、句子取宿主原话、detail 带原文', () => {
    const msg = parse(RAWS.errMsg);
    expect(msg.status).toBe('error');
    if (msg.status === 'error') {
      expect(msg.code).toBe('VALIDATION');
      expect(msg.reason).toBe('请选择文字图层');
      expect(msg.detail).toContain('raw:');
    }

    expect(parse(RAWS.errBare)).toEqual(failWithDetail('VALIDATION', FALLBACK, 'raw:{"err":1}'));
  });

  it('err 为 0 时交 data 载荷（没有 data 字段就交整份）', () => {
    expect(parse('{"err":0,"data":{"size":12}}')).toEqual(ok({ size: 12 }));
    expect(parse('{"err":0}')).toEqual(ok({ err: 0 }));
  });

  it('折约定值：no-doc → PS_NO_DOC、-1 → PS_REJECTED', () => {
    /* 以前这里不折，`no-doc` 会落成 `CORRUPT`「不是合法 JSON」——那不是「数据坏了」，
       是宿主说「没打开文档」。真机 2026-10-28 给的正是 `PS_NO_DOC`。句子由生产者从表里取 */
    expect(verdict(parse(RAWS.noDoc))).toBe(`PS_NO_DOC:${MSG.codeReason.PS_NO_DOC}`);
    expect(verdict(parse(RAWS.rejected))).toBe(`PS_REJECTED:${MSG.codeReason.PS_REJECTED}`);
  });

  it('非 JSON → PS_BAD_PAYLOAD（宿主没给出可解析的结果）', () => {
    const result = parse(RAWS.garbage);
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('PS_BAD_PAYLOAD');
  });
});

describe('parseDataEnvelope', () => {
  it('拆 data；`err !== 0` 判失败（宿主说没成功就不能交载荷）', () => {
    expect(parseDataEnvelope('{"err":0,"data":{"a":1}}')).toEqual(ok({ a: 1 }));
    /* 裸载荷（没有 data 字段）原样交出去 */
    expect(parseDataEnvelope('{"err":0}')).toEqual(ok({ err: 0 }));

    for (const raw of ['{"err":1,"data":{"a":1}}', RAWS.errBare]) {
      const result = parseDataEnvelope(raw);
      expect(result.status).toBe('error');
      if (result.status === 'error') expect(result.code).toBe('VALIDATION');
    }
  });

  it('委托 strictData：约定值折码，非 JSON 归宿主侧', () => {
    /* 「判 err 并交 data」只有 `strictData` 一处实现（刀 13），所以这里也折约定值 */
    expect(verdict(parseDataEnvelope(RAWS.noDoc))).toBe(`PS_NO_DOC:${MSG.codeReason.PS_NO_DOC}`);

    const garbage = parseDataEnvelope(RAWS.garbage);
    expect(garbage.status).toBe('error');
    if (garbage.status === 'error') expect(garbage.code).toBe('PS_BAD_PAYLOAD');
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

  it('err:1 → VALIDATION（宿主拒绝，不是执行失败）：取宿主 msg，没给才用兜底', () => {
    expect(verdict(parse(RAWS.errMsg))).toBe('VALIDATION:请选择文字图层');
    expect(verdict(parse(RAWS.errBare))).toBe('VALIDATION:读取失败');
  });

  it('载荷不合格（accept 返回 null）→ CORRUPT（信封对、载荷坏）', () => {
    expect(verdict(parse('null'))).toBe(`CORRUPT:${MSG.corrupt}`);
  });

  it('正常载荷 → ok，accept 拿到的是拆包后的 data', () => {
    expect(parse('{"err":0,"data":{"fonts":[1]}}')).toEqual(ok({ fonts: [1] }));
  });

  it('非 JSON → PS_BAD_PAYLOAD（不折约定值，但「不是 JSON」归宿主侧）', () => {
    const garbage = parse(RAWS.garbage);
    expect(garbage.status).toBe('error');
    if (garbage.status === 'error') expect(garbage.code).toBe('PS_BAD_PAYLOAD');
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
