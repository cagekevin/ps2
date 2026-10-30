/**
 * 【范本】jsx 原始返回值（raw 协议）的唯一解析处。
 *
 * 全仓只有两处允许认识这些约定值：
 *   core/cep/bridge.ts  —— 构造线上字符串（拼 evalScript）
 *   本文件              —— 解析返回值（约定值 / JSON / err 信封）
 * 新增约定值必须先登记 `RAW_FAILURES` 这张表，不许在能力函数里手写字符串比较。
 *
 * 能力表（`./capabilities.ts`）的 `parse` 字段只许引用本文件的解析器：**严格度是能力的契约**
 * （认不出结构算失败还是算成功），写在表里一眼能看见，不许散回各能力函数里。
 *
 * 约定值来自原版面板与我们的 jsx/main.jsx（详见 docs/PS-CHANNEL-NOTES.md §三）。
 */

import { isRecord } from '../../types/guards';
import { parseJson } from '../../types/json';
import { MSG } from '../../types/messages';
import { failWithDetail, ok, type ErrorCode, type Result } from '../../types/result';

/**
 * 约定值 → 错误码。**这里不产中文**：`core` 不许 import `domain`，中文由消费方
 * 用 `MSG.codeReason[code]` 兜（`CONVENTIONS`「文案只有一个入口」）。
 * 哪个约定值坏在哪，进 `detail`（`raw:no-doc`），不进 `reason`。
 */
const RAW_FAILURES: Record<string, ErrorCode> = {
  'no-doc': 'PS_NO_DOC',
  'not-shape': 'PS_WRONG_LAYER',
  skipped: 'PS_SKIPPED',
  '-1': 'PS_REJECTED'
};

/**
 * raw → Result<void>：约定失败码折成失败（detail 带原始值），其余算成功。
 * 成功时调用方继续用原始 raw（有的函数还要解析 JSON / 前缀）。
 */
export function unwrapRaw(raw: string): Result<void> {
  const trimmed = raw.trim();
  const code = RAW_FAILURES[trimmed];
  if (code) return failWithDetail(code, MSG.codeReason[code], `raw:${trimmed}`);
  return ok(undefined);
}

/* ---------------- 失败构造器（三个语义各一个，模块私有、不导出） ---------------- */

/**
 * 宿主返回认不出：信封不是我们认识的形状。
 *
 * 与 `malformed` 的分工：**信封坏**归这里，**信封对、载荷坏**归 `malformed`。
 * 两个方向都不猜 —— 既不说成功（后续无从排查），也不编一个具体失败（会让人去修没坏的东西）。
 */
function unrecognized(raw: string): Result<never> {
  return failWithDetail('PS_BAD_PAYLOAD', MSG.badPayload, `raw:${raw.trim().slice(0, 120)}`);
}

/** 宿主明确拒绝（`err:1`）：句子优先宿主原话，没给才用调用方兜底 */
function hostRejected(value: unknown, raw: string, fallback: string): Result<never> {
  return failWithDetail(
    'VALIDATION',
    envelopeMessage(value) || fallback,
    `raw:${raw.trim().slice(0, 120)}`
  );
}

/** 结构认得出、字段坏：`detail` 由调用方给字段路径 */
function malformed(detail: string): Result<never> {
  return failWithDetail('CORRUPT', MSG.corrupt, detail);
}



/**
 * raw 是 JSON → 解析。
 *
 * **不是合法 JSON = 宿主这次没给出可解析的结果** → `unrecognized`（`PS_BAD_PAYLOAD`）。
 * 真机见过 `zt_getFontSimpleInfo` 返回 `undefined`，`callJsx` 把它转成字符串 `"undefined"`。
 * 不报 `CORRUPT`：那是「文件/数据坏了」，会让人去修一个没坏的文件。
 */
export function parseJsxRaw(raw: string): Result<unknown> {
  /* label 只进 `detail`（技术现场），不进 `reason`：core 不产中文文案 */
  const parsed = parseJson(raw, '', 'PS_BAD_PAYLOAD');
  if (parsed.status === 'error') return unrecognized(raw);
  return parsed;
}

/**
 * `zt_getCurrentFontInfo` 的 data 只取家族名。
 *
 * 命令层拿它去系统字体缓存里找字重，除 `family` 外没有字段有用。
 * 收在这里之后，消费者不再自己 `isRecord(x) && typeof x.family === 'string'` ——
 * 那是「猜 vendor 返回」，按 `ADR-0003` 只允许发生在这一层。
 * 缺字段**在这里失败**：交空串让调用方判 = 判别位落地（`ADR-0003` 判据 2）。
 * 走到这里时图层已被 `requireTextLayer` 保证是文字图层，没有 `family` 就是数据异常。
 */
export function parseFontFamily(raw: string): Result<string> {
  const data = parseDataEnvelope(raw);
  if (data.status === 'error') return data;

  const family = isRecord(data.value) ? data.value.family : undefined;
  if (typeof family !== 'string' || !family) {
    /* 现场（哪个字段缺）进 `detail`；句子由生产者从表里取（消费者不补字） */
    return malformed(`field:family raw:${raw.slice(0, 120)}`);
  }
  return ok(family);
}

/**
 * 官方直调**读**函数的哨兵：宿主说「数据已写文件，不在这里」。
 * 目前只有 `ztgl_initSystemList` 返回它（数据写 `SysFont2.json`）。
 * 全仓判 `'ok'/'OK'` 只许在这里。
 */
function isOkSentinel(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed === 'ok' || trimmed === 'OK';
}

/** `ztgl_initSystemList` 的返回：`ok` 哨兵（数据已写 `SysFont2.json`）或字体数组 */
export type SystemFontListRaw =
  | { kind: 'sentinel' }
  | { kind: 'list'; value: unknown[] };

/**
 * 系统字体列表的返回判定。
 *
 * 哨兵与「数组 / 不是数组」都在这里判 —— 命令层只转发 `Result`，
 * 不许自己 `isOkSentinel` / `parseJsxRaw` / `Array.isArray`（`ADR-0003` 防御归属）。
 */
export function parseSystemFontList(raw: string): Result<SystemFontListRaw> {
  if (isOkSentinel(raw)) return ok({ kind: 'sentinel' });

  const parsed = parseJsxRaw(raw);
  if (parsed.status === 'error') return parsed;

  if (!Array.isArray(parsed.value)) {
    return malformed(`shape:${typeof parsed.value}`);
  }

  return ok({ kind: 'list', value: parsed.value });
}

/**
 * 官方直调函数（ys_*）的 err 信封：`{ err: number }`。
 *
 * **没有 `null` 通道**：信封不成立（不是 JSON / 没有 err 字段）一律返回 `CORRUPT`，
 * 由调用方决定「算失败」还是「按可用处理」——不允许默默当成成功。
 */
export function parseErrEnvelope(raw: string): Result<number> {
  const parsed = parseJsxRaw(raw);
  if (parsed.status === 'error') return parsed;
  return errOf(parsed.value, raw);
}

/**
 * 已解析的值 → 信封里宿主给的那句话（没有 `msg` 时为空串）。
 *
 * 同一个 `err: 1` 在不同函数、甚至同一函数的不同情况下含义不同：`ztgl_setFont`
 * 没选中文字图层时返回 `{err:1, msg:"请选择文字图层"}`，字体真缺失时又是另一句。
 * 宿主已经说清楚了，就别拿我们猜的兜底文案顶替——把「没选文字图层」写成
 * 「字体不可用」会让用户去重装一个本来装着的字体。
 */
export function envelopeMessage(value: unknown): string {
  const msg = isRecord(value) ? value.msg : undefined;
  return typeof msg === 'string' ? msg.trim() : '';
}

/** 已解析的值 → err 字段（避免同一段 raw 解析两次） */
function errOf(value: unknown, raw: string): Result<number> {
  const err = isRecord(value) ? value.err : undefined;
  if (typeof err !== 'number') return unrecognized(raw);
  return ok(err);
}

/**
 * `{ err, data }` 双字段信封 → `data` 载荷（`zt_setFontColor` / `zt_getCurrentText`）。
 *
 * 也兼容裸载荷（没有 `data` 字段就原样交出去）。
 *
 * **`err !== 0` 必须失败**：以前这里不看 `err`，宿主明确说「这次没成功」时仍把
 * （可能不存在的）`data` 当结果返回，界面就显示成成功——与 `strictData` /
 * `strictPayload` 同一条判据，只有这里漏了。
 */
export function parseDataEnvelope(raw: string): Result<unknown> {
  /* 「判 err 并交 data」只有 `strictData` 一处实现（刀 13）；这里只是不带兜底文案的入口 */
  return strictData(MSG.codeReason.PS_REJECTED)(raw);
}

/** 已解析的值 → data 载荷（同一段 raw 只解析一次） */
function dataOf(value: unknown): unknown {
  if (isRecord(value) && 'data' in value) return value.data;
  return value;
}

/* ---------------- 能力表用的具名解析器 ---------------- */

/** raw 解析器签名：能力表 `parse` 字段的类型，输入原始串、输出已翻译的结果 */
export type Parser<T> = (raw: string) => Result<T>;

/**
 * 原样交出 raw：**只给「返回结构未实测」的能力用**，且该能力必须在表上标 `UNVERIFIED`。
 * 结构一旦实测，就换成具名解析器——`passthrough` 是缺口，不是常态。
 */
export const passthrough: Parser<string> = (raw) => ok(raw);

/**
 * 写操作的唯一解析器（`zt_*` / `layer_font_*` / `ztgl_setFont` / `ys_useFont` 全用它）。
 *
 * 判据：**只认宿主明确说过的信号，两个方向都不许猜**。
 *
 * | 宿主返回 | 判 | 依据 |
 * |---|---|---|
 * | `no-doc` / `-1` / `not-shape` / `skipped` | 失败（对应码） | 约定值，`RAW_FAILURES` |
 * | 空串 / `undefined` / `null` | 成功 | 真机：`layer_font_setFontSize` / `setLeading` 都这样且已生效 |
 * | `0` | 成功 | 真机：`zt_setFontVision` 回 `0` 且生效 |
 * | `1` | 成功 | 调度约定 `r != -1` 即成功 |
 * | `{"code":"OK"}` | 成功 | 真机：`ztgl_setFont` 换好了字体就回这句 |
 * | `{"err":0}` | 成功 | 官方信封 |
 * | `{"err":1,"msg":…}` | 失败（宿主原话） | 官方信封 |
 * | 其它 | 失败：`PS_ERROR` + 「返回数据无法识别」+ `detail` 带原文 | **认不出就说认不出** |
 *
 * 最后一条是重点：以前「认不出当成功」，宿主真失败时界面照样提示成功，后续无从排查；
 * 反过来自己编一个「文件无法识别」也会让人去修没坏的东西。两条都不做——报「无法识别」，
 * 原文进 `detail`，谁排查都能看到宿主到底回了什么。
 */
export function lenientVoid(fallback: string): Parser<void> {
  return (raw) => {
    const guard = unwrapRaw(raw);
    if (guard.status === 'error') return guard;

    const text = raw.trim();

    if (text === '' || text === 'undefined' || text === 'null' || text === '0' || text === '1') {
      return ok(undefined);
    }

    const parsed = parseJsxRaw(raw);
    if (parsed.status === 'error') return parsed;

    const value = parsed.value;
    if (isRecord(value)) {
      if (value.code === 'OK') return ok(undefined);
      if (value.err === 0) return ok(undefined);
      /* 与 `strictData` 同判据：`err` 只要是非 0 的数字就是宿主拒绝，不专挑 1 */
      if (typeof value.err === 'number') return hostRejected(value, raw, fallback);
    }

    return unrecognized(raw);
  };
}



/**
 * 约定值先折失败，再当 JSON 解析（严格）：`mm_style_getForegroundColor` 这一档。
 * 与 `strictVoid` 的区别是没有 err 信封可判，解析出来就是载荷本身。
 */
export function sentinelJson(raw: string): Result<unknown> {
  const guard = unwrapRaw(raw);
  if (guard.status === 'error') return guard;
  return parseJsxRaw(raw);
}

/**
 * 三态载荷读（`ys_getFontInfo` / `ys_getGradientInfo` 这一档）：
 * `false` = 当前图层不适用（`VALIDATION`）、`{err:1}` = 读失败（`PS_ERROR`）、其余当载荷。
 *
 * 两个函数原本各写一遍这段骨架（`false` 分支、`err===1` 分支、载荷校验、`ok`），
 * 只差文案与载荷判定——同一件事两处实现。
 *
 * **不折约定值**：`no-doc` / `-1` 在这里落成 `CORRUPT`（与 `strictData` 一致，既有行为）。
 */
export function strictPayload<T>(opts: {
  /** `false` 时给用户看的话（图层不适用，不是故障） */
  whenFalse: string;
  /** 读失败时的兜底文案；宿主给了 `msg` 就用宿主的 */
  whenFailed: string;
  /** 载荷校验：不合格返回 `null`（按 `whenFailed` 失败），合格返回收窄后的值 */
  accept: (data: unknown) => T | null;
}): Parser<T> {
  return (raw) => {
    const parsed = parseJsxRaw(raw);
    if (parsed.status === 'error') return parsed;

    const value = parsed.value;
    if (value === false) return failWithDetail('VALIDATION', opts.whenFalse, `raw:${raw}`);

    const err = errOf(value, raw);
    if (err.status === 'ok' && err.value === 1) return hostRejected(value, raw, opts.whenFailed);

    const accepted = opts.accept(dataOf(value));
    if (accepted === null) return malformed(`field:payload raw:${raw.slice(0, 120)}`);
    return ok(accepted);
  };
}

/**
 * 严格读：`err !== 0` 当失败，其余交 `data` 载荷。
 *
 * 原版只在该值为 0 时才覆盖面板（`app.v4.js:42523` 一带）；把 `{ err: 1, data }` 的 data
 * 直接交出去，非文字图层上会拿上一次的残留字段当新值——面板数字看着变了其实图层没变。
 *
 * **折约定值**（与 `lenientVoid` / `strictVoid` / `sentinelJson` 同一套判据）：
 * 以前这里不折，`no-doc`（宿主说没打开文档）会落成 `CORRUPT`「不是合法 JSON」——
 * 那不是「数据坏了」。真机 2026-10-28 给的正是 `PS_NO_DOC`。
 */
export function strictData(fallback: string): Parser<unknown> {
  return (raw) => {
    const guard = unwrapRaw(raw);
    if (guard.status === 'error') return guard;

    const parsed = parseJsxRaw(raw);
    if (parsed.status === 'error') return parsed;

    const value = parsed.value;
    if (isRecord(value) && typeof value.err === 'number' && value.err !== 0) {
      return hostRejected(value, raw, fallback);
    }
    return ok(dataOf(value));
  };
}
