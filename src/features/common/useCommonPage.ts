/**
 * 常用页的动作与交互状态（页面只负责摆放）。
 *
 * 三条约束：
 *   1. 页面零底层：这里只调 `commands` / `store` / `domain` 的类型，不碰 jsx、不读文件
 *   2. 执行类命令失败只 toast，不动本地状态（计划 §3.7）
 *   3. 拖拽落点复用 `domain/reorder` 的算法，命令层写盘，成功后由命令内部重读 store
 */

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { flip, reorder, toggleAutoFill, zoom } from '../../commands/common-use';
import type { FlipDirection } from '../../commands/common-use';
import type { CommonUseTile } from '../../domain/common-use';
import { MSG } from '../../types/messages';
import { booleanOptionOf } from '../../domain/common-use-options';
import { useLongPressDrag } from '../../hooks/useLongPressDrag';
import { useRunCommand } from '../../hooks/useRunCommand';
import { useToast } from '../../hooks/useToast';
import { useCommonUseStore } from '../../store/common-use';
import { AUTO_FILL_TILE_ID, TILE_COMMANDS } from './common-constants';

/** 拖拽落点候选的选择器：功能格自己（长按拖的是格子） */
const TILE_SELECTOR = '.mm-common__tile';

export function useCommonPage() {
  const tiles = useCommonUseStore((state) => state.tiles);
  const dropped = useCommonUseStore((state) => state.dropped);
  const failures = useCommonUseStore((state) => state.failures);
  const load = useCommonUseStore((state) => state.load);
  /*
   * 显隐键默认开：判据走 `booleanOptionOf`（官方默认表里这两键就是 `true`），
   * 不自己写 `!== false` —— 那样等于在页面里放第二份默认值。
   * 订阅派生布尔而不是整个 options 对象：另外 15 个键变化不该重渲染本页。
   */
  const showZoom = useCommonUseStore((state) => booleanOptionOf(state.options, 'cyShowZoom'));
  const showTransformation = useCommonUseStore((state) =>
    booleanOptionOf(state.options, 'cyShowTransformation')
  );

  /* 包 loading + 失败提示 + 原因留痕：只有一处实现（`hooks/useRunCommand`） */
  const run = useRunCommand();
  const toast = useToast();
  const drag = useLongPressDrag();
  const gridRef = useRef<HTMLDivElement | null>(null);

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

  function flipTo(direction: FlipDirection): void {
    void run(() => flip(direction));
  }

  /**
   * 网格左键：开关类走 `toggleAutoFill`（官方是切开关，不是执行一次），其余查 `TILE_COMMANDS`。
   *
   * 提示文案留在页面（命令层只回答「现在是什么」）：官方两句是「开启智能填色」/「已关闭」。
   */
  function activate(tile: CommonUseTile): void {
    if (tile.id === AUTO_FILL_TILE_ID) {
      void run(toggleAutoFill, { spin: false }).then((result) => {
        if (result.status === 'ok') toast.info(result.value ? MSG.common.fillOn : MSG.common.fillOff);
      });
      return;
    }

    const command = TILE_COMMANDS[tile.id];
    if (!command) return;
    void run(command);
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
        void run(() => reorder(from, to, result.position));
      }
    });
  }

  return {
    tiles,
    dropped,
    failures,
    showZoom,
    showTransformation,
    expandedId,
    setExpandedId,
    zoomTo,
    flipTo,
    activate,
    startDrag,
    gridRef,
    reload: load
  };
}
