/**
 * 【范本】面板外壳
 * 只放全局布局（导航、内容区），不放业务逻辑。
 *
 * **没有头部标题行**（2026-10-31）：原来那一行只有「应用名 + 版本 + 诊断」，
 * 占一整行却没有任何信息量 —— 标题在导航栏已经能看出来，版本与诊断收进**设置页**
 * （诊断是个排查入口，不是每天要点的东西）。
 */
import type { ReactNode } from 'react';
import { ConfirmHost } from '../components/Confirm/useConfirm';
import { useNoContextMenu } from '../hooks/useNoContextMenu';
import { CommonUseWatcher } from './common-use-watcher';
import { LayerWatcher } from './layer-watcher';
import { NavBar } from './nav-bar';
import './layout.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  /* 插件面板不吃 Chromium 右键菜单；自己的 ContextMenu 仍正常（只 preventDefault） */
  useNoContextMenu();

  return (
    <div className="mm-layout">
      <LayerWatcher />
      {/* 常用页的常驻事件订阅（拖入 / 粘贴 / 剪贴蒙版 / 填色 / 参考线）；页面不订阅 */}
      <CommonUseWatcher />
      {/* 全局唯一确认弹窗：页面用 useConfirm() 命令式调用，不用自己渲染 */}
      <ConfirmHost />
      <NavBar />
      <div className="mm-layout__main">
        <main className="mm-layout__body">{children}</main>
      </div>
    </div>
  );
}
