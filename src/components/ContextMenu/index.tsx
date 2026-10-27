/**
 * 【范本】右键菜单
 *
 * 定位走 useFloatingPosition（唯一锚点矩形入口），关闭走 useDismiss（唯一点外监听）。
 * 菜单项由调用方给，组件不认业务。
 */

import { useLayoutEffect } from 'react';
import { useDismiss } from '../../hooks/useDismiss';
import { useFloatingPosition } from '../../hooks/useFloatingPosition';
import './menu.css';

export interface MenuItem {
  label: string;
  /** 危险操作（删除）用红色 */
  danger?: boolean;
  /** 命令未实现：渲染但点不动（原版 `$menu` 没有禁用态，这是我们的偏离） */
  disabled?: boolean;
  /** 分隔线；为 true 时忽略 label / onSelect */
  separator?: boolean;
  onSelect?: () => void;
}

interface ContextMenuProps {
  /** 鼠标位置 */
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const { floatingRef, update } = useFloatingPosition({ placement: 'bottom-start' });

  useDismiss(true, floatingRef, onClose);

  /* 渲染后立刻定位，避免先出现在 (0,0) 再跳过去 */
  useLayoutEffect(() => {
    update({ x, y });
  }, [x, y, update]);

  return (
    <div className="mm-menu" ref={floatingRef} role="menu">
      {items.map((item, index) =>
        item.separator ? (
          <hr key={`sep-${index}`} className="mm-menu__hr" />
        ) : (
          <button
            key={`${item.label}-${index}`}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={`mm-menu__item${item.danger ? ' mm-menu__item--danger' : ''}`}
            onClick={() => {
              item.onSelect?.();
              onClose();
            }}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
