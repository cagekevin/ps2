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
  /* 矢量化专用：选中不是恰好一个图层。正常由命令层先用 `selectionCount()` 拦掉，
     这里是 jsx 侧的兜底（万一两边判断不同步，不能把它当成一个文件路径） */
  'need-one': 'PS_REJECTED',
  'not-shape': 'PS_WRONG_LAYER',
  skipped: 'PS_SKIPPED',
  '-1': 'PS_REJECTED',
  /* DLSS：画幅超 64MP 是硬上限拒绝；结果文件缺失是故障（红）。
     没有「空层」判据了 —— 超分作用于整个画幅，选中哪一层都无关。 */
  'layer-too-big': 'PS_REJECTED',
  'result-missing': 'PS_ERROR'
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

/**
 * 路径类读能力（`mm_doc_exportPath`）：约定值先折失败，其余原样当路径。
 *
 * `unsaved` 是**前提不满足**（文档没保存过，没有「文件所在目录」），不是通道故障：
 * 折 `VALIDATION` + 官方那句原话（`cy_ExportImage` 的 catch 分支就是这么弹的），
 * 消息行走灰字。空串当 `CORRUPT`：那是 jsx 没按约定返回，不是「路径是空」。
 */
export function exportPathRaw(raw: string): Result<string> {
  const guard = unwrapRaw(raw);
  if (guard.status === 'error') return guard;

  const text = raw.trim();
  if (text === 'unsaved') {
    return failWithDetail('VALIDATION', MSG.common.needSaveBeforeExport, `raw:${text}`);
  }
  if (!text) return failWithDetail('CORRUPT', MSG.badPayload, `raw:${raw}`);
  return ok(text);
}

/**
 * 调度通道（`ps_onJsx`）的返回值：只可能是 `1`（走完，成败都是它）或 `undefined`（`f` 没写）。
 *
 * **它判不了成败**，别在这里加 `-1` 之类的失败分支 —— 那只会让下一个 AI 以为能判。
 * 失败现场在 PS 侧：内部函数自己 `_A()` 弹模态框（`jsx/vendor.jsx` 每个 `return -1` 前一行都是它），
 * 然后照样 `return 1`。所以调度能力只能靠 `require` 前置与事后读回（`CONVENTIONS` §4.7、`TD-01-32`）。
 */
export function dispatchAck(raw: string): Result<void> {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '1' || trimmed === 'undefined') return ok(undefined);
  /* 能走到这里说明线上格式坏了（例如误挂了直调通道），报出来，别当成功 */
  return failWithDetail('PS_ERROR', MSG.codeReason.PS_ERROR, `raw:${trimmed}`);
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
 * | `1` | 成功 | 调度通道唯一的返回值（成功失败都是它，见 `CONVENTIONS` §4.7）；直调通道里也是成功 |
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
 * 严格写：**只认宿主明说成功**（`ok` / `OK` / `1` / `{ err: 0 }` / `{ code: "OK" }`）。
 *
 * 与 `lenientVoid` 的差别只有一处：`undefined` / 空串 / `0` 不再算成功，落 `PS_BAD_PAYLOAD`
 * 并把 raw 进 `detail`。什么时候必须用它：**「没生效」本身看不出来的写操作** ——
 * `Layer_placedLayerRelinkToFile`（拖入自动转链接）原先用 `lenientVoid`，
 * 于是「没转成」既不报错也不留痕，日志里查不到任何东西（2026-11-02）。
 *
 * `fallback` 只给 `{ err: 1 }` 且宿主没给 `msg` 时兜底，其余一律不猜。
 */
export function strictVoid(fallback: string): Parser<void> {
  /* 实现是 `lenientVoid` 的薄包装：只多拦「宿主没回话」那一档，约定值 / 信封 / 认不出
     一律复用 —— 两份实现迟早漂，判据只能有一处。 */
  const lenient = lenientVoid(fallback);
  return (raw) => {
    const text = raw.trim();
    /* 「没回话」在严格写里是失败信号；`lenientVoid` 把它当成功，所以必须在进它之前拦掉 */
    if (text === '' || text === 'undefined' || text === 'null' || text === '0') return unrecognized(raw);
    if (text === 'ok' || text === 'OK') return ok(undefined);
    return lenient(raw);
  };
}

/**
 * 约定值先折失败，再当 JSON 解析（严格）：**宿主直接返回载荷、没有 err 信封**的读能力用它
 * （`mm_style_getForegroundColor` / `dz_getActionList`）。解析出来就是载荷本身，不再拆 `data`。
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


