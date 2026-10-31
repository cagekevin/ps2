/**
 * 【范本】样式页的全部动作与交互状态。
 *
 * 为什么单独成 hook：读库 / 应用 / 增删改 / 拖拽 / 右键菜单都在这里，页面不必持有这些状态。
 * 页面只留骨架和 JSX，动作逻辑（应用 / 增删改 / 拖拽 / 右键菜单）全在这里。
 *
 * 返回值刻意与页面里原来的函数同名，页面解构后 JSX 不用改名。
 */
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useConfirm } from '../../components/Confirm/useConfirm';
import { useToast } from '../../components/Toast';
import { MSG } from '../../types/messages';
import { useReportFailure, useRunCommand, type RunOptions } from '../../hooks/useRunCommand';
import type { MenuItem } from '../../components/ContextMenu';
import {
  addFontFromLayer,
  addForegroundColorToLibrary,
  addGradientFromLayer,
  addGroupToLibrary,
  addStyleFromLayer,
  appendGroupToSwatch,
  appendItemToSwatch,
  applyBorderColorToLayer,
  applyColor,
  applyFontToLayer,
  applyGradientToLayer,
  applyLayerStyle,
  applyShapeFillToLayer,
  exportKuAll,
  exportKuCurrent,
  importKuAppend,
  importKuReplace,
  moveGroupInLibrary,
  deleteKuGroup,
  deleteKuItem,
  moveKuItemTo,
  pickColorToGroup,
  readKuGroupId,
  readKuItem,
  renameKuGroup,
  renameKuItem,
  sendGroupToSwatch,
  sendItemToSwatch,
  setExpandedGroups as setExpandedGroupsCommand,
  setGroupShowInLibrary
} from '../../commands/style';
import type { KuKind } from '../../domain/style-library';
import { useLongPressDrag } from '../../hooks/useLongPressDrag';
import { useStyleLibraryStore } from '../../store/style-library';
import { ok, type Result } from '../../types/result';

/** 默认展开前几组，避免上百组一次性渲染 */
const DEFAULT_EXPANDED = 1;

/** 右键菜单的目标 */
export type MenuTarget =
  | { type: 'group'; groupIndex: number; groupName: string; x: number; y: number }
  | { type: 'item'; groupIndex: number; itemIndex: number; name: string; x: number; y: number };

/** 正在重命名的目标 */
export type RenameTarget =
  | { type: 'group'; groupIndex: number }
  | { type: 'item'; groupIndex: number; itemIndex: number };

/**
 * 组末尾「+」的提示语，按库分派（页面的 title 也用它）。
 *
 * 逐库照抄原版（对照清单 #61）：
 * - 颜色「添加当前前景色」`app.v4.js:49991`
 * - 渐变「添加渐变色，仅支持形状图层」`:50572`
 * - 字体「添加字体，支持多图层」`:50985`
 * - 样式「添加样式」`:51378`
 */
export const ADD_TITLE: Record<KuKind, string> = {
  color: '添加当前前景色',
  gradient: '添加渐变色，仅支持形状图层',
  font: '添加字体，支持多图层',
  style: '添加样式'
};

export function useStyleActions() {
  const toast = useToast();
  /* 执行 + 反馈的唯一实现（loading / 成功提示 / 取消静默 / 缺文件文案都在里面） */
  const run = useRunCommand();
  const reportFailure = useReportFailure();
  const confirm = useConfirm();

  const load = useStyleLibraryStore((state) => state.load);
  const warehouses = useStyleLibraryStore((state) => state.warehouses);
  const activeIndex = useStyleLibraryStore((state) => state.activeIndex);
  const activeKind = useStyleLibraryStore((state) => state.activeKind);
  const setActiveKind = useStyleLibraryStore((state) => state.setActiveKind);
  const libraries = useStyleLibraryStore((state) => state.libraries);

  /* 展开的分组在 store 里（值已归一），落盘走 `commands/style.setExpandedGroups` */
  const expandedGroups = useStyleLibraryStore((state) => state.expandedGroups);
  /* 组多时每渲染都 new Set 是白跑；列表没变就复用 */
  const expanded = useMemo(() => new Set(expandedGroups), [expandedGroups]);
  const [menu, setMenu] = useState<MenuTarget | null>(null);
  const [editing, setEditing] = useState<RenameTarget | null>(null);
  /* 正在新建的分组：afterIndex = -1 表示追加到末尾（底栏按钮走这条） */
  const [newGroup, setNewGroup] = useState<{ afterIndex: number } | null>(null);

  const drag = useLongPressDrag();
  /* 拖拽结束后浏览器仍会派发一次 click，用它挡掉「拖完顺手应用了颜色」 */
  const draggedRef = useRef(false);

  useEffect(() => {
    void load();
  }, [load]);

  /* 切仓库或切 tab 时，回到默认展开（与改造前同一时机，行为不变） */
  useEffect(() => {
    void setExpandedGroupsCommand(Array.from({ length: DEFAULT_EXPANDED }, (_, i) => i));
  }, [activeKind, activeIndex]);

  /** 当前仓库；没有就是 null（拖拽这类静默失败的动作用它） */
  function currentWarehouse() {
    return warehouses[activeIndex] ?? null;
  }

  /*
   * 读库失败的提示走 `reportFailure`（`hooks/useRunCommand` 的读路径出口）：与写库失败同一出口、同样留痕。
   * **不再按码改写文案**（原先 `NOT_FOUND → '库文件不存在'` 是消费者替生产者下结论）。
   */

  /** 当前仓库；没有就提示一句（用户主动触发的动作用它） */
  function requireWarehouse() {
    const warehouse = currentWarehouse();
    if (!warehouse) toast.error(MSG.style.noWarehouse);
    return warehouse;
  }

  /**
   * 执行一条命令并反馈。**实现只有一处**（`hooks/useRunCommand`），这里只留两个动词名，
   * 因为 27 个调用点按「要不要重读列表」分成两类，改名要动 27 处。
   *
   * 语义：包 loading、成功 info、`CANCELLED` 静默（用户取消不是故障）。文案不在这里改。
   */
  const STYLE_RUN: RunOptions = { quiet: ['CANCELLED'] };

  /**
   * 样式库操作（应用颜色/描边/渐变/字体/样式、入库、增删改、发送到/追加到色板、吸色）
   * 都是秒级内：按 `useRunCommand` 的遮罩约定统一**不弹遮罩**——下面调用处给 `runWithFeedback` /
   * `runWithToast` 的第三个参数（即 `spin`）传 `false`。
   * 只有 ku 导入/导出（`handleImportKu*` / `handleExportKu*`）可能慢，保留遮罩（不传 `spin`）。
   */
  /** 只提示不刷新（应用类：改的是 PS 图层，不是库文件） */
  async function runWithToast(
    task: () => Promise<Result<void>>,
    successText: string,
    spin = true
  ): Promise<void> {
    await run(task, { ...STYLE_RUN, success: successText, spin });
  }

  /** 写库类动作的统一反馈：loading + 成功提示 + 重读列表（成败都重读，与原实现一致） */
  async function runWithFeedback(
    task: () => Promise<Result<void>>,
    successText: string,
    spin = true
  ): Promise<void> {
    await run(task, { ...STYLE_RUN, success: successText, after: () => void load(), spin });
  }

  /**
   * 折叠 / 展开。
   * 原版普通点击折叠也写库（`show` 是库文件的真实字段），照此行为；
   * 写库失败不回滚本地状态——下次 load 会以文件为准。
   */
  function toggleGroup(index: number) {
    const open = !expandedGroups.includes(index);
    void setExpandedGroupsCommand(
      open ? [...expandedGroups, index] : expandedGroups.filter((item) => item !== index)
    );

    const warehouse = currentWarehouse();
    if (!warehouse) return;
    void setGroupShowInLibrary(warehouse, activeKind, index, open);
  }

  /**
   * 组末尾「+」：把「当前 PS 状态」存进这一组，按库分派。
   *
   * - 颜色：读前景色
   * - 渐变：读当前图层的渐变定义
   * - 字体：读当前文字图层的字体属性
   * - 样式：让 jsxbin 把图层样式存成 `kuStyle/<groupId>.psd`，成功后重读
   */
  async function handleAddItem(groupIndex: number) {
    const warehouse = requireWarehouse();
    if (!warehouse) return;

    await runWithFeedback(() => {
      if (activeKind === 'color') {
        return addForegroundColorToLibrary(warehouse, activeKind, groupIndex);
      }
      if (activeKind === 'gradient') {
        return addGradientFromLayer(warehouse, activeKind, groupIndex);
      }
      if (activeKind === 'font') {
        return addFontFromLayer(warehouse, activeKind, groupIndex);
      }
      return addStyleFromLayer(warehouse, activeKind, groupIndex);
    }, activeKind === 'color' ? MSG.style.doneAddedForeground : MSG.style.doneAdded, false);
  }

  /** 底栏「添加×分组」：切到对应 tab 再弹输入（原版四个按钮各管一个库） */
  function startNewGroup(kind: KuKind) {
    if (kind !== activeKind) setActiveKind(kind);
    setNewGroup({ afterIndex: (libraries[kind]?.length ?? 0) - 1 });
  }

  /** 新建分组：afterIndex = -1 表示追加到末尾 */
  async function handleCreateGroup(name: string, afterIndex: number) {
    setNewGroup(null);

    const warehouse = requireWarehouse();
    if (!warehouse) return;

    await runWithFeedback(
      () => addGroupToLibrary(warehouse, activeKind, name, afterIndex === -1 ? undefined : afterIndex),
      MSG.style.doneGroupCreated,
      false
    );
  }

  async function handleApply(
    groupIndex: number,
    itemIndex: number,
    name: string,
    event: MouseEvent
  ) {
    /* 刚拖完的那次 click 不算「应用」 */
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }

    /* 原始项只从 repo 取：视图模型不带原始数据，避免两套来源 */
    const warehouse = requireWarehouse();
    if (!warehouse) return;

    const raw = readKuItem(warehouse, activeKind, groupIndex, itemIndex);
    if (raw.status === 'error') {
      reportFailure(raw);
      return;
    }

    if (activeKind === 'color') {
      /* 修饰键分流：ctrl 只改填充、shift 只改描边，都不按则按图层类型自动处理 */
      const task = event.ctrlKey || event.metaKey
        ? applyShapeFillToLayer
        : event.shiftKey
          ? applyBorderColorToLayer
          : applyColor;

      await runWithToast(() => task(raw.value), `已应用「${name}」`, false);
      return;
    }

    if (activeKind === 'gradient') {
      /* 原版发的是项里的 gradient 字段，不是整个项 */
      const gradient = raw.value.gradient;
      if (!gradient) {
        toast.error(MSG.style.gradientNoData);
        return;
      }
      await runWithToast(() => applyGradientToLayer(gradient), `已应用「${name}」`, false);
      return;
    }

    if (activeKind === 'font') {
      /* 字体走直接调用通道，不走 ps_onJsx */
      await runWithToast(() => applyFontToLayer(raw.value), `已应用「${name}」`, false);
      return;
    }

    /* style：需要分组 id，jsx 用它定位样式资源 */
    const groupId = readKuGroupId(warehouse, activeKind, groupIndex);
    if (groupId.status === 'error') {
      reportFailure(groupId);
      return;
    }

    await runWithToast(() => applyLayerStyle(raw.value, groupId.value), `已应用「${name}」`, false);
  }

  /**
   * 右键菜单项，照抄原版（`app.v4.js:50227-50366`）。
   *
   * 项：删除 / 重命名 /[颜色库] 分隔 / 发送到色板 / 追加到色板
   * 组：创建新组 / 分隔 / 删除 / 重命名 / 分隔 /[颜色库] 发送到色板 / 追加到色板 / 分隔 /
   *     快速吸色到组
   *
   * 色板相关命令还没实现，**渲染但置灰**——不静默消失，让人知道有这项功能。
   * **「发送到仓库…」「移动到仓库…」已删**（2026-10-31）：单仓库之后没有第二个仓库可发/可移，
   * 留着两个永远置灰的项就是空承诺。
   */
  function buildMenuItems(target: MenuTarget): MenuItem[] {
    if (target.type === 'item') {
      const shared: MenuItem[] = [
        { label: '删除', danger: true, onSelect: () => void handleDelete(target) },
        {
          label: '重命名',
          onSelect: () =>
            setEditing({ type: 'item', groupIndex: target.groupIndex, itemIndex: target.itemIndex })
        }
      ];
      if (activeKind !== 'color') return shared;

      return [
        ...shared,
        { label: '', separator: true },
        {
          label: '发送到色板',
          onSelect: () => void handleSendItemToSwatch(target.groupIndex, target.itemIndex)
        },
        {
          label: '追加到色板',
          onSelect: () => void handleAppendItemToSwatch(target.groupIndex, target.itemIndex)
        }
      ];
    }

    const head: MenuItem[] = [
      { label: '创建新组', onSelect: () => setNewGroup({ afterIndex: target.groupIndex }) },
      { label: '', separator: true },
      { label: '删除', danger: true, onSelect: () => void handleDelete(target) },
      {
        label: '重命名',
        onSelect: () => setEditing({ type: 'group', groupIndex: target.groupIndex })
      },
      { label: '', separator: true }
    ];

    if (activeKind !== 'color') return head;

    return [
      ...head,
      {
        label: '发送到色板',
        onSelect: () => void handleSendGroupToSwatch(target.groupIndex)
      },
      {
        label: '追加到色板',
        onSelect: () => void handleAppendGroupToSwatch(target.groupIndex)
      },
      { label: '', separator: true },
      {
        label: '快速吸色到组',
        onSelect: () => void handlePickColorToGroup(target.groupIndex)
      }
    ];
  }

  /** 发送到色板（单项）：整份替换 */
  async function handleSendItemToSwatch(groupIndex: number, itemIndex: number) {
    const warehouse = requireWarehouse();
    if (!warehouse) return;

    await runWithFeedback(
      () => sendItemToSwatch(warehouse, activeKind, groupIndex, itemIndex),
      MSG.style.doneToSwatch,
      false
    );
  }

  /** 追加到色板（单项） */
  async function handleAppendItemToSwatch(groupIndex: number, itemIndex: number) {
    const warehouse = requireWarehouse();
    if (!warehouse) return;

    await runWithFeedback(
      () => appendItemToSwatch(warehouse, activeKind, groupIndex, itemIndex),
      MSG.style.doneAppendSwatch,
      false
    );
  }

  /** 发送到色板（整组替换） */
  async function handleSendGroupToSwatch(groupIndex: number) {
    const warehouse = requireWarehouse();
    if (!warehouse) return;

    await runWithFeedback(() => sendGroupToSwatch(warehouse, activeKind, groupIndex), MSG.style.doneToSwatch, false);
  }

  /** 追加到色板（整组逐项 push） */
  async function handleAppendGroupToSwatch(groupIndex: number) {
    const warehouse = requireWarehouse();
    if (!warehouse) return;

    await runWithFeedback(() => appendGroupToSwatch(warehouse, activeKind, groupIndex), MSG.style.doneAppendSwatch, false);
  }

  /* ---------------- 导入 / 导出 ---------------- */

  function handleImportKuReplace() {
    void runWithFeedback(async () => {
      const result = await importKuReplace();
      return result.status === 'ok' ? ok(undefined) : result;
    }, MSG.style.doneImport);
  }

  function handleImportKuAppend() {
    void runWithFeedback(async () => {
      const result = await importKuAppend();
      return result.status === 'ok' ? ok(undefined) : result;
    }, MSG.style.doneImport);
  }

  function handleExportKuAll() {
    void runWithFeedback(() => exportKuAll(), MSG.style.doneExportAll);
  }

  function handleExportKuCurrent() {
    void runWithFeedback(() => exportKuCurrent(), MSG.style.doneExportCurrent);
  }

  /** 快速吸色到组：切吸管等用户取色，取到的前景色写进这一组 */
  async function handlePickColorToGroup(groupIndex: number) {
    const warehouse = requireWarehouse();
    if (!warehouse) return;

    await runWithFeedback(() => pickColorToGroup(warehouse, activeKind, groupIndex), MSG.style.donePickToGroup, false);
  }

  /** 删除分组或项：先确认，再写库 */
  async function handleDelete(target: MenuTarget) {
    const ok = await confirm({
      title:
        target.type === 'group' ? `删除分组「${target.groupName}」？` : `删除「${target.name}」？`,
      message: MSG.style.confirmDeleteMessage
    });
    if (!ok) return;

    const warehouse = requireWarehouse();
    if (!warehouse) return;

    await runWithFeedback(
      () =>
        target.type === 'group'
          ? deleteKuGroup(warehouse, activeKind, target.groupIndex)
          : deleteKuItem(warehouse, activeKind, target.groupIndex, target.itemIndex),
      MSG.style.doneDelete,
      false
    );
  }

  /** 重命名分组或项；写库成功后重读列表 */
  async function handleRename(target: RenameTarget, name: string) {
    setEditing(null);

    const warehouse = requireWarehouse();
    if (!warehouse) return;

    await runWithFeedback(
      () =>
        target.type === 'group'
          ? renameKuGroup(warehouse, activeKind, target.groupIndex, name)
          : renameKuItem(warehouse, activeKind, target.groupIndex, target.itemIndex, name),
      MSG.style.doneRename,
      false
    );
  }

  /**
   * 长按开始拖拽：项可跨组排序。
   * 目标列表取整个 `.mm-style__list`，不是当前组容器——跨组拖拽靠这个。
   */
  function handleItemMouseDown(event: MouseEvent, groupIndex: number, itemIndex: number) {
    const node = event.currentTarget as HTMLElement;
    const list = node.closest('.mm-style__list');
    if (!(list instanceof HTMLElement)) return;

    drag.start({
      event: event.nativeEvent,
      node,
      axis: 'x',
      targets: () => Array.from(list.querySelectorAll<HTMLElement>('[data-item-index]')),
      onEnd: (result) => {
        draggedRef.current = result.dragged;
        if (!result.dragged || !result.target) return;

        const toGroup = Number(result.target.dataset.groupIndex);
        const toIndex = Number(result.target.dataset.itemIndex);
        if (Number.isNaN(toGroup) || Number.isNaN(toIndex)) return;
        if (toGroup === groupIndex && toIndex === itemIndex) return;

        void handleMoveItem(groupIndex, itemIndex, toGroup, toIndex, result.position);
      }
    });
  }

  /** 项拖拽落点写回库文件（可跨组） */
  async function handleMoveItem(
    fromGroup: number,
    from: number,
    toGroup: number,
    to: number,
    position: 'before' | 'after'
  ) {
    const warehouse = currentWarehouse();
    if (!warehouse) return;

    await runWithFeedback(
      () =>
        moveKuItemTo(warehouse, activeKind, {
          from: { group: fromGroup, index: from },
          to: { group: toGroup, index: to },
          position
        }),
      MSG.style.doneReorder,
      false
    );
  }

  /** 长按分组标题：纵向排序 */
  function handleGroupMouseDown(event: MouseEvent, groupIndex: number) {
    const node = event.currentTarget as HTMLElement;
    const list = node.closest('.mm-style__list');
    if (!(list instanceof HTMLElement)) return;

    drag.start({
      event: event.nativeEvent,
      node,
      axis: 'y',
      targets: () => Array.from(list.querySelectorAll<HTMLElement>('[data-group-head]')),
      onEnd: (result) => {
        /* 拖完那次 click 会折叠分组，挡掉 */
        draggedRef.current = result.dragged;
        if (!result.dragged || !result.target) return;

        const toIndex = Number(result.target.dataset.groupIndex);
        if (Number.isNaN(toIndex) || toIndex === groupIndex) return;

        void handleMoveGroup(groupIndex, toIndex, result.position);
      }
    });
  }

  /** 分组拖拽落点写回库文件 */
  async function handleMoveGroup(from: number, to: number, position: 'before' | 'after') {
    const warehouse = currentWarehouse();
    if (!warehouse) return;

    await runWithFeedback(
      () => moveGroupInLibrary(warehouse, activeKind, from, to, position),
      MSG.style.doneReorderGroup,
      false
    );
  }

  return {
    expanded,
    menu,
    setMenu,
    editing,
    setEditing,
    newGroup,
    setNewGroup,
    draggedRef,
    toggleGroup,
    handleAddItem,
    handleSendItemToSwatch,
    handleAppendItemToSwatch,
    handleSendGroupToSwatch,
    handleAppendGroupToSwatch,
    handlePickColorToGroup,
    handleImportKuReplace,
    handleImportKuAppend,
    handleExportKuAll,
    handleExportKuCurrent,
    runWithFeedback,
    startNewGroup,
    handleCreateGroup,
    handleApply,
    buildMenuItems,
    handleDelete,
    handleRename,
    handleItemMouseDown,
    handleGroupMouseDown
  };
}
