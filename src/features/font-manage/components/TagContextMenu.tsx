/** 标签右键浮层：删除 / 重命名（原版 105px 蓝底） */
import { useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from '../../../hooks/useDismiss';
import { useFloatingPosition } from '../../../hooks/useFloatingPosition';

interface Props {
  x: number;
  y: number;
  onRename: () => void;
  onRemove: () => void;
  onClose: () => void;
}

export function TagContextMenu({ x, y, onRename, onRemove, onClose }: Props) {
  const { floatingRef, update } = useFloatingPosition({ placement: 'bottom-start' });

  useDismiss(true, floatingRef, onClose);

  useLayoutEffect(() => {
    update({ x, y });
  }, [x, y, update]);

  return createPortal(
    <div ref={floatingRef} className="mm-font__tag-ctx" role="menu" aria-label="标签操作">
      <button
        type="button"
        onClick={() => {
          onClose();
          onRemove();
        }}
      >
        删除
      </button>
      <button
        type="button"
        onClick={() => {
          onClose();
          onRename();
        }}
      >
        重命名
      </button>
    </div>,
    document.body
  );
}
