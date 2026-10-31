/**
 * 【范本】PS 能力执行器（唯一入口）
 *
 * 一个能力 = 表里的一行（`./capabilities.ts`）+ 这里的一次调用。
 * 本文件固定四步：门（core / vendor）→ 前置（图层类型等）→ 调用（直调 / 调度）→ 解析。
 * 新增 PS 能力照此结构：**只往表里加一行**，不许再写一遍这四步。
 *
 * 两条通道（`direct` 直调 / `ps_onJsx` 调度）的唯一实现是 `toWire`。原来的 `vendor.ts`
 * 在 2026-10-28 删掉了——它的 `runVendor` / `runDirect` 只是这两个通道的薄封装，
 * 通道与超时搬进能力表之后就成了零调用方的死代码。**不要再建第三个通道文件。**
 *
 * 三条边界：
 *   1. 本文件不认识任何**能力**的 jsx 函数名、兜底文案、返回形状——它们全在表里；
 *      本文件只认识通道宿主 `ps_onJsx` 与门失败码 `PS_UNREADY`，这两个由通道与门本身决定
 *   2. 严格度由 `spec.parse` 决定（`./raw.ts` 的具名解析器），执行器不设默认放宽
 *   3. 门在前提之前：能力缺失时报 `PS_UNREADY`，不报「图层不对」——用户先要知道是环境问题
 *
 * ## 不进表的 6 个调用（二档：抄不错，不是一档「写不出来」）
 *
 * 它们走 **`callDirect`**（本文件导出，只封「门 → 函数存在性 → 调用」三步），不经过能力表。
 * 全仓就这 6 处，新增第 7 处前先问「能不能写成表里一行」——
 * **这条由 `npm run check:jsx` 守着**（`tools/check-jsx-entry.mjs`：任何以字面量名字直调的地方，
 * 名字必须在它的白名单里；白名单多了少了都红）。以前这里只是一张注释表，没人拦第 5 个。
 *
 * 判据有两条（**第二条更硬**）：
 *   1. 进表就得给公共解析器开一个只有它在用的口子 → 不值得
 *   2. **它是不是「对外动作」** —— 若只被域内别的函数消费（前置判断的输入这类），
 *      进表会让那个域**反向 import 能力表**，成环（2026-10-31 踩过：`layer` 的两个查询）
 *
 * | 函数 | jsx | 那个「独有口子」是什么 |
 * |---|---|---|
 * | `font.checkFontUsable` | `ys_checkUseFont` | `err===1` 要带宿主 `msg`，且**信封认不出时按可用处理**（不折失败）—— 现有解析器都是「失败就失败」 |
 * | `style.saveLayerStyle` | `ys_AddStyle` | `err===1` 折 `PS_ERROR`，而 `hostRejected` 固定折 `VALIDATION` |
 * | `diag.diagVendor` | `mm_diag_vendor` | 门失败要区分「探测本身失败 / 门未就绪」，执行器的门失败只有一种形状，`parse` 拿不到 `probeFailure` |
 * | `env.injectEnv` | `Sys_setSystemEnvInfo` | **是门的前置** —— 进表就是「门 → injectEnv → 门」死循环 |
 *
 * **曾经有 6 个**：`layer.getLayerState` / `layer.getSelectionCount` 当初的理由是「返回域类型 / 返回数字」，
 * 但那只是**缺两个解析器**（`layer.layerStateRaw` / `layer.selectionCountRaw`，**写在 layer 域里、没进 raw.ts**）——
 * 解析写在薄函数里本身就是错的，而「为一个能力往公共清单加一个名字」是另一种错（负担转嫁给后来者）。
 * 2026-10-31 收进表（`CAP.layerState` / `CAP.selectionCount`），`kind` 的白名单校验仍留在 `core/ps/layer`。
 * 所以判据要反过来读：**「解析形状特殊」不是理由，「要给公共解析器开独有开关」才是。**
 *
 * 更早还有两个也收进表了（`getFontInfo` / `getGradientInfo`）：它们是同一个骨架
 * （`false` → `VALIDATION`、`{err:1}` → `PS_ERROR`、载荷校验 → `ok`），只差文案与载荷判定，
 * 现在共用 `raw.strictPayload`。**同一骨架两个函数 = 两处实现**，不算「形态各自唯一」。
 *
 * **门失败只有一种形状**（`gateFailed`）：门只有两扇，`detail` 分别是 `core:false` / `vendor:false`。
 * 以前它们各写一遍 `fail('PS_UNREADY', '官方 PS 能力未就绪')`（`detail` 空串）或手拼 `'core:false'`，
 * 同一个事件两种 detail，排障时分不清是哪扇门。
 *
 * **2026-10-31 收口**：这几处原本各自手抄「门 → funcMissing → callJsx」，而且抄得不一样 ——
 * 当时 4 处里有 3 处（`checkFontUsable` / `getLayerState` / `saveLayerStyle`）**漏了 `funcMissing`**，
 * 缺函数时报 `EvalScript error.`（`PS_ERROR`）而不是 `PS_UNREADY` + `detail: fn:xxx`。
 * 现在统一走 `callDirect`，全部获得同一条失败语义。
 */

import { callJsx } from '../cep/bridge';
import { MSG } from '../../types/messages';
import { failWithDetail, type Result } from '../../types/result';
import { funcMissing, requireCore, requireVendor } from './init';
import type { Parser } from './raw';

/** 调度通道的宿主函数名；只有这里认识这个字符串 */
const DISPATCH = 'ps_onJsx';

/** 官方能力缺失时的统一文案：**从唯一文案表取**（`types/messages.ts`，core 可 import） */
const UNREADY = MSG.codeReason.PS_UNREADY;

/** 线上通道：`direct` = 直调 `fn(...)`；`dispatch` = `ps_onJsx({ f, arr, n })` */
type Channel = 'direct' | 'dispatch';

/** 能力门：`mm_*` 自有 jsx 走 `core`，官方副本（`ys_ / zt_ / cy_`）走 `vendor` */
export type Gate = 'core' | 'vendor';

/** 与通道无关的部分 */
interface SpecBase<T> {
  /** jsx 函数名（与 jsx 侧同名镜像） */
  readonly fn: string;
  /** 必填：读 30s / 写 60s / 扫全机字体 300s，三种都在用，不许按通道取默认 */
  readonly timeout: number;
  /** 返回什么形状 + 认不出时算不算失败 */
  readonly parse: Parser<T>;
  /** 前置：直接引用 `./layer` 的判断函数，不在这里再写一套图层类型映射 */
  readonly require?: () => Promise<Result<void>>;
  /** 轮询类不记 info 日志 */
  readonly silent?: boolean;
  /**
   * 长任务例外：**只有它才允许 `dispatch` 用 `LONG_TIMEOUT`**（默认一律 `READ_TIMEOUT`）。
   *
   * 标记放在能力上而不是测试里 —— 例外跟着能力走，不用在两处同步一份名字清单
   * （`capability.test` 断言「全仓只有一个 longTask，且它必须是 callAction」）。
   */
  readonly longTask?: true;
}

/**
 * 一个能力的完整描述，字段逐条写在 `./capabilities.ts`。
 *
 * `gate` 与 `channel` 绑在一起而不是自由组合：`ps_onJsx` 是官方副本里的函数，
 * `mm_*` 自有 jsx 只有直调。写成两个独立字段能拼出 `{ gate: 'core', channel: 'dispatch' }`，
 * 那种能力要到运行时才炸——用联合类型让它编译不过。
 */
export type CapabilitySpec<T> = SpecBase<T> &
  (
    | { readonly gate: 'vendor'; readonly channel: Channel; readonly label?: string }
    | { readonly gate: 'core'; readonly channel: 'direct' }
  );

const GATE: Record<Gate, { ready: () => Promise<boolean>; message: string }> = {
  vendor: { ready: requireVendor, message: UNREADY },
  core: { ready: requireCore, message: MSG.codeReason.PS_UNREADY }
};

/**
 * 门失败的**唯一形状**：`PS_UNREADY` + 门自己的文案 + `detail: '<门>:false'`。
 *
 * 不进表的 4 个调用（见文件头）也必须用它。以前它们各写一遍：
 * `fail('PS_UNREADY', '官方 PS 能力未就绪')`（`detail` 是空串）与
 * `failWithDetail(..., 'core:false')` 并存——同一个事件两种 detail，排障时看不出是哪扇门。
 */
export function gateFailed(gate: Gate): Result<never> {
  const { message } = GATE[gate];
  return failWithDetail('PS_UNREADY', message, `${gate}:false`);
}

/** 通道决定线上形态：直调 `fn(a, b)`；调度 `ps_onJsx({ f, arr, n })` */
function toWire(spec: CapabilitySpec<unknown>, args: unknown[]): { fn: string; args: unknown[] } {
  if (spec.channel === 'direct') return { fn: spec.fn, args };

  /* n 只是日志标签，不传给 jsx 函数本身；arr 是实参数组（项本身，不是 [项] 嵌套） */
  const payload: Record<string, unknown> = { f: spec.fn, arr: args };
  if (spec.label) payload.n = spec.label;
  return { fn: DISPATCH, args: [payload] };
}

/** 按表执行一个能力：门 → 前置 → 调用 → 解析，失败原样透传 */
export async function callCapability<T>(
  spec: CapabilitySpec<T>,
  args: unknown[] = []
): Promise<Result<T>> {
  const gate = GATE[spec.gate];
  if (!(await gate.ready())) return gateFailed(spec.gate);

  /**
   * 门可用、但**这一个函数**没加载（旧 jsx）。
   *
   * 以前是「缺一个 → 整门变红」，等于诊断页少个函数就让字体面板一起废。
   * 现在只禁这一个能力，并且**如实报出来**（`detail` 带函数名）——不静默跳过前置、
   * 不降级放行，否则真机上「为什么这个按钮没反应」就查不出来了。
   */
  if (await funcMissing(spec.fn)) {
    return failWithDetail('PS_UNREADY', MSG.codeReason.PS_UNREADY, `fn:${spec.fn}`);
  }

  if (spec.require) {
    const guard = await spec.require();
    if (guard.status === 'error') return guard;
  }

  const wire = toWire(spec, args);
  const call = await callJsx(wire.fn, wire.args, { timeout: spec.timeout, silent: spec.silent });
  if (call.status === 'error') return call;

  return spec.parse(call.value);
}

/**
 * 直调一个 jsx 函数 —— **只给文件头那 6 个「不进表」的调用用**。
 *
 * 把执行器的前三步（门 → 函数存在性 → 调用）封在这里，调用方只做自己的解析。
 *
 * 为什么要有它：这四行以前是各处手抄的，而且**抄得不一样** —— `checkFontUsable` /
 * `getLayerState` / `saveLayerStyle` 三处漏了 `funcMissing`，缺函数时报
 * `EvalScript error.`（`PS_ERROR`）而不是 `PS_UNREADY` + `detail: fn:xxx`，
 * 排查时会以为是脚本崩了，实际是旧 jsx 没这个函数（2026-10-31 收口）。
 *
 * 不进 `callCapability` 的原因：那 6 个的**解析各不一样**（有的要带宿主 msg 且不折失败、
 * 有的返回域类型、有的是数字、有的在装配期），硬塞进表就要给 `parse` 开一堆口子。
 * 但「门 + 函数存在性」这两步没有任何理由各写一遍，所以只收这一段。
 */
export async function callDirect(
  fn: string,
  args: unknown[] = [],
  options: { gate: Gate; timeout?: number; silent?: boolean } = { gate: 'core' }
): Promise<Result<string>> {
  const gate = GATE[options.gate];
  if (!(await gate.ready())) return gateFailed(options.gate);

  if (await funcMissing(fn)) {
    return failWithDetail('PS_UNREADY', MSG.codeReason.PS_UNREADY, `fn:${fn}`);
  }

  return callJsx(fn, args, { timeout: options.timeout, silent: options.silent });
}
