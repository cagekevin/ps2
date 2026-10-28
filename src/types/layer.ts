/** 图层类型。唯一判定在 jsx（`mm_layer_kindOf`），这里只描述形状。 */
export type LayerKind = 'normal' | 'shape' | 'text' | 'smartObject' | 'group' | 'unknown';

/**
 * 图层类型 → 用户看得懂的名字。
 *
 * 放这里而不是页面里：`core/ps/layer` 拼前提不满足的提示要用它，
 * 诊断页显示当前图层也要用它——同一份对应关系不能有两份。
 */
export const LAYER_KIND_LABEL: Record<LayerKind, string> = {
  normal: '像素图层',
  shape: '形状图层',
  text: '文字图层',
  smartObject: '智能对象',
  group: '图层组',
  unknown: '未知图层'
};
