/**
 * 常用页的动作与交互状态（页面只负责摆放）。
 *
 * 三条约束：
 *   1. 页面零底层：这里只调 `commands` / `store` / `domain` 的类型，不碰 jsx、不读文件
 *   2. 执行类命令失败只 toast，不动本地状态（计划 §3.7）
 *   3. 拖拽落点复用 `domain/reorder` 的算法，命令层写盘，成功后由命令内部重读 store
 */

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  flip,
  openDirectory,
  reorder,
  resetAll,
  setCollapsed,
  zoom
} from '../../commands/common-use';
import type { FlipDirection } from '../../commands/common-use';
import { useToast } from '../../components/Toast';
import type { CommonUseTile } from '../../domain/common-use';
import type { DropPosition } from '../../domain/reorder';
import { useLongPressDrag } from '../../hooks/useLongPressDrag';
import { useRunCommand } from '../../hooks/useRunCommand';
import { useCommonUseStore, type CommonSection } from '../../store/common-use';
import { TILE_COMMANDS } from './common-constants';

/** 拖拽落点候选的选择器：功能格自己（长按拖的是格子） */
const TILE_SELECTOR = '.mm-common__tile';

export function useCommonPage() {
  const tiles = useCommonUseStore((state) => state.tiles);
  const collapsed = useCommonUseStore((state) => state.collapsed);
  const reasons = useCommonUseStore((state) => state.reasons);
  const load = useCommonUseStore((state) => state.load);
  /* 显隐键默认开：文件里没有这个键 ≠ 用户关掉了（与 domain 的投影约定一致）。
     订阅派生布尔而不是整个 options 对象：另外 15 个键变化不该重渲染本页 */
  const showZoom = useCommonUseStore((state) => state.options.cyShowZoom !== false);
  const showTransformation = useCommonUseStore(
    (state) => state.options.cyShowTransformation !== false
  );

  /* 包 loading + 失败提示 + 原因留痕：只有一处实现（`hooks/useRunCommand`） */
  const toast = useToast();
  const run = useRunCommand();
  const drag = useLongPressDrag();
  const gridRef = useRef<HTMLDivElement | null>(null);

  const [enlarge, setEnlarge] = useState('');
  const [narrow, setNarrow] = useState('');
  /**
   * 全局只有一个展开项：每一行一个 `IconPanelGroup`，所有组绑这同一个值。
   * 空串 = 全收起；组内互斥管不了跨行，所以由页面把同一个值发下去。
   */
  const [expandedId, setExpandedId] = useState('');

  useEffect(() => {
    load();
  }, [load]);

  function zoomTo(scale: number): void {
    void run(() => zoom(scale));
  }

  /** 输入框只提交纯数字：原版 `inputSize` 先 `replace(/[^\d]/g, '')` 再发 */
  function submitScale(text: string): void {
    const digits = text.replace(/[^\d]/g, '');
    if (!digits) {
      toast.error('请输入缩放倍数');
      return;
    }
    zoomTo(Number(digits));
  }

  function flipTo(direction: FlipDirection): void {
    void run(() => flip(direction));
  }

  /** 页头的两个基础按钮（计划 §1.1 的 12 类里，只有这两个不落在网格上） */
  function openDataDirectory(): void {
    void run(openDirectory);
  }

  function resetTiles(): void {
    void run(resetAll);
  }

  function activate(tile: CommonUseTile): void {
    const command = TILE_COMMANDS[tile.id];
    if (!command) return;
    void run(command);
  }

  function toggleSection(id: CommonSection): void {
    void setCollapsed(id, !collapsed[id]);
  }

  /**
   * 长按拖拽排序。
   *
   * 页面只把「从哪个下标拖到哪个下标、落点在前后」交给命令，**落点算法与写盘都在命令层**
   * （复用 `domain/reorder`），这里不自己算一遍——两处算就会有两套边界判断。
   */
  function startDrag(event: MouseEvent<HTMLButtonElement>, from: number): void {
    const node = event.currentTarget;
    const grid = gridRef.current;
    if (!grid) return;

    drag.start({
      event: event.nativeEvent,
      node,
      axis: 'x',
      targets: () => Array.from(grid.querySelectorAll<HTMLElement>(TILE_SELECTOR)),
      onEnd: (result) => {
        if (!result.dragged || !result.target) return;
        const to = Number(result.target.dataset.index);
        if (!Number.isInteger(to) || to === from) return;
        void run(() => reorder(from, to, result.position as DropPosition));
      }
    });
  }

  return {
    tiles,
    reasons,
    collapsed,
    showZoom,
    showTransformation,
    enlarge,
    narrow,
    setEnlarge,
    setNarrow,
    expandedId,
    setExpandedId,
    submitScale,
    zoomTo,
    flipTo,
    openDataDirectory,
    resetTiles,
    activate,
    toggleSection,
    startDrag,
    gridRef,
    reload: load
  };
}
