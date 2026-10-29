/**
 * 标签右键菜单：删除 / 重命名。
 *
 * 走公共 `components/ContextMenu`，不再自绘。
 * 自绘那一版（`.mm-font__tag-ctx`）是蓝底白字、无边框无圆角无阴影、宽 105 行高 20，
 * 和样式页 / 常用页的右键菜单完全不是同一种东西——CONVENTIONS §6 定死了右键菜单只有一个入口。
 */
import { ContextMenu } from '../../../components/ContextMenu';

interface Props {
  x: number;
  y: number;
  onRename: () => void;
  onRemove: () => void;
  onClose: () => void;
}

export function TagContextMenu({ x, y, onRename, onRemove, onClose }: Props) {
  return (
    <ContextMenu
      x={x}
      y={y}
      onClose={onClose}
      items={[
        { label: '删除', danger: true, onSelect: onRemove },
        { label: '重命名', onSelect: onRename }
      ]}
    />
  );
}
