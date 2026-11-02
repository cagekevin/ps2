/**
 * 矢量化用的纯类型。
 *
 * 放 `types` 而不是 `domain`：`core/ps`（构造 jsx 入参）与 `domain`（解析 SVG）
 * 都要用，而 `core` 不许 import `domain` —— 只有 `types` 两边都能碰。
 */

/** 一个路径点：对应 PS `PathPoint` 的 anchor / leftDirection / rightDirection */
export interface VectorPoint {
  anchor: [number, number];
  left: [number, number];
  right: [number, number];
  /**
   * 两侧控制柄共线（PS 里显示为平滑点）。
   *
   * 唯一消费者是 jsx 的 `point.kind`，对应 `PointKind.SMOOTHPOINT` / `CORNERPOINT`
   * —— 注意不是 `SMOOTH`，那个名字在 PS 26.7 上读一下就抛「无效枚举值」。
   */
  smooth: boolean;
}

/** 一条子路径（PS 的 `SubPathItem`） */
export interface VectorSubPath {
  closed: boolean;
  points: VectorPoint[];
}

/**
 * 导出图 + 它相对文档的位置。
 *
 * **`path` 里的坐标是「导出图自己的像素」**（`0..exportWidth`），不是文档坐标：
 * 路径点必须经 `domain/vectorize.scaleSubpaths` 换算回文档，偏移与比例都在那条函数里。
 * 三个字段缺一不可 —— 少了 `bounds` 会把层建到左上角，少了 `exportWidth` 会整体缩放错。
 */
export interface VectorExport {
  /** 导出 PNG 的绝对路径 */
  path: string;
  /** PNG 的实际像素宽（= 图层宽 × 放大倍数，取整后的值） */
  exportWidth: number;
  /** PNG 的实际像素高 */
  exportHeight: number;
  /** 图层在文档里的 bounds（px，文档坐标），路径点要加回这个偏移 */
  bounds: { left: number; top: number; width: number; height: number };
}
