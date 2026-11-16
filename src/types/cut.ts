/**
 * 一键抠图的纯类型。
 *
 * 放 `types` 而不是 `core`：`core/ps`（构造 jsx 入参）与 `commands`（编排）都要用，
 * 而 `commands` 不许从 `core` 里挖形状定义（`CONVENTIONS` §3）。
 */

/**
 * 导出图 + 它相对文档的位置（`mm_cut_exportLayer` 的载荷）。
 *
 * 形状与 `VectorExport` 逐字段对齐（都是「图层 → 临时 PNG」）：结果由
 * `mm_placePngIntoDoc` 按 `bounds.left` / `bounds.top` 放回原位（`plan 21` §6）。
 */
export interface CutExport {
  /** 导出 PNG 的绝对路径（透明底，原尺寸） */
  path: string;
  /** PNG 的实际像素宽（= 图层宽，不放大也不缩小） */
  exportWidth: number;
  /** PNG 的实际像素高 */
  exportHeight: number;
  /** 图层在文档里的 bounds（px，文档坐标），结果层按这个位置落 */
  bounds: { left: number; top: number; width: number; height: number };
}
