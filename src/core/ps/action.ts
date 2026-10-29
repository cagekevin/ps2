/**
 * 【范本】PS 动作（动作页 `05` 用）
 *
 * 两条 jsx，通道不同（`05` §3.1）：
 *   - `callAction`  → `dz_callAction`，**调度**（官方 `case 96 → jsxHistoryNoCheck`），参数是**整个 item**
 *   - `getActionList` → `dz_getActionList`，**直调**（官方 `jsxNoCheck`），**无参**，返回不解码
 *
 * **照抄可运行的 Vue 版实践**（2026-10-29 决定）：`ps/src/cep/jsx/action.ts` 用同名函数、
 * 同样的参数形状，且 `dz_getActionList` 的返回形状它自己也标 `UNVERIFIED`（两种包装都兜）。
 * `05` 计划原要求「先真机探针、确认存在再登记」，现按用户指示直接登记；风险与兜底见 `init.ts` 的注释
 * 与 `05` §3.1 的改判记录。
 *
 * 返回形状不在本层猜：`getActionList` 用 `passthrough` 原样交出去，归一化在 `domain`。
 */

import { callCapability } from './capability';
import { CAP } from './capabilities';
import type { Result } from '../../types/result';

/** 一条 PS 动作（= 仓库文件里的一项；执行时必须带 `group`，否则会调到别的组） */
export interface PsActionItem {
  /** PS 动作组名 */
  group: string;
  /** 动作名 */
  name: string;
  /** 别名只在显示时用；执行仍走 group + name */
  alias?: string;
}

/**
 * 执行一个 PS 动作。
 *
 * 传**整个 item**：官方 `:1823179` 就是把这个对象交给 `dz_callAction`，只传 name 会执行到别的组。
 * `alias` 有才带——不要塞 `alias: undefined`，jsx 侧会当成「有别名但为空」。
 */
export function callAction(item: PsActionItem): Promise<Result<void>> {
  const payload = item.alias ? { group: item.group, name: item.name, alias: item.alias } : { group: item.group, name: item.name };
  return callCapability(CAP.callAction, [payload]);
}

/** 取 PS 动作面板的分组与动作：无参；返回**不解码**（形状由 `domain` 归一） */
export function getActionList(): Promise<Result<unknown>> {
  return callCapability(CAP.getActionList);
}
