/**
 * 【唯一入口】浮层挂载点 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】浮层挂载点
 *
 * 全仓唯一「挂到 `document.body`」的地方：`features/**` 不许再自己写 `document.body`。
 * 为什么必须挂 body：面板容器带 `overflow`，留在子树里的浮层会被裁掉。
 *
 * 它**只负责挂载**。开关、点外关闭、定位分别归 `useDismiss` / `useFloatingPosition`；
 * 不要在这里顺手加遮罩、z-index 或动画——同一个「弹层」一旦有两种壳，就没法统一改。
 *
 * 例外只有一个：`IconPanel` 把面板挂到组末尾的宿主 div（面板要推开后续内容，不是浮层）。
 */

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  children: ReactNode;
}

/** 把浮层挂到 body；轻量到只剩一行，存在的意义是「只有一个入口」 */
export function Portal({ children }: Props) {
  return createPortal(children, document.body);
}
