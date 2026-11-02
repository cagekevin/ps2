/**
 * 【范本】PS 动作（动作页 `05` 用）
 *
 * 两条 jsx，通道不同（`05` §3.1）：
 *   - `callAction`  → `dz_callAction`，**调度**（官方 `case 96 → jsxHistoryNoCheck`），参数是**整个 item**
 *   - `getActionList` → `dz_getActionList`，**直调**（官方 `jsxNoCheck`），**无参**，返回已解成值
 *
 * 两条都已真机确认存在（`typeof` = `function`）：`dz_getActionList` 返回裸数组，与
 * `domain/action-library.mapPsActions` 的解码一致；`dz_callAction` 的实际执行仍未跑过。
 * 参数形状照抄可运行的 Vue 版（`ps/src/cep/jsx/action.ts`，同名同形）。
 *
 * 返回形状不在本层猜：能力表用 `sentinelJson` 把 raw 解成值（宿主数组到前端已是 JSON 文本），
 * 数组 / `{info:[]}` 两种包装的归一化仍在 `domain`。**不要退回 `passthrough`**：那会把文本
 * 直接交给 `mapPsActions`，落成「文件无法识别」。
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

/** 取 PS 动作面板的分组与动作：无参；返回**已解成值**（`sentinelJson`），形状由 `domain` 归一 */
export function getActionList(): Promise<Result<unknown>> {
  return callCapability(CAP.getActionList);
}
