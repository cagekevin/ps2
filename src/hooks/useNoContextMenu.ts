/**
 * 【范本】禁浏览器右键菜单的 hook
 *
 * 全项目唯一的「禁止浏览器右键菜单」入口（CEP 插件是面板，不是网页）。
 *
 * 为什么必须有：Chromium 的默认菜单会漏到插件界面外（复制 / 检查 / 另存为），
 * 且与自己的 `ContextMenu` 叠在一起。
 *
 * **只 `preventDefault`，不 `stopPropagation`**：自己的右键菜单靠 `onContextMenu`
 * 收到同一个事件后打开（`IconButton` 的右键、常用页 Ctrl+右键都是这条路），
 * 一旦在捕获阶段吃掉事件，全站自定义菜单会一起失效。
 *
 * 挂载点只有一处：`app/layout.tsx`（常驻壳）。别在页面里再挂一个。
 */
import { useEffect } from 'react';

export function useNoContextMenu(): void {
  useEffect(() => {
    const block = (event: MouseEvent) => {
      event.preventDefault();
    };
    document.addEventListener('contextmenu', block);
    return () => document.removeEventListener('contextmenu', block);
  }, []);
}
