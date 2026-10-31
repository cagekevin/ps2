/**
 * 【唯一入口】短 id 生成。
 *
 * 全仓**只有这里**生成随机串。三个曾经的出处已全部并入：
 *   1. `domain/action-library.ts` 的仓库文件名（内联 `Date.now().toString(36) + random`）
 *   2. `core/feedback/toast.ts` 的自增 `nextId`（原先注释自称「全仓第二套」）
 *   3. 模板库的文件夹 id
 *
 * **为什么在 `types/` 而不是 `domain/`**：`core` 与 `domain` 互相禁止 import（`CONVENTIONS` §3），
 * 而这两层都要生成 id（toast 在 core、动作库在 domain）⇒ 只能放在「任意层 → types」这一层。
 *
 * 结构：`<36 进制毫秒时间戳><2 位进程内序号><2 位随机>`
 *   - 时间戳：跨会话大致单调、肉眼可读；
 *   - **进程内序号**：同一毫秒内连续调用**严格不撞**（toast 连发两条也安全，
 *     这正是它当年要自增 key 的原因）；
 *   - 随机：跨进程 / 跨机器不撞。
 *
 * 不保证全库唯一：调用方要唯一时自己查重后重试
 * （见 `action-library.newWarehouseFileName` 的 `taken` 循环）。
 * 不用 `crypto.randomUUID()`：Chrome 92+ 才有，且会变成第四种写法（`TD-02-2`）。
 */

/** 同毫秒内的进程内序号，两位 36 进制（0..1295 循环） */
let seq = 0;

export function newId(): string {
  seq = (seq + 1) % 1296;
  return `${Date.now().toString(36)}${seq.toString(36).padStart(2, '0')}${Math.random().toString(36).slice(2, 4)}`;
}
