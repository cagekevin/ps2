/** 标签 chip：我的标签 / 标签弹层共用 */
import type { MouseEvent } from 'react';

interface Props {
  text: string;
  active?: boolean;
  variant?: 'filter' | 'menu';
  onClick: () => void;
  onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function TagChip({ text, active = false, variant = 'filter', onClick, onContextMenu }: Props) {
  return (
    <button
      type="button"
      className={`mm-btn mm-btn--numeric mm-font__tag mm-font__tag--${variant}${active ? ' mm-font__tag--active' : ''}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {text}
    </button>
  );
}
