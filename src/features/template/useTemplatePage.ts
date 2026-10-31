/**
 * 模板库页：store 的索引 → 「面包屑 + 子文件夹 + 当前层条目」+ 页面交互态。
 *
 * 三条约束：
 *   1. 派生值**现算不存**（`folderPath` / `childFolders` / `itemsOf` 都是 `domain` 的纯函数）；
 *   2. 当前层指向的文件夹被删掉时，`normalizeFolderId` 把它归到根 —— 不报错、不留空页；
 *   3. 写操作只经 `commands/*`，页面不碰 `repo` / `core/ps`。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as cmd from '../../commands/template';
import {
  childFolders,
  emptyTemplateIndex,
  folderPath,
  itemsOf,
  normalizeFolderId,
  type TemplateFolder,
  type TemplateIndex
} from '../../domain/template-library';
import { useRunCommand } from '../../hooks/useRunCommand';
import { useAppStore } from '../../store/app';
import { useTemplateStore } from '../../store/template';
import type { Result } from '../../types/result';
import { useTemplateDrag } from './useTemplateDrag';

/**
 * 右键菜单描述（`x/y` 是鼠标位置，同一个菜单服务三种目标）。
 *
 * `empty` = 在内容区**空白处**右键（只有「新建文件夹」，建在当前层）——
 * 建文件夹只有这一个入口，所以 `id` 对它没有意义，固定空串。
 */
export interface TemplateMenu {
  kind: 'item' | 'folder' | 'empty';
  id: string;
  x: number;
  y: number;
}

/** 输入弹窗：重命名条目 / 新建文件夹 / 重命名文件夹 —— 三件事共用一个 `InputDialog` */
export interface TemplateDialog {
  kind: 'renameItem' | 'createFolder' | 'renameFolder';
  /** 重命名时为被改对象的 id */
  id: string | null;
  title: string;
  value: string;
}

const DIALOG_TITLE: Record<TemplateDialog['kind'], string> = {
  renameItem: '重命名模板',
  createFolder: '新建文件夹',
  renameFolder: '重命名文件夹'
};

export function useTemplatePage() {
  const index = useTemplateStore((state) => state.index);
  const failure = useTemplateStore((state) => state.failure);
  const currentFolderId = useTemplateStore((state) => state.currentFolderId);
  const highlightId = useTemplateStore((state) => state.highlightId);
  const load = useTemplateStore((state) => state.load);
  const applyIndex = useTemplateStore((state) => state.applyIndex);
  const setCurrentFolder = useTemplateStore((state) => state.setCurrentFolder);
  const markSaved = useTemplateStore((state) => state.markSaved);
  const clearHighlight = useTemplateStore((state) => state.clearHighlight);
  /* 有文档 / 有活动图层才有东西可存；null = 没文档或读不到（`app/layer-watcher` 轮询维护） */
  const layerKind = useAppStore((state) => state.layerKind);

  const run = useRunCommand();
  const [preview, setPreview] = useState<string | null>(null);
  /* 破缓存版本号：更新预览图后 +1，`<img>` 地址跟着变才会重载 */
  const [imageVersion, setImageVersion] = useState(0);
  const [menu, setMenu] = useState<TemplateMenu | null>(null);
  const [dialog, setDialog] = useState<TemplateDialog | null>(null);
  /* 正在挑目标的条目 + 它被右键时的坐标（弹层就从那儿展开，不是屏幕居中） */
  const [moveTarget, setMoveTarget] = useState<{ id: string; x: number; y: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
  }, [load]);

  const base = index ?? emptyTemplateIndex();
  /* 当前文件夹可能在别处被删掉了（多端 / 手改索引），这里归到根而不是渲染空页 */
  const here = normalizeFolderId(base, currentFolderId);
  const crumb = folderPath(base, here);
  const folders = childFolders(base, here);
  const items = itemsOf(base, here);

  /* 存入成功：把新条目高亮 2s 并滚进视口（不让人自己在列表里翻找） */
  useEffect(() => {
    if (highlightId === null) return;
    const el = bodyRef.current?.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(highlightId)}"]`);
    el?.scrollIntoView({ block: 'nearest' });
    const timer = window.setTimeout(clearHighlight, 2000);
    return () => window.clearTimeout(timer);
  }, [highlightId, clearHighlight]);

  const saveSelection = useCallback(async () => {
    const result = await run(() => cmd.saveSelection(here));
    if (result.status === 'error') return;

    applyIndex(result.value);
    /* 命令只回整份索引：用「旧 id 集合里没有的那条」认出新条目，不另开返回值 */
    const before = new Set((index?.items ?? []).map((item) => item.id));
    const added = result.value.items.find((item) => !before.has(item.id));
    if (added) markSaved(added.id);
  }, [applyIndex, here, index, markSaved, run]);

  /** 所有「改索引」的命令共用一个收尾：成功就回填，失败已经由 `useRunCommand` 提示过 */
  /* 索引文件写盘秒级内，不弹遮罩（官方同款操作不遮罩）；成功回填 + 失败提示由 `run` 兜 */
  const withIndex = useCallback(
    async (task: () => Promise<Result<TemplateIndex>>) => {
      const result = await run(task, { spin: false });
      if (result.status === 'ok') applyIndex(result.value);
      return result;
    },
    [applyIndex, run]
  );

  const apply = useCallback(
    async (id: string) => {
      await run(() => cmd.placeTemplate(id), { spin: false });
    },
    [run]
  );

  const editSource = useCallback(
    async (id: string) => {
      await run(() => cmd.editSource(id), { spin: false });
    },
    [run]
  );

  const refreshThumb = useCallback(
    async (id: string) => {
      const result = await run(() => cmd.refreshThumb(id));
      /* 覆盖的是同名 png：换一个地址才会重载（照原版加随机参数的做法） */
      if (result.status === 'ok') setImageVersion((version) => version + 1);
    },
    [run]
  );

  const removeItem = useCallback(
    async (id: string) => {
      await withIndex(() => cmd.deleteItem(id));
    },
    [withIndex]
  );

  const moveItem = useCallback(
    async (id: string, folderId: string | null) => {
      await withIndex(() => cmd.moveItem(id, folderId));
    },
    [withIndex]
  );

  /* 拖拽：落点 == 条目当前所在文件夹时什么都不做（原地不该写盘） */
  const dropTo = useCallback(
    (itemId: string, folderId: string | null) => {
      const item = base.items.find((entry) => entry.id === itemId);
      if (!item || item.folderId === folderId) return;
      void moveItem(itemId, folderId);
    },
    [base.items, moveItem]
  );

  const drag = useTemplateDrag(dropTo);

  const askMove = useCallback(
    (id: string) => {
      /* 坐标要在关菜单之前取下来：弹层贴着它展开，符合"我右击了哪就出现在哪" */
      const at = menu;
      setMenu(null);
      setMoveTarget({ id, x: at?.x ?? 0, y: at?.y ?? 0 });
    },
    [menu]
  );

  const pickFolder = useCallback(
    async (folderId: string | null) => {
      const target = moveTarget;
      setMoveTarget(null);
      if (target !== null) await moveItem(target.id, folderId);
    },
    [moveItem, moveTarget]
  );

  const openFolder = useCallback(
    (id: string | null) => {
      setPreview(null);
      setMenu(null);
      setCurrentFolder(id);
    },
    [setCurrentFolder]
  );

  const openMenu = useCallback((kind: TemplateMenu['kind'], id: string, x: number, y: number) => {
    setMenu({ kind, id, x, y });
  }, []);

  /** 空白处右键：只有「新建文件夹」一项，落在当前这一层 */
  const openEmptyMenu = useCallback((x: number, y: number) => {
    setMenu({ kind: 'empty', id: '', x, y });
  }, []);

  const askRenameItem = useCallback((id: string, current: string) => {
    setMenu(null);
    setDialog({ kind: 'renameItem', id, title: DIALOG_TITLE.renameItem, value: current });
  }, []);

  /**
   * 新建文件夹：`parentId` 默认是**当前所在层**（路径行的「+ 新建文件夹」）；
   * 从某个文件夹的右键菜单进来时传那个文件夹的 id —— 否则「在 A 上右键新建」会建到当前层。
   */
  const askCreateFolder = useCallback(
    (parentId: string | null = here) => {
      setMenu(null);
      setDialog({ kind: 'createFolder', id: parentId, title: DIALOG_TITLE.createFolder, value: '' });
    },
    [here]
  );

  const askRenameFolder = useCallback((folder: TemplateFolder) => {
    setMenu(null);
    setDialog({ kind: 'renameFolder', id: folder.id, title: DIALOG_TITLE.renameFolder, value: folder.name });
  }, []);

  /* 三件事共用一个弹窗：提交时按 kind 分派到对应命令 */
  const submitDialog = useCallback(
    async (value: string) => {
      if (dialog === null) return;
      const current = dialog;
      setDialog(null);

      const id = current.id;
      if (current.kind === 'renameItem' && id !== null) {
        await withIndex(() => cmd.renameItem(id, value));
        return;
      }
      if (current.kind === 'createFolder') {
        await withIndex(() => cmd.createFolder(id, value));
        return;
      }
      if (current.kind === 'renameFolder' && id !== null) {
        await withIndex(() => cmd.renameFolder(id, value));
      }
    },
    [dialog, withIndex]
  );

  const removeFolder = useCallback(
    async (id: string) => {
      await withIndex(() => cmd.deleteFolder(id));
    },
    [withIndex]
  );

  const openLibraryDir = useCallback(async () => {
    setMenu(null);
    await run(() => cmd.openLibraryDir(), { spin: false });
  }, [run]);

  return {
    /* 数据 */
    crumb,
    folders,
    items,
    foldersAll: base.folders,
    /* 子文件夹里的条目数（格子角标） */
    countInFolder: (folderId: string) => base.items.filter((item) => item.folderId === folderId).length,
    /* 三态 */
    loading: index === null && failure === null,
    failure,
    /* 交互 */
    imageVersion,
    highlightId,
    bodyRef,
    preview,
    menu,
    dialog,
    moveTarget,
    drag,
    canSave: layerKind !== null,
    saveSelection,
    apply,
    editSource,
    refreshThumb,
    removeItem,
    moveItem,
    removeFolder,
    openFolder,
    openMenu,
    openEmptyMenu,
    closeMenu: () => setMenu(null),
    askMove,
    pickFolder,
    closeMove: () => setMoveTarget(null),
    askRenameItem,
    askCreateFolder,
    askRenameFolder,
    closeDialog: () => setDialog(null),
    submitDialog,
    openLibraryDir,
    openPreview: (id: string) => setPreview(id),
    closePreview: () => setPreview(null),
    reload: load
  };
}
