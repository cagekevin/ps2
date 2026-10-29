/**
 * 动作页的动作与交互状态（页面只负责摆放）。
 *
 * 三条约束（与常用页同一套）：
 *   1. 页面零底层：只调 `commands/action`、`store/action` 与 `core/dialog`（选路径的唯一出口）
 *   2. 写盘类命令成功后由命令内部重读 store，这里**不做乐观更新**
 *   3. 失败提示只有一处实现（`hooks/useRunCommand`）
 */

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useConfirm } from '../../components/Confirm/useConfirm';
import type { MenuItem } from '../../components/ContextMenu';
import {
  addFromPs as addFromPsCommand,
  addGroup as addGroupCommand,
  addWarehouse as addWarehouseCommand,
  call as callCommand,
  canAskGuide,
  deleteAlias as deleteAliasCommand,
  deleteGroup as deleteGroupCommand,
  deleteItem as deleteItemCommand,
  deleteWarehouse as deleteWarehouseCommand,
  exportLibrary,
  listPsActions,
  importLibrary,
  importPreset,
  markGuideDone,
  renameGroup as renameGroupCommand,
  renameWarehouse as renameWarehouseCommand,
  reorderGroup as reorderGroupCommand,
  reorderItem as reorderItemCommand,
  selectWarehouse as selectWarehouseCommand,
  setAlias as setAliasCommand,
  setListColumns,
  toggleGroup as toggleGroupCommand
} from '../../commands/action';
import { saveFile, openFile } from '../../core/dialog';
import type { ActionItem } from '../../domain/action-library';
import { MSG } from '../../types/messages';
import { useLongPressDrag } from '../../hooks/useLongPressDrag';
import { useRunCommand } from '../../hooks/useRunCommand';
import { useToast } from '../../hooks/useToast';
import { useActionStore, type ActionColumns } from '../../store/action';
import { columnMenuItems } from './action-constants';

/**
 * 右键菜单的两个来源：**判别联合**，不是三个可选字段。
 *
 * 用 `{ x?, y?, anchor? }` 会让「既没坐标也没锚点」编译得过，运行时菜单落在 (0,0)。
 * 两个来源答的是两个问题（鼠标位置 / 触发器矩形），所以两个臂。
 */
type MenuState =
  | { kind: 'point'; x: number; y: number; items: MenuItem[] }
  | { kind: 'anchor'; anchor: HTMLElement; items: MenuItem[] };

/** 输入弹窗：三种文案，共同点是「输入一个字符串再提交」 */
type DialogState =
  | { kind: 'addGroup'; afterIndex?: number }
  | { kind: 'renameGroup'; index: number; value: string }
  | { kind: 'alias'; groupIndex: number; itemIndex: number; value: string };

export function useActionPage() {
  const index = useActionStore((state) => state.index);
  const groups = useActionStore((state) => state.groups);
  const dropped = useActionStore((state) => state.dropped);
  const columns = useActionStore((state) => state.columns);
  const reasons = useActionStore((state) => state.reasons);
  const load = useActionStore((state) => state.load);

  const run = useRunCommand();
  const toast = useToast();
  const confirm = useConfirm();

  const [menu, setMenu] = useState<MenuState | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  /** 「添加动作」弹窗：带着 PS 列表与该动作要加进哪个组 */
  const [addAction, setAddAction] = useState<{ actions: ActionItem[]; groupIndex: number } | null>(null);

  const drag = useLongPressDrag();
  /** 宿主要能被 `querySelectorAll` 选中（分组行 / 动作格都挂在里面） */
  const listRef = useRef<HTMLDivElement | null>(null);
  /** 拖完那一次 click 要吞掉，否则等于「拖一下就执行了动作」 */
  const draggedRef = useRef(false);
  /** 首次引导只判一次 */
  const guideChecked = useRef(false);

  useEffect(() => {
    load();
  }, [load]);

  const warehouses = index?.list ?? [];
  const currentIndex = index?.index ?? 0;

  /* ---------------- 基本操作 ---------------- */

  function switchWarehouse(value: string): void {
    void run(() => selectWarehouseCommand(Number(value)));
  }

  /** 折叠态写仓库文件的 `show` 字段（不是本地偏好），所以走命令 */
  function toggleGroup(at: number, open: boolean): void {
    void run(() => toggleGroupCommand(at, open), { spin: false });
  }

  function callAction(item: ActionItem): void {
    void run(() => callCommand(item));
  }

  /** Ctrl+点击：v1 只提示，**不写任何文件**（`05` §1.2 / §3.9） */
  function notifyFreePanel(): void {
    toast.error(MSG.freePanelOffline);
  }

  function pickColumns(next: ActionColumns): void {
    setMenu(null);
    void run(() => setListColumns(next), { spin: false });
  }

  /* ---------------- 分组右键 ---------------- */

  function openGroupMenu(
    event: MouseEvent<HTMLElement>,
    groupIndex: number,
    groupName: string
  ): void {
    event.preventDefault();
    setMenu({
      kind: 'point',
      x: event.clientX,
      y: event.clientY,
      items: [
        { label: MSG.action.menuNewGroup, onSelect: () => setDialog({ kind: 'addGroup', afterIndex: groupIndex }) },
        {
          label: MSG.action.menuRename,
          onSelect: () => setDialog({ kind: 'renameGroup', index: groupIndex, value: groupName })
        },
        {
          label: MSG.action.menuDelete,
          danger: true,
          onSelect: () => void deleteGroup(groupIndex, groupName)
        }
      ]
    });
  }

  async function deleteGroup(groupIndex: number, groupName: string): Promise<void> {
    const accepted = await confirm({ title: `删除分组「${groupName}」？` });
    if (!accepted) return;
    void run(() => deleteGroupCommand(groupIndex), { success: MSG.action.doneDelete });
  }

  /* ---------------- 动作右键 ---------------- */

  function openItemMenu(
    event: MouseEvent<HTMLElement>,
    groupIndex: number,
    itemIndex: number,
    item: ActionItem
  ): void {
    event.preventDefault();
    setMenu({
      kind: 'point',
      x: event.clientX,
      y: event.clientY,
      items: [
        {
          label: item.alias ? MSG.action.menuEditAlias : MSG.action.menuAddAlias,
          onSelect: () =>
            setDialog({
              kind: 'alias',
              groupIndex,
              itemIndex,
              value: item.alias ?? item.name
            })
        },
        {
          label: MSG.action.menuDeleteAlias,
          /* 没有别名时不可点：原版也是灰的（官方 `$menu` 没有禁用态，我们照 `MenuItem.disabled`） */
          disabled: !item.alias,
          onSelect: () => void run(() => deleteAliasCommand(groupIndex, itemIndex), { success: MSG.action.doneDelete })
        },
        {
          label: MSG.action.menuDelete,
          danger: true,
          onSelect: () => void deleteItem(groupIndex, itemIndex, item.alias ?? item.name)
        }
      ]
    });
  }

  async function deleteItem(groupIndex: number, itemIndex: number, name: string): Promise<void> {
    const accepted = await confirm({ title: `删除动作「${name}」？` });
    if (!accepted) return;
    void run(() => deleteItemCommand(groupIndex, itemIndex), { success: MSG.action.doneDelete });
  }

  /* ---------------- 仓库增删改 ---------------- */

  function addWarehouse(): void {
    void run(addWarehouseCommand, { success: MSG.action.doneCreate });
  }

  async function removeWarehouse(name: string, at: string): Promise<void> {
    const accepted = await confirm({ title: `删除仓库「${name}」？` });
    if (!accepted) return;
    void run(() => deleteWarehouseCommand(Number(at)), { success: MSG.action.doneDelete });
  }

  function renameWarehouse(name: string): void {
    void run(() => renameWarehouseCommand(currentIndex, name), { success: MSG.action.doneRename });
  }

  /* ---------------- 导入导出 ---------------- */

  function openExportMenu(event: MouseEvent<HTMLElement>): void {
    const anchor = event.currentTarget;
    setMenu({
      kind: 'anchor',
      anchor,
      items: [
        { label: MSG.action.menuExportAll, onSelect: () => void doExport(false) },
        { label: MSG.action.menuExportCurrent, onSelect: () => void doExport(true) }
      ]
    });
  }

  async function doExport(current: boolean): Promise<void> {
    const path = saveFile(MSG.action.exportPreset, ['dzx'], MSG.action.defaultFileName);
    if (!path) {
      toast.error(MSG.common.cancel);
      return;
    }
    void run(() => exportLibrary({ current, path }), { success: MSG.action.doneExport });
  }

  function openImportMenu(event: MouseEvent<HTMLElement>): void {
    const anchor = event.currentTarget;
    setMenu({
      kind: 'anchor',
      anchor,
      items: [
        { label: MSG.action.menuImport, onSelect: () => void doImport(false) },
        { label: MSG.action.menuAppend, onSelect: () => void doImport(true) },
        { label: MSG.action.menuAppendPreset, onSelect: () => void run(importPreset, { success: MSG.action.doneAppend }) }
      ]
    });
  }

  async function doImport(append: boolean): Promise<void> {
    const path = openFile(MSG.action.menuImport, ['dzx']);
    if (!path) {
      toast.error(MSG.common.cancel);
      return;
    }

    /* 替换会覆盖索引，先问一次（官方也有「导入提示」） */
    if (!append) {
      const accepted = await confirm({ title: MSG.action.importTitle, message: MSG.action.importReplaceAsk, confirmText: MSG.action.importContinue });
      if (!accepted) return;
    }
    void run(() => importLibrary({ append, path }), { success: append ? MSG.action.doneAppend : MSG.action.doneImport });
  }

  /* ---------------- 输入弹窗 ---------------- */

  function submitDialog(value: string): void {
    const current = dialog;
    setDialog(null);
    if (!current) return;

    if (current.kind === 'addGroup') {
      void run(() => addGroupCommand(value, current.afterIndex));
      return;
    }
    if (current.kind === 'renameGroup') {
      void run(() => renameGroupCommand(current.index, value));
      return;
    }
    void run(() => setAliasCommand(current.groupIndex, current.itemIndex, value));
  }

  /* ---------------- 拖拽（三处共用同一套 hook） ---------------- */

  /** 分组排序：纵向（`axis: 'y'`），落点按分组行算 */
  function handleGroupMouseDown(event: MouseEvent<HTMLElement>, groupIndex: number): void {
    const node = event.currentTarget;
    const list = listRef.current;
    if (!list) return;

    drag.start({
      event: event.nativeEvent,
      node,
      axis: 'y',
      targets: () => Array.from(list.querySelectorAll<HTMLElement>('[data-group-head]')),
      onEnd: (result) => {
        if (!result.dragged || !result.target) return;
        const to = Number(result.target.dataset.groupIndex);
        if (!Number.isInteger(to) || to === groupIndex) return;
        void run(() => reorderGroupCommand(groupIndex, to, result.position), { spin: false });
      }
    });
  }

  /** 动作拖拽：组内与跨组**同一个命令**，落点从目标格的 `data-*` 读 */
  function handleItemMouseDown(
    event: MouseEvent<HTMLElement>,
    groupIndex: number,
    itemIndex: number
  ): void {
    const node = event.currentTarget;
    const list = listRef.current;
    if (!list) return;

    drag.start({
      event: event.nativeEvent,
      node,
      axis: 'x',
      targets: () => Array.from(list.querySelectorAll<HTMLElement>('[data-action-item]')),
      onEnd: (result) => {
        draggedRef.current = result.dragged;
        if (!result.dragged || !result.target) return;

        const toGroup = Number(result.target.dataset.groupIndex);
        const toIndex = Number(result.target.dataset.itemIndex);
        if (!Number.isInteger(toGroup) || !Number.isInteger(toIndex)) return;
        if (toGroup === groupIndex && toIndex === itemIndex) return;

        void run(
          () => reorderItemCommand(groupIndex, itemIndex, toGroup, toIndex, result.position),
          { spin: false }
        );
      }
    });
  }

  /** 拖完那次 click 要吞掉；返回 true 表示「这次点击属于拖拽」 */
  function consumeDragClick(): boolean {
    if (!draggedRef.current) return false;
    draggedRef.current = false;
    return true;
  }

  /* ---------------- 添加动作（`listPsActions` 的唯一消费者） ---------------- */

  async function openAddAction(groupIndex: number): Promise<void> {
    const listed = await run(listPsActions, { tip: MSG.action.readingActions });
    if (listed.status === 'error') return;
    if (!listed.value.length) {
      toast.error(MSG.action.emptyGroup);
      return;
    }
    setAddAction({ actions: listed.value, groupIndex });
  }

  function confirmAddActions(items: ActionItem[]): void {
    const target = addAction;
    setAddAction(null);
    if (!target) return;

    void run(() => addFromPsCommand(target.groupIndex, items), {
      success: `成功添加 ${items.length} 个`
    });
  }

  /* ---------------- 首次引导（`05` §3.10 F2） ---------------- */

  useEffect(() => {
    /* 判据在命令层（`canAskGuide`）：页面不读 prefs、不判「库是不是空的」 */
    if (guideChecked.current || !index || !canAskGuide()) return;
    guideChecked.current = true;

    /* 逻辑写在 effect 内：只在首次判一次，不放进依赖数组（否则每次渲染都问一遍） */
    void (async () => {
      const accepted = await confirm({
        title: MSG.action.guideTitle,
        message: MSG.action.guideAsk,
        confirmText: MSG.action.guideImport
      });

      /* **取消也置标记**：否则每次进页面都弹（`05` §3.10 F2） */
      await markGuideDone();

      if (accepted) void run(importPreset, { success: MSG.action.doneImport });
    })();
  }, [index, confirm, run]);

  return {
    warehouses,
    currentIndex,
    groups,
    dropped,
    columns,
    reasons,
    menu,
    dialog,
    switchWarehouse,
    toggleGroup,
    callAction,
    notifyFreePanel,
    openGroupMenu,
    openItemMenu,
    openColumnMenu: (event: MouseEvent<HTMLElement>) => {
      /* 菜单项在 `action-constants` 里拼（文案与勾选规则只有那一处） */
      setMenu({
        kind: 'anchor',
        anchor: event.currentTarget,
        items: columnMenuItems(columns, pickColumns)
      });
    },
    closeMenu: () => setMenu(null),
    listRef,
    handleGroupMouseDown,
    handleItemMouseDown,
    consumeDragClick,
    addAction,
    openAddAction,
    confirmAddActions,
    closeAddAction: () => setAddAction(null),
    openAddGroup: () => setDialog({ kind: 'addGroup' }),
    closeDialog: () => setDialog(null),
    submitDialog,
    addWarehouse,
    removeWarehouse,
    renameWarehouse,
    openExportMenu,
    openImportMenu,
    reload: load
  };
}
