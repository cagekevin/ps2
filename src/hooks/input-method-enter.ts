/**
 * 输入法选词时的回车判定
 *
 * 问题：中文输入法按 Enter 选词时浏览器也会派发 keydown；当成「提交」会把半截拼音写进去。
 *
 * 全项目唯一判据（原来叫 `features/font-manage/ime.ts` 的 `isImeEnter`，
 * 字体面板的数字输入框是第二个调用方，按 `GOVERNANCE` §二 #1 上移到 hooks，
 * 同时把只有三个字母的名字换成能读懂的：输入法 → input-method）。
 *
 * Chromium 103 上 `isComposing` 可用，`keyCode === 229` 兜更老的输入法。
 */

import type { KeyboardEvent } from 'react';

export function isInputMethodEnter(event: KeyboardEvent<HTMLElement>): boolean {
  return event.nativeEvent.isComposing || event.keyCode === 229;
}

/**
 * 「Enter 提交」的统一骨架：判据 + `preventDefault` + 执行。
 *
 * 六处输入框原先各写一遍 `if (event.key !== 'Enter' || isInputMethodEnter(event)) return;`
 * （TagInput / PreviewText / NumberField / CreateButtonPanel / TextField / InputDialog），
 * 判据共享了、骨架没共享——少写 `isInputMethodEnter` 那一句就又中了输入法的招。
 *
 * 用法：`onKeyDown={enterSubmit(() => commit())}`。
 * `preventDefault` 在这里统一做：输入框外面没有 `<form>`，唯一作用是挡掉隐式提交。
 */
export function enterSubmit(action: () => void) {
  return (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key !== 'Enter' || isInputMethodEnter(event)) return;
    event.preventDefault();
    action();
  };
}
