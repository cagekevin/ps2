/**
 * 【唯一入口】页面错误边界 —— 全仓只许这一处；`app/router` 在路由内容区包一次，页面里不许再写一份。
 *
 * 【范本】路由内容区的失败态
 *
 * 为什么需要它：`React.lazy` 的 chunk 取不到、或页面渲染抛错时，没有边界 React 会**卸载整棵树**
 * —— 白屏，点导航也回不来，用户只能关掉面板重开（看起来就像插件挂了）。
 * 边界只包内容区、导航在边界外，所以出错时用户还能切到别的页面。
 *
 * 自愈只有一条路：`window.location.reload()` 重新读磁盘上的 `index.html`。
 * 重试 `import()` 没有意义 —— 旧 hash 的 chunk 已被 `npm run deploy` 删掉
 * （`tools/deploy.mjs:45` 先删目录再复制，文件名带 hash）。
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { log } from '../../core/logger';
import { MSG } from '../../types/messages';
import { Button } from '../ui';
import './error-boundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
  reason: string;
}

/** 异常原文：lazy 失败给的是 `Failed to fetch dynamically imported module`，照原样给排障的人看 */
function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false, reason: '' };

  static getDerivedStateFromError(error: unknown): State {
    return { failed: true, reason: reasonOf(error) };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    /* 只留痕不弹 toast：整块内容已经换成失败态，再弹一条是同一件事说两遍 */
    log.error('页面渲染失败', {
      reason: reasonOf(error),
      componentStack: info.componentStack ?? ''
    });
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="mm-error-boundary">
        <span>{MSG.pageLoadFailed}</span>
        <span className="mm-error-boundary__reason">{this.state.reason}</span>
        <span>{MSG.pageReloadHint}</span>
        <Button onClick={() => window.location.reload()}>重新加载</Button>
      </div>
    );
  }
}
