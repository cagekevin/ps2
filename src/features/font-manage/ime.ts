import type { KeyboardEvent } from 'react';

/**
 * 中文输入法按 Enter 选词时会派发 keydown；不能把它当成「提交」。
 * Chromium 103 上 `isComposing` 可用，`keyCode === 229` 兜旧输入法。
 *
 * 只被本 feature 的标签输入 / 预览文案输入使用；等第二个 feature 也要用时再上移。
 */
export function isImeEnter(event: KeyboardEvent<HTMLElement>): boolean {
  return event.nativeEvent.isComposing || event.keyCode === 229;
}
