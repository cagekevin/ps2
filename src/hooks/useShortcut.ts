/**
 * 【范本】全局字母快捷键（导航切页那一类）
 *
 * 与 `useDismiss` 的分工，别再各写一份 `window.addEventListener('keydown')`：
 *   - `useDismiss`：**Esc 关浮层**，只在有浮层打开时挂，且有「谁在最上层」的序号栈
 *   - `useShortcut`：**常驻**的字母快捷键，输入框里打字不触发、带修饰键不触发
 *
 * 全仓只允许这两处挂全局键盘监听，都在 `hooks/`（`CONVENTIONS` §4.8）。
 *
 * 处理函数用 ref 存最新值：调用方每次渲染传新箭头函数也不会反复重订阅
 * （`advanced-event-handler-refs`）。
 */

import { useEffect, useRef } from 'react';

/** 打字中（输入框 / 文本域 / contentEditable）不触发快捷键 */
function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  const tag = element?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || element?.isContentEditable === true;
}

export function useShortcut(handler: (key: string) => void, enabled = true): void {
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent): void {
      /* 带修饰键的组合交给宿主（Ctrl+A / Cmd+S 之类不能被我们截走） */
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTyping(event.target)) return;
      latest.current(event.key.toLowerCase());
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
