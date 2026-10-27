/**
 * 【范本】浮层关闭原语（点外部 / Esc）
 *
 * 全项目**唯一**允许在 document 上挂 mousedown / keydown 的地方。
 * 下拉、菜单、右键菜单、弹窗都调它，不要各写一套监听。
 *
 * 两个手势语义不同，不要改成一样：
 * - 点外部 ⇒ 关掉**所有**开着的浮层
 * - Esc    ⇒ 只关**最近打开的那一个**（逐层退出）
 *
 * 「最上层」的判据是打开序号 seq，不是挂载顺序、也不是 z-index——
 * 多入口并存时后两者与视觉层叠对不上。
 *
 * 浮层被 portal 到 body 时，必须传 `inside` 声明触发器也算内部，
 * 否则点触发器会被判成「点了外面」：先 close 再 toggle，表现为点触发器关不掉。
 */

import { useEffect, useRef, type RefObject } from 'react';

interface Entry {
  visible: () => boolean;
  container: () => HTMLElement | null;
  close: () => void;
  outside: boolean;
  inside: () => Array<HTMLElement | null>;
  seq: number;
}

const entries = new Set<Entry>();
let installed = false;
let openCounter = 0;

/** 点是否落在内部；一个元素都没渲染时算内部，不误关 */
function isInside(entry: Entry, target: Node): boolean {
  const known = [entry.container(), ...entry.inside()].filter((el): el is HTMLElement => !!el);
  if (!known.length) return true;
  return known.some((el) => el.contains(target));
}

function onPointerDown(event: MouseEvent): void {
  for (const entry of entries) {
    if (!entry.outside || !entry.visible()) continue;
    if (!isInside(entry, event.target as Node)) entry.close();
  }
}

function topmostVisible(): Entry | null {
  let top: Entry | null = null;
  for (const entry of entries) {
    if (!entry.visible()) continue;
    if (!top || entry.seq > top.seq) top = entry;
  }
  return top;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  const top = topmostVisible();
  if (!top) return;
  top.close();
  event.stopPropagation();
}

function install(): void {
  if (installed) return;
  installed = true;
  document.addEventListener('mousedown', onPointerDown);
  document.addEventListener('keydown', onKeydown);
}

function uninstall(): void {
  if (!installed || entries.size) return;
  installed = false;
  document.removeEventListener('mousedown', onPointerDown);
  document.removeEventListener('keydown', onKeydown);
}

export interface DismissOptions {
  /** false 时只处理 Esc（遮罩自己负责关闭的弹窗用） */
  outside?: boolean;
  /** 除容器外，还有哪些元素算内部（portal 场景必须传触发器） */
  inside?: () => Array<HTMLElement | null>;
}

export function useDismiss(
  visible: boolean,
  container: RefObject<HTMLElement | null>,
  close: () => void,
  options: DismissOptions = {}
): void {
  /* 每次渲染刷新，避免监听回调里拿到旧值 */
  const latest = useRef({ visible, close, container, options });
  latest.current = { visible, close, container, options };

  const entryRef = useRef<Entry | null>(null);
  if (!entryRef.current) {
    entryRef.current = {
      visible: () => latest.current.visible,
      container: () => latest.current.container.current,
      close: () => latest.current.close(),
      outside: options.outside ?? true,
      inside: () => latest.current.options.inside?.() ?? [],
      seq: 0
    };
  }

  /* 只在挂载时登记一次；entry 内部通过 latest 读最新值 */
  useEffect(() => {
    const entry = entryRef.current;
    if (!entry) return;

    entries.add(entry);
    install();

    return () => {
      entries.delete(entry);
      uninstall();
    };
  }, []);

  /* 每次打开都取号，保证 Esc 先关最近打开的那个 */
  useEffect(() => {
    const entry = entryRef.current;
    if (entry && visible) entry.seq = ++openCounter;
  }, [visible]);
}
