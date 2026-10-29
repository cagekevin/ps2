/**
 * 【唯一入口】页面页头 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】页面页头：40 高深色条 + 标题 + 右侧插槽
 *
 * 替代了什么：`features/common` / `features/font-manage` / `features/settings` 各写过一份
 * `<header>`（三套高度、三套标题字号、两种有无底色）。
 *
 * 用法：
 *   <PageHeader title="设置" />
 *   <PageHeader title="常用功能页">{两个 IconButton}</PageHeader>
 *
 * 禁止：页面再写 `<header>` + 自己的 `__title` 样式；标题字号与条高走 token。
 */

import type { ReactNode } from 'react';
import './page-header.css';

interface Props {
  title: string;
  /** 右侧操作区（图标按钮 / 菜单触发器）；不传就是一条纯标题 */
  children?: ReactNode;
  /** 页面级修饰类：只许改布局相关（如额外间距），不许改高度与底色 */
  className?: string;
}

export function PageHeader({ title, children, className = '' }: Props) {
  return (
    <header className={`mm-page-header${className ? ` ${className}` : ''}`}>
      <div className="mm-page-header__title">{title}</div>
      {children}
    </header>
  );
}
