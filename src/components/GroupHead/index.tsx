/**
 * 【唯一入口】分组头（整行「箭头 + 名称 + 计数」）—— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】分组头
 *
 * 用在哪：可折叠的**分组标题行**——样式库的分组、动作页的动作组。共同点是
 * 「一行标题 + 开合 + 右侧计数 / 角标」，且大多还要**右键菜单**与**长按拖拽排序**。
 *
 * 与三种邻居的区别（别混，混了就会再长出第四份）：
 *   - `IconPanel`：触发器 + 面板 + 互斥组（面板落在组末尾）。这里没有面板。
 *   - `Collapse`：已删除（2026-10-29）。它只有「标题 + 内容」，没有计数 / 右键 / 拖拽。
 *   - `StateHint` / `Button`：不是标题行。
 *
 * 为什么是「外层 div + 内层 button」而不是整行一个 button：
 * 动作页的角标是「添加动作」**按钮**，`<button>` 里不许嵌 `<button>`。
 * 所以内层 button 承载「开合 + 右键 + 拖拽」（`data-*` 也挂在它上面，拖拽靠它选落点），
 * 交互节点走 `trailing` 插槽放在外层。计数留在内层，保持「点计数也能开合」的既有手感。
 *
 * 就地改名（样式页编辑分组名）用 `titleSlot`：那时不渲染 button（input 不能嵌在 button 里），
 * 只渲染一个不可点的行，开合回调不生效。
 *
 * 尺寸 / 间距 / 颜色一律不在这里定（`03` §0.5）：本文件只有结构与定位。
 */

import type { MouseEvent, ReactNode } from 'react';
import { Chevron } from '../Chevron';
import './group-head.css';

interface Props {
  /** 分组名（`titleSlot` 存在时忽略） */
  title: string;
  /** 是否展开：决定箭头方向 */
  open: boolean;
  /** 左键开合；编辑态（传了 `titleSlot`）时不生效 */
  onToggle: () => void;
  /** 右侧项数；不传不渲染 */
  count?: number;
  /** 右键菜单（调用方负责 `preventDefault` 与弹菜单） */
  onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** 长按拖拽排序的起点 */
  onMouseDown?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** 行尾交互节点（「添加动作」这类按钮）；放在外层，不嵌进 button */
  trailing?: ReactNode;
  /** 就地编辑：替换标题区（此时整行不可点） */
  titleSlot?: ReactNode;
  /** 额外 data 属性（样式页拖拽要靠 `data-group-head` / `data-group-index` 选落点） */
  data?: Record<`data-${string}`, string | number>;
  /** 页面级修饰类：只许改布局相关 */
  className?: string;
}

export function GroupHead({
  title,
  open,
  onToggle,
  count,
  onContextMenu,
  onMouseDown,
  trailing,
  titleSlot,
  data,
  className = ''
}: Props) {
  const chevron = <Chevron open={open} size={12} />;
  const countNode = count === undefined ? null : (
    <span className="mm-group-head__count">{count}</span>
  );

  return (
    <div className={`mm-group-head${className ? ` ${className}` : ''}`}>
      {titleSlot ? (
        /* 编辑态：不渲染 button（input 不能嵌在 button 里），这一行不可点 */
        <div className="mm-group-head__toggle">
          {chevron}
          {titleSlot}
          {countNode}
        </div>
      ) : (
        <button
          type="button"
          className="mm-group-head__toggle"
          aria-expanded={open}
          onClick={onToggle}
          onMouseDown={onMouseDown}
          onContextMenu={onContextMenu}
          {...data}
        >
          {chevron}
          <span className="mm-group-head__title">{title}</span>
          {countNode}
        </button>
      )}

      {trailing ? <div className="mm-group-head__trailing">{trailing}</div> : null}
    </div>
  );
}
