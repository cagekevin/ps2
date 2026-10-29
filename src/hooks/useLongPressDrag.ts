/**
 * 【范本】长按拖拽
 *
 * 300ms 长按进入拖拽态 + 克隆占位 + 浮层跟手 + 落点前/后判定。
 * 样式库、动作、重命名、自由面板四处共用这一份，不各写一套。
 *
 * 不要和 HTML5 DnD 混用（mousedown/mousemove/mouseup 与 dragstart/dragover/drop 是两条链）。
 * 这里不认「库」「页面」「分组」，只回答「拖到了哪个元素的前面还是后面」，
 * 具体怎么改数据由调用方用 domain/reorder 的纯函数决定。
 *
 * 与参考实现的一处有意偏离：
 * 参考实现长按 300ms 内抬起也会回调一次 onEnd（落点可能是脏的），
 * 这里明确返回 `dragged: false`，调用方按普通点击处理，不写盘。
 */

import { useCallback, useRef } from 'react';
import type { DropPosition } from '../domain/reorder';

/** 长按时长 */
const DEFAULT_TIME = 300;
/** 长按到点后等 DOM 变化落定再取落点 */
const SETTLE = 50;
/** 浮层跟手偏移 */
const FLOAT_GAP = 5;
/** 克隆占位标记类，结束时按它找回来删掉 */
const DRAG_HIDDEN = 'mm-drag-hidden';
/** 拖拽中的浮层类（层级在 global.css 里走 `--mm-z-drag`，不在这里内联数字） */
const DRAG_FLOAT = 'mm-drag-float';

export interface LongPressDragResult {
  /** 真的进入过拖拽态；false = 长按期间抬起，按普通点击处理 */
  dragged: boolean;
  /** 最后落到的候选节点；null = 全程没进过任何候选 */
  target: HTMLElement | null;
  position: DropPosition;
}

export interface LongPressDragOptions {
  /** 触发拖拽的 mousedown 事件 */
  event: MouseEvent;
  /** 被拖节点，拖拽期间它自己就是浮层 */
  node: HTMLElement;
  /** 落点候选；函数形式，在 before() 之后才取 */
  targets: () => HTMLElement[];
  /** 判定轴：x 横向（项）/ y 纵向（组） */
  axis: 'x' | 'y';
  /** 滚动容器：y 轴要算上 scrollTop */
  scrollRoot?: HTMLElement | null;
  time?: number;
  offsetX?: number;
  offsetY?: number;
  /** 拖拽期间挂到节点上的类名，颜色尺寸走 Token */
  floatClass?: string;
  /** 启动前回调（如把该组折叠） */
  before?: () => void;
  /** 落点变化 */
  onHover?: (target: HTMLElement, position: DropPosition) => void;
  onEnd: (result: LongPressDragResult) => void;
}

/** 沿 offsetParent 链累加 offsetTop */
function absoluteTop(element: HTMLElement): number {
  let top = element.offsetTop;
  let parent = element.offsetParent as HTMLElement | null;
  while (parent) {
    top += parent.offsetTop;
    parent = parent.offsetParent as HTMLElement | null;
  }
  return top;
}

/** 沿 offsetParent 链累加 offsetLeft */
function absoluteLeft(element: HTMLElement): number {
  let left = element.offsetLeft;
  let parent = element.offsetParent as HTMLElement | null;
  while (parent) {
    left += parent.offsetLeft;
    parent = parent.offsetParent as HTMLElement | null;
  }
  return left;
}

function insertAfter(node: Node, target: HTMLElement): void {
  const parent = target.parentNode;
  if (!parent) return;
  if (parent.lastChild === target) parent.appendChild(node);
  else parent.insertBefore(node, target.nextSibling);
}

function insertBefore(node: Node, target: HTMLElement): void {
  target.parentNode?.insertBefore(node, target);
}

export function useLongPressDrag() {
  /** 当前这一轮的收尾函数；null = 没在拖 */
  const abortRef = useRef<(() => void) | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
  }, []);

  const start = useCallback(
    (options: LongPressDragOptions) => {
      cancel();

      const { node, axis } = options;
      const offsetX = options.offsetX ?? 0;
      const offsetY = options.offsetY ?? 0;
      const floatClass = options.floatClass ?? '';

      let nodeCss = '';
      let paragraph: HTMLElement | null = null;
      let paragraphCss = '';

      let clone: HTMLElement | null = null;
      let bound: HTMLElement[] = [];
      let started = false;
      let active = true;
      let position: DropPosition = 'before';
      let target: HTMLElement | null = null;
      let settleTimer: number | undefined;

      function unbind(): void {
        for (const element of bound) element.onmousemove = null;
        bound = [];
      }

      function removeClone(): void {
        if (clone?.parentNode) clone.parentNode.removeChild(clone);
        clone = null;
      }

      function restore(): void {
        node.style.cssText = nodeCss;
        if (paragraph) paragraph.style.cssText = paragraphCss;
        node.classList.remove(DRAG_FLOAT);
        if (floatClass) node.classList.remove(floatClass);
      }

      /** 浮层跟手 */
      function follow(event: MouseEvent): void {
        node.style.cssText = [
          nodeCss,
          'position: absolute',
          `left:${event.clientX + FLOAT_GAP + offsetX}px`,
          `top:${event.clientY + FLOAT_GAP + offsetY}px`
        ]
          .filter(Boolean)
          .join(';');
      }

      /** 存原样、造克隆占位、给每个候选挂落点判定 */
      function begin(): void {
        nodeCss = node.style.cssText;
        paragraph = node.querySelector('p');
        paragraphCss = paragraph ? paragraph.style.cssText : '';

        clone = node.cloneNode(true) as HTMLElement;
        clone.style.cssText = `${clone.style.cssText};opacity: 0;`;
        clone.className += ` ${DRAG_HIDDEN}`;

        if (floatClass) node.classList.add(floatClass);
        /* 层级走类，不走内联 z-index：拖起来的那一刻还要盖过下拉与菜单 */
        node.classList.add(DRAG_FLOAT);

        bound = options.targets();
        for (const element of bound) {
          element.onmousemove = (event: MouseEvent) => hover(element, event);
        }
      }

      /** 判定插前还是插后，并挪克隆占位 */
      function hover(element: HTMLElement, event: MouseEvent): void {
        if (!active || !started || !clone) return;

        const half = axis === 'y' ? element.offsetHeight / 2 : element.offsetWidth / 2;
        const pointer =
          axis === 'y'
            ? event.clientY + (options.scrollRoot?.scrollTop ?? 0) - absoluteTop(element)
            : event.clientX - absoluteLeft(element);

        if (pointer > half) {
          position = 'after';
          insertAfter(clone, element);
        } else if (pointer < half) {
          position = 'before';
          insertBefore(clone, element);
        } else {
          /* 正好在平分线上：位置与占位都保持上一次 */
          return;
        }

        target = element;
        options.onHover?.(element, position);
      }

      /** 抬起 */
      function finish(): void {
        active = false;
        document.removeEventListener('mouseup', finish);

        if (!started) {
          window.clearTimeout(startTimer);
          if (settleTimer !== undefined) window.clearTimeout(settleTimer);
          unbind();
          abortRef.current = null;
          options.onEnd({ dragged: false, target: null, position });
          return;
        }

        removeClone();
        restore();
        document.removeEventListener('mousemove', follow);
        unbind();
        abortRef.current = null;
        options.onEnd({ dragged: true, target, position });
      }

      /* 两段定时：time 到点先跑 before()，再等 SETTLE 建克隆并挂落点判定 */
      const startTimer = window.setTimeout(() => {
        options.before?.();
        settleTimer = window.setTimeout(() => {
          if (!active) return;
          begin();
          document.addEventListener('mousemove', follow);
          started = true;
        }, SETTLE);
      }, options.time ?? DEFAULT_TIME);

      document.addEventListener('mouseup', finish);

      abortRef.current = () => {
        active = false;
        window.clearTimeout(startTimer);
        if (settleTimer !== undefined) window.clearTimeout(settleTimer);
        document.removeEventListener('mouseup', finish);
        document.removeEventListener('mousemove', follow);
        removeClone();
        if (started) restore();
        unbind();
      };
    },
    [cancel]
  );

  return { start, cancel };
}
