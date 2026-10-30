/**
 * 【唯一入口】右键菜单 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】右键菜单
 *
 * 定位走 useFloatingPosition（唯一锚点矩形入口），关闭走 useDismiss（唯一点外监听）。
 * 菜单项由调用方给，组件不认业务。
 */

import { useLayoutEffect } from 'react';
import { useDismiss } from '../../hooks/useDismiss';
import { useFloatingPosition } from '../../hooks/useFloatingPosition';
import { Icon } from '../icons';
import './menu.css';

export interface MenuItem {
  label: string;
  /** 危险操作（删除）用红色 */
  danger?: boolean;
  /** 命令未实现：渲染但点不动（原版 `$menu` 没有禁用态，这是我们的偏离） */
  disabled?: boolean;
  /** 分隔线；为 true 时忽略 label / onSelect */
  separator?: boolean;
  /**
   * 单选型菜单的「当前项」标记（列数 1/2/3 那种）。
   * 标记画在菜单项内，**不在页面里画勾**（官方用 4px svg，我们不引这种尺寸的图标）。
   */
  checked?: boolean;
  onSelect?: () => void;
}

interface ContextMenuProps {
  /** 鼠标位置（右键菜单场景）；与 anchor 二选一 */
  x?: number;
  y?: number;
  /** 锚点元素（工具栏按钮弹出菜单场景）：组件自己算位置，调用方不碰 getBoundingClientRect */
  anchor?: HTMLElement | null;
  items: MenuItem[];
  /** 触发器也算内部，点触发器等调用方自己 toggle（否则 mousedown 先关、click 又开） */
  inside?: () => Array<HTMLElement | null>;
  onClose: () => void;
}

export function ContextMenu({ x, y, anchor, items, inside, onClose }: ContextMenuProps) {
  const { floatingRef, update } = useFloatingPosition({ placement: 'bottom-start' });

  useDismiss(true, floatingRef, onClose, inside ? { inside } : {});

  /* 渲染后立刻定位，避免先出现在 (0,0) 再跳过去 */
  useLayoutEffect(() => {
    if (anchor) {
      update(anchor);
      return;
    }
    update({ x: x ?? 0, y: y ?? 0 });
  }, [x, y, anchor, update]);

  return (
    <div className="mm-popover mm-menu" ref={floatingRef} role="menu">
      {items.map((item, index) =>
        item.separator ? (
          <div key={`sep-${index}`} className="mm-divider mm-menu__hr" />
        ) : (
          <button
            key={`${item.label}-${index}`}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={`mm-u-row mm-menu__item${item.danger ? ' mm-menu__item--danger' : ''}`}
            aria-checked={item.checked}
            onClick={() => {
              item.onSelect?.();
              onClose();
            }}
          >
            <span>{item.label}</span>
            {item.checked ? <Icon name="icongouxuan" className="mm-menu__check" /> : null}
          </button>
        )
      )}
    </div>
  );
}
