import type { Color } from './color';

export type LayerKind = 'normal' | 'shape' | 'text' | 'smartObject' | 'group' | 'unknown';

export interface ShapeStyle {
  hasFill: boolean;
  hasStroke: boolean;
  fill: Color | null;
  stroke: Color | null;
}

export interface LayerInfo {
  name: string;
  kind: LayerKind;
  visible: boolean;
}
