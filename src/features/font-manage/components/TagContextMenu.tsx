/**
 * 标签右键菜单：删除 / 重命名。
 *
 * 走公共 `components/ContextMenu`，不再自绘：右键菜单只有一个入口（`STYLE.md` §6）。
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
