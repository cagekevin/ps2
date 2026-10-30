/** 标签 chip：我的标签 / 标签弹层共用 */
import type { MouseEvent } from 'react';

interface Props {
  text: string;
  active?: boolean;
  onClick: () => void;
  onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function TagChip({ text, active = false, onClick, onContextMenu }: Props) {
  return (
    <button
      type="button"
      className={`mm-chip${active ? ' mm-chip--on' : ''}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {text}
    </button>
  );
}
