/**
 * 重命名页的动作与交互状态（页面只负责摆放）
 *
 * 三条约束（与动作页同一套）：
 *   1. 页面零底层：只调 `commands/rename`、`store/rename` 与 `core/dialog`（选路径的唯一出口），
 *      不 import `core/ps` / `core/storage` / `core/cep`
 *   2. 写盘类命令成功后由命令内部重读 store，这里**不做乐观更新**
 *   3. 失败提示只有一处实现（`hooks/useRunCommand`）
 *
 * 两个界面偏好（模式 / 颜色标记区展开态）的值在 `store/rename`、落盘走 `commands/rename`：
 * 页面**不读也不写 `core/prefs`**，也不判「这个值认不认识」——归一化只有 store 一处
 * （`normalizeMode`），加了第二个判断点，坏偏好就会渲染成「一个档都没选中」。
 *
 * **本文件不含任何样式**：类名只用既有契约（组合层 / 公共件），页面私有样式待重做。
 */

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useConfirm } from '../../components/Confirm/useConfirm';
import type { MenuItem } from '../../components/ContextMenu';
import {
  addGroup as addGroupCommand,
  addItem as addItemCommand,
  batchName as batchNameCommand,
  changeItem as changeItemCommand,
  deleteGroup as deleteGroupCommand,
  deleteItem as deleteItemCommand,
  exportPreset,
  importPreset,
  renameGroup as renameGroupCommand,
  reorderGroup as reorderGroupCommand,
  reorderItem as reorderItemCommand,
  setColorSignOpen as setColorSignOpenCommand,
  setLayerColor as setLayerColorCommand,
  setMode as setModeCommand,
  toggleGroup as toggleGroupCommand
} from '../../commands/rename';
import { openFile, saveFile } from '../../core/dialog';
import { buildReplaceExpression, insertMark } from '../../domain/rename';
import { useLongPressDrag } from '../../hooks/useLongPressDrag';
import { useRunCommand } from '../../hooks/useRunCommand';
import { useToast } from '../../hooks/useToast';
import { useRenameStore, type RenameMode } from '../../store/rename';
import { MSG } from '../../types/messages';
import { EXPORT_FILE_NAME, LAYER_COLORS, MARK_MENU } from './rename-constants';

/** 右键菜单的两个来源：判别联合（同动作页，`{x?,y?,anchor?}` 会拼出「都没有」的坏状态） */
type MenuState =
  | { kind: 'point'; x: number; y: number; items: MenuItem[] }
  | { kind: 'anchor'; anchor: HTMLElement; items: MenuItem[] };

/** 输入弹窗的四种用途，共同点是「输入一个字符串再提交」 */
type DialogState =
  | { kind: 'addGroup'; afterIndex?: number }
  | { kind: 'renameGroup'; index: number; value: string }
  | { kind: 'addPreset'; groupIndex: number }
  | { kind: 'changePreset'; groupIndex: number; itemIndex: number; value: string };

export function useRenamePage() {
  const preset = useRenameStore((state) => state.preset);
  const dropped = useRenameStore((state) => state.dropped);
  const failure = useRenameStore((state) => state.failure);
  const mode = useRenameStore((state) => state.mode);
  const colorSignOpen = useRenameStore((state) => state.colorSignOpen);
  const load = useRenameStore((state) => state.load);

  const run = useRunCommand();
  const toast = useToast();
  const confirm = useConfirm();

  const [draft, setDraft] = useState('');
  const [replaceFrom, setReplaceFrom] = useState('');
  const [replaceTo, setReplaceTo] = useState('');
  /** 过滤子图层：默认开，**不持久化**（与参考实现一致） */
  const [filterChildren, setFilterChildren] = useState(true);

  const [menu, setMenu] = useState<MenuState | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const drag = useLongPressDrag();
  const listRef = useRef<HTMLDivElement | null>(null);
  /** 拖完那一次 click 要吞掉，否则「拖一下就执行了重命名」 */
  const draggedRef = useRef(false);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------------- 表达式与执行 ---------------- */

  /** 发一条表达式（回填 / 回车 / 应用 / 点 chip 都走这里） */
  function runExpression(expression: string): void {
    void run(() => batchNameCommand({ expression, filterChildren }), {
      tip: MSG.rename.renaming
    });
  }

  /**
   * 点预设 chip：**先回填输入框、再直接执行**（原版 chip 的 click 就是 `useBatchRename(item)`）。
   * 替换模式下点 chip 会切回默认模式（原版 `switchIndex = 0`）。
   */
  function applyPreset(expression: string): void {
    setDraft(expression);
    if (mode !== 'default') void run(() => setModeCommand('default'), { spin: false });
    runExpression(expression);
  }

  /** 回车 / 「应用」：默认模式发输入框里的表达式，替换模式先拼成 `原文=>新文字` */
  function apply(): void {
    if (mode === 'replace') {
      const built = buildReplaceExpression(replaceFrom, replaceTo);
      if (built.status === 'error') {
        void run(() => Promise.resolve(built), { spin: false });
        return;
      }
      runExpression(built.value);
      return;
    }
    runExpression(draft);
  }

  /* ---------------- 表达式菜单（点输入框弹出，原版 showTips） ---------------- */

  function openExpressionMenu(event: MouseEvent<HTMLElement>): void {
    setMenu({
      kind: 'point',
      x: event.clientX,
      y: event.clientY,
      items: MARK_MENU.map((entry) => ({
        label: entry.text,
        onSelect: () => setDraft((current) => insertMark(current, entry.mark))
      }))
    });
  }

  /** 过滤子图层：下拉里只有这一项勾选（原版 `filterData` 单选项） */
  function openFilterMenu(event: MouseEvent<HTMLElement>): void {
    const anchor = event.currentTarget;
    setMenu({
      kind: 'anchor',
      anchor,
      items: [
        {
          label: '过滤子图层',
          checked: filterChildren,
          onSelect: () => setFilterChildren((current) => !current)
        }
      ]
    });
  }

  /** tab 只会给这两个值（`MODE_OPTIONS` 的类型钉住的），页面不再判合法性 */
  function pickMode(next: RenameMode): void {
    void run(() => setModeCommand(next), { spin: false });
  }

  function toggleColorSign(): void {
    void run(() => setColorSignOpenCommand(!colorSignOpen), { spin: false });
  }

  /* ---------------- 图层颜色 ---------------- */

  function applyLayerColor(index: number): void {
    void run(() => setLayerColorCommand(index), { spin: false });
  }

  /* ---------------- 分组 ---------------- */

  function openGroupMenu(event: MouseEvent<HTMLElement>, groupIndex: number, groupName: string): void {
    event.preventDefault();

    /* 第 0 组只剩「创建新组」：不给它改名 / 删除 / 加项的入口 */
    const items: MenuItem[] =
      groupIndex === 0
        ? [
            {
              label: '创建新组',
              onSelect: () => setDialog({ kind: 'addGroup', afterIndex: groupIndex })
            }
          ]
        : [
            {
              label: '创建新组',
              onSelect: () => setDialog({ kind: 'addGroup', afterIndex: groupIndex })
            },
            {
              label: '重命名',
              onSelect: () => setDialog({ kind: 'renameGroup', index: groupIndex, value: groupName })
            },
            {
              label: '删除',
              danger: true,
              onSelect: () => void removeGroup(groupIndex, groupName)
            },
            {
              label: '批量添加重命名组',
              /* 自由面板未上线：只提示，不写任何文件 */
              onSelect: () => toast.error(MSG.freePanelOffline)
            }
          ];

    setMenu({ kind: 'point', x: event.clientX, y: event.clientY, items });
  }

  async function removeGroup(groupIndex: number, groupName: string): Promise<void> {
    const accepted = await confirm({ title: `${MSG.rename.confirmDeleteGroup}「${groupName}」？` });
    if (!accepted) return;
    void run(() => deleteGroupCommand(groupIndex), { spin: false });
  }

  function toggleGroup(groupIndex: number): void {
    void run(() => toggleGroupCommand(groupIndex), { spin: false });
  }

  /* ---------------- 预设项 ---------------- */

  function openItemMenu(
    event: MouseEvent<HTMLElement>,
    groupIndex: number,
    itemIndex: number,
    text: string
  ): void {
    event.preventDefault();
    /* 第 0 组（历史）的项不由用户改：模型层也会拦，这里只是不摆一个点了必然失败的菜单 */
    if (groupIndex === 0) return;

    setMenu({
      kind: 'point',
      x: event.clientX,
      y: event.clientY,
      items: [
        {
          label: '修改',
          onSelect: () => setDialog({ kind: 'changePreset', groupIndex, itemIndex, value: text })
        },
        {
          label: '删除',
          danger: true,
          onSelect: () => void run(() => deleteItemCommand(groupIndex, itemIndex), { spin: false })
        }
      ]
    });
  }

  /* ---------------- 输入弹窗 ---------------- */

  function submitDialog(value: string): void {
    const current = dialog;
    setDialog(null);
    if (!current) return;

    if (current.kind === 'addGroup') {
      void run(() => addGroupCommand(value, current.afterIndex), { spin: false });
      return;
    }
    if (current.kind === 'renameGroup') {
      void run(() => renameGroupCommand(current.index, value), { spin: false });
      return;
    }
    if (current.kind === 'addPreset') {
      void run(() => addItemCommand(current.groupIndex, value), { spin: false });
      return;
    }
    void run(() => changeItemCommand(current.groupIndex, current.itemIndex, value), { spin: false });
  }

  /* ---------------- 导入导出 ---------------- */

  async function doExport(): Promise<void> {
    const path = saveFile('导出预设', ['cmm'], EXPORT_FILE_NAME);
    if (!path) {
      toast.error(MSG.common.cancel);
      return;
    }
    void run(() => exportPreset(path), { success: MSG.rename.doneExport });
  }

  async function doImport(): Promise<void> {
    const path = openFile('导入预设', ['cmm']);
    if (!path) {
      toast.error(MSG.common.cancel);
      return;
    }
    void run(() => importPreset(path), { success: MSG.rename.doneImport });
  }

  /* ---------------- 拖拽（分组纵向 / 预设项横向，可跨组） ---------------- */

  function handleGroupMouseDown(event: MouseEvent<HTMLElement>, groupIndex: number): void {
    const node = event.currentTarget;
    const list = listRef.current;
    /* 第 0 组不可拖动：历史由程序写，顺序就是执行顺序 */
    if (!list || groupIndex === 0) return;

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

  function handleItemMouseDown(
    event: MouseEvent<HTMLElement>,
    groupIndex: number,
    itemIndex: number
  ): void {
    const node = event.currentTarget;
    const list = listRef.current;
    if (!list || groupIndex === 0) return;

    drag.start({
      event: event.nativeEvent,
      node,
      axis: 'x',
      targets: () => Array.from(list.querySelectorAll<HTMLElement>('[data-preset-item]')),
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

  return {
    /* 数据 */
    preset,
    dropped,
    failure,
    /* 七色 + 清除：色值由页面注入 `--mm-swatch`（`LAYER_COLORS` 里是变量名） */
    layerColors: LAYER_COLORS,

    /* 界面状态 */
    mode,
    filterChildren,
    colorSignOpen,
    draft,
    replaceFrom,
    replaceTo,
    menu,
    dialog,
    listRef,

    /* 动作 */
    setDraft,
    setReplaceFrom,
    setReplaceTo,
    pickMode,
    apply,
    applyPreset,
    openExpressionMenu,
    openFilterMenu,
    toggleColorSign,
    applyLayerColor,
    openGroupMenu,
    toggleGroup,
    openItemMenu,
    openAddGroup: () => setDialog({ kind: 'addGroup' }),
    openAddPreset: (groupIndex: number) => setDialog({ kind: 'addPreset', groupIndex }),
    closeDialog: () => setDialog(null),
    submitDialog,
    closeMenu: () => setMenu(null),
    doExport,
    doImport,
    handleGroupMouseDown,
    handleItemMouseDown,
    consumeDragClick,
    reload: load
  };
}
