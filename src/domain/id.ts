/**
 * 【唯一入口】短 id 生成。
 *
 * 用途：给**新建的数据文件 / 条目**起名（动作库的仓库文件名、模板库的文件夹 id）。
 * 全仓只此一处生成随机串 —— 之前 `domain/action-library.ts` 里内联过一份，
 * `core/feedback/toast.ts` 里还有一份自增 key（那是运行时去重 key，不是数据 id，语义不同）。
 *
 * 为什么长这样：`Date.now()` 保证按时间单调、可读；4 位随机后缀处理同毫秒并发。
 * 不用 `crypto.randomUUID`：Chrome 92+ 才有，且它会成为第三种写法（`TD-02-2`）。
 *
 * 只保证「同一毫秒内几乎不撞」，**不保证唯一** —— 调用方要唯一时自己查重后重试
 * （见 `action-library.newWarehouseFileName` 的 `taken` 循环）。
 */
export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
