/**
 * 【范本】面板外壳
 * 只放全局布局（导航、头部、内容区），不放业务逻辑。
 * 头部右侧的「诊断」是固定入口，任何页面都能进 /debug。
 */
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { ConfirmHost } from '../components/Confirm/useConfirm';
import { APP_TITLE, APP_VERSION } from '../core/env';
import { LayerWatcher } from './layer-watcher';
import { NavBar } from './nav-bar';
import './layout.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="mm-layout">
      <LayerWatcher />
      {/* 全局唯一确认弹窗：页面用 useConfirm() 命令式调用，不用自己渲染 */}
      <ConfirmHost />
      <NavBar />
      <div className="mm-layout__main">
        <header className="mm-u-row mm-layout__header">
          <span className="mm-layout__title">{APP_TITLE}</span>
          <div className="mm-u-row mm-layout__actions">
            <NavLink
              to="/debug"
              className={({ isActive }) => `mm-layout__debug${isActive ? ' mm-layout__debug--active' : ''}`}
            >
              诊断
            </NavLink>
            <span className="mm-layout__version">v{APP_VERSION}</span>
          </div>
        </header>
        <main className="mm-layout__body">{children}</main>
      </div>
    </div>
  );
}
