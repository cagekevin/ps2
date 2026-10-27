// 【范本】是什么：读边界的解码契约（`Decoded` / `Decoder`）与两个通用容器解码（`decodeIndexed` / `decodeList`）
// 替代了什么：`data/pick.ts` 的可选 `normalize` —— 12/13 个仓库因此把 `JSON.parse` 的结果直接当 `T`
// 谁在用：`src/domain/*.ts` 里 13 个 `decode*` 与 `src/cep/data/file-repo.ts` 的必填 `decode` 参数
// 禁止：不 import `@/cep/**`（domain 与 cep/data 都要能用）；decode 里**不许补默认值**，缺字段必须留痕
//
// ── 唯一性声明（哪条是真结构、哪条只是"一份实现"）────────────────────────────
// 1. `Decoder` / `Decoded` —— **只有一份定义**（这条是真结构）：仓库的第 3 参类型就是它，
//    不传 `decode` 编译不过 ⇒ 「没有形状通道」写不出来。
//    ⚠️ 但**别处写一个结构相同的匿名函数仍会被接受**（TS 是结构类型）⇒ 这一条只能叫
//    「一份定义 + 必填」，**不能**叫「类型系统挡得住仿制品」。
// 2. `decodeIndexed` / `decodeList` —— **唯一实现，但不是唯一入口**：TypeScript 挡不住别人再写一遍
//    `Array.isArray + every`。所以这里只声明「一份实现」，**不声称「别处写不出来」**。
//
// ── 怎么用（照抄，别自己发明）──────────────────────────────────────────────────
// ① 新数据文件接读边界：在**类型所在的域文件**里写一个 `decode*`，容器判据用本文件的两个函数：
//
//      // domain/foo.ts
//      function isFooItem(x: unknown): x is FooItem { return isRecord(x) }   // 条目级只证"是对象"
//      export function decodeFooFile(raw: unknown): Decoded<FooFile> | DecodeFail {
//        return decodeIndexed(raw, isFooItem)      // `{ index, list }` 型容器
//        // return decodeList(raw, isFooItem)      // 裸数组型容器
//      }
//
// ② 仓库构造时**直接传函数引用**：`dataRepo(path, fallback, decodeFooFile)`。
//    需要绑谓词时才包一层（这是唯一允许的 lambda 形态，里面只许调 decodeList/decodeIndexed）：
//      `(raw) => decodeList(raw, isRawTag)` —— 别在 lambda 里转型、补默认值或 try/catch。
// ③ 返回值**只有三种**，**没有 `null`**：
//    `{ value }` = 正常；
//    `DecodeFail` = 结构不认识 —— **两臂**：
//      形状臂 `{ fail:'shape', field, expected, actual }`（只报观测，说不出用户话）
//      语义臂 `{ fail:'notJson'|'emptyContent'|'noItemsParsed'|'badItem', count? }`（码可穷举）
//    **不许 `return null`**：那等于"失败但说不出原因"，类型上已经写不出来了（`Decoder<T>` 里没有 `| null`）。
//    用户文案由 `data/repo-read.ts` 的 `describeDecodeFail()` **唯一一处**渲染 —— 这里只报观测/码。
// ④ **新增一个 decode 必须同时加一条坏形状用例**（照 `tests/data/repo.test.ts` 的坏形状分支）：
//    类型只能保证"传了 decode"，保证不了"decode 真在校验" —— 有人把它改成 `=> ({ value: raw as T })`
//    或把谓词改成 `isRecord` 恒真，编译一点都不红。**用例是唯一的兜底**，且必须双向断言
//    （坏形状 → `ok:false`、好形状 → `ok:true`），否则"永远返回 null"的判据也能通过。
//
// ── 别这么写（这几条正是被这一刀拆掉的旧写法）──────────────────────────────────
// ✗ `JSON.parse(text) as T` / `parsed as FooFile` —— 形状的第二份真相
// ✗ 自己写 `Array.isArray(raw.list) && raw.list.every(isItem)` —— 已有一份，用 `decodeIndexed`
// ✗ `catch` 里返回 `fallback`、给缺失字段补 `?? 0` / `?? []` —— 静默兜底，坏文件在界面上看不见
// ✗ `filter` 掉坏条目再把剩下的返回 —— 下次写回磁盘就丢条目（数据丢失）；要拒就整份 `null`
import { isArrayOf, isRecord } from './guards'

/**
 * 解码结果：成功臂只带 `value`。
 *
 * 没有「值可用但不完整」这一档 —— 读不懂就是 `DecodeFail`，由调用方决定抛还是拒写；
 * 半成品值不允许流到业务层。
 */
export interface Decoded<T> {
  value: T
}

/**
 * 解码失败，**带用户能看懂的原因**。
 *
 * 为什么需要它：各仓库对"结构不认识"给的话不一样（"缺 arr 数组" / "缺少 localHash" /
 * "分类数据读取失败"）。只有 `null` 一个通道时，这些文案只能在**调用点**各写一遍 ——
 * 那就等于每个仓库又自己判一次"哪里坏了"，`decode` 白抽。
 *
 * 判据：**能说清哪里坏了就用它；说不清才用 `null`**（`null` 会被统一成"内容结构不认识"）。
 */
/** 形状失败：**只报观测**（哪个字段 / 期望什么 / 实际什么）。用户文案由 `repo-read` 一处渲染 */
export interface DecodeShapeFail {
  fail: 'shape'
  /** 出问题的字段名；空串 = 顶层 */
  field: string
  expected: 'object' | 'array' | 'string' | 'number'
  /** 实际拿到的形状（`typeof`；`null` / 数组单独说，别把 null 说成 object） */
  actual: string
}

/** 语义失败：形状合法但内容不可用。**码可穷举**，文案在 `msg` */
export interface DecodeSemanticFail {
  fail: 'notJson' | 'emptyContent' | 'noItemsParsed' | 'badItem'
  /** 附带的数量（`noItemsParsed` 的 received / `badItem` 的条目数）；没有就不传 */
  count?: number
}

/**
 * decode 的失败臂。
 *
 * **为什么不是 `{ fail: string }`**：自由文本等于让每个 decoder 自己写用户文案 ——
 * 文案就散在 domain 层，绕过 `msg.data.fn.*` 的收口，而且"有几种失败"不可穷举、
 * "每个失败都有文案"不可测。这里拆成两臂：
 * - 形状臂：结构化观测，**说不出用户话**（它只知道字段/期望/实际）
 * - 语义臂：码表，**说不出字段**（形状没问题，是内容空 / 下游没适配）
 * 两者都由 `data/repo-read.ts` 一处渲染成 `RepoRead.reason`。
 */
export type DecodeFail = DecodeShapeFail | DecodeSemanticFail

/** 造一个形状失败（`raw` 用来填 `actual`） */
export function shapeFail(
  field: string,
  expected: DecodeShapeFail['expected'],
  raw: unknown,
): DecodeShapeFail {
  return { fail: 'shape', field, expected, actual: describeShape(raw) }
}

/** `typeof` 会把 `null` 说成 object、把数组说成 object —— 这里分开说 */
export function describeShape(raw: unknown): string {
  if (raw === null) return 'null'
  if (raw === undefined) return 'undefined'
  if (Array.isArray(raw)) return 'array'
  return typeof raw
}

/**
 * 磁盘内容 → `T` 的**唯一**通道。
 *
 * 逐条**不许丢**：条目级不认识要整份返回 `null` / `{ fail }`，不许 `filter` 掉坏条目后
 * 把剩下的写回磁盘 —— 那是数据丢失。
 */
export type Decoder<T> = (raw: unknown) => Decoded<T> | DecodeFail

/**
 * **文本 → 值的唯一 JSON 解码器**：解析失败就是 `notJson`，形状交给调用方/后续 decoder。
 *
 * 全仓「`JSON.parse` 完直接当数据」的收口点：谁要解析一段不可信文本，就用它，
 * 别再各写一份 `try { JSON.parse } catch { return {error:'…'} }`。
 */
export function decodeJsonText(text: string): Decoded<unknown> | DecodeFail {
  try {
    return { value: JSON.parse(text) }
  } catch {
    return { fail: 'notJson' }
  }
}

/**
 * 谓词 → `Decoder<T>`：证明不过就是**形状臂**（带期望与实际），不再只有一句"结构不认识"。
 *
 * 为什么要有它：命令层/域层手里本来就有一堆 `x is T` 谓词；让它们各自写
 * `x ? { value: x } : { fail: 'shape' }` 就是把"怎么表达失败"抄一遍。
 */
export function decoderOf<T>(
  pred: (raw: unknown) => raw is T,
  expected: 'object' | 'array' | 'string' | 'number' = 'object',
): Decoder<T> {
  return (raw) => (pred(raw) ? { value: raw } : shapeFail('', expected, raw))
}

/** 区分三种返回：`null` / `{ fail }` / `{ value }` */
export function isDecodeFail(x: Decoded<unknown> | DecodeFail): x is DecodeFail {
  return 'fail' in x
}

/** `index` 字段的读法：非有限数 / 缺失 → `null`（由调用方决定"留痕 + 按 0"还是"整份拒绝"） */
function readIndexField(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null
}

/**
 * 容器 `{ index, list }` 的解码：`list` 必须是对象数组，有任何条目不是对象 → 整份 `null`。
 *
 * `index` 缺失**不静默补 0**：整份 `DecodeFail`（补 0 与"选中第 0 条"在值上不可分辨）。返回结构类型，
 * 不做断言 —— `QuickFontFile` / `HierarchyFile` / `ActionWarehouseIndex` 都是这个结构，
 * 赋值处由 TS 结构比较通过。
 */
export function decodeIndexed<T>(
  raw: unknown,
  isItem: (x: unknown) => x is T,
): Decoded<{ index: number; list: T[] }> | DecodeFail {
  if (!isRecord(raw)) return shapeFail('', 'object', raw)
  // 「数组 + 逐条证明」的判据只有一份：`guards.isArrayOf`（本文件不再自己 filter）
  const rawList = raw.list
  if (!Array.isArray(rawList)) return shapeFail('list', 'array', rawList)
  if (!isArrayOf(rawList, isItem)) return { fail: 'badItem', count: rawList.length }
  const list = rawList

  // `index` 缺失 / 非数 = 结构不合契约：整份拒绝。按 0 顶上会静默重置界面上选中的那一条，
  // 而调用方从值上分辨不出来（`0` 也是合法值）—— 与其猜，不如让用户看到"这个文件读不懂"。
  const index = readIndexField(raw.index)
  if (index === null) return shapeFail('index', 'number', raw.index)
  return { value: { index, list } }
}

/** 数组根的解码：判据同上，这里只负责转成 `Decoded`（`DecodeFail` = 结构不认识 + 原因） */
export function decodeList<T>(
  raw: unknown,
  isItem: (x: unknown) => x is T,
): Decoded<T[]> | DecodeFail {
  if (!Array.isArray(raw)) return shapeFail('', 'array', raw)
  if (!isArrayOf(raw, isItem)) return { fail: 'badItem', count: raw.length }
  return { value: raw }
}

/**
 * **"丢掉坏项"的唯一写法**：把逐项解码的结果收成值数组。
 *
 * 用于"一项不合格就跳过、其余照常"的场合（字体列表、自由面板项）。
 * 没有这条 helper 时，每处都写 `.map(f).filter((x): x is T => Boolean(x))`，
 * 而 `f` 迟早会被下一个人改成返回 `T | null` —— 于是 `| null` 又长回来。
 *
 * ⚠️ **"丢"是有代价的**：被丢的那一项没人知道。需要留痕（"云端有读不懂的 unit"）的场合
 * 自己遍历 `isDecodeFail` 并记下 key；要"任何一项坏就整份失败"用 `decodeList`。
 */
export function keepDecoded<T>(outcomes: readonly (Decoded<T> | DecodeFail)[]): T[] {
  const values: T[] = []
  for (const out of outcomes) if (!isDecodeFail(out)) values.push(out.value)
  return values
}
