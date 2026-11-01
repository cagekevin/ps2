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
  /** 两侧控制柄共线（PS 里显示为平滑点） */
  smooth: boolean;
}

/** 一条子路径（PS 的 `SubPathItem`） */
export interface VectorSubPath {
  closed: boolean;
  points: VectorPoint[];
}
