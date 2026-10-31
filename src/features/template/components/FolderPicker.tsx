/**
 * 模板库 · 「移动到…」的目标选择（**页面私有**，不进公共件清单）。
 *
 * 为什么不把候选平铺进右键菜单：菜单项数量等于文件夹数，10 个加上层级就长到溢出屏幕，
 * 而 `ContextMenu` 不能滚。所以收一层，层里再用**级联**表达层级：
 *
 *   只列**当前这一层**的文件夹 → 鼠标移到有子级的行上 → 它的子级从右侧弹出（再深就再弹）。
 *   不做树、不做折叠三角、不做滚动列表 —— 层级本来就用「谁在谁右边」表达了。
 *
 * 子面板是**行的子元素**（不是兄弟），所以鼠标从行移进子面板不会触发 `mouseleave`，
 * 不会闪。点任意一行 = 移进那个文件夹（父级本身也可以是目的地）。
 */
import { useLayoutEffect, useState } from 'react';
import { Chevron } from '../../../components/Chevron';
import { Portal } from '../../../components/Portal';
import { useDismiss } from '../../../hooks/useDismiss';
import { useFloatingPosition } from '../../../hooks/useFloatingPosition';
import type { TemplateFolder } from '../../../domain/template-library';

interface Props {
  /** 鼠标右键的位置：面板从那里展开（**不是屏幕居中**，模态框不符合"我在哪点的就出现在哪"） */
  x: number;
  y: number;
  /** 全部文件夹（扁平表），组件自己按 `parentId` 分层 */
  folders: readonly TemplateFolder[];
  /** 条目当前所在文件夹：不列出来，移到自己身上没有意义 */
  currentFolderId: string | null;
  onPick: (folderId: string | null) => void;
  onClose: () => void;
}

/** 一层：列出某个父级下的文件夹；有子级的那一行 hover 时再弹一层 */
function Level({
  parentId,
  folders,
  currentFolderId,
  onPick
}: {
  parentId: string | null;
  folders: readonly TemplateFolder[];
  currentFolderId: string | null;
  onPick: (folderId: string | null) => void;
}) {
  /* 根层给一个「根目录」入口；更深层只列文件夹本身 */
  const rows = folders.filter((folder) => folder.parentId === parentId && folder.id !== currentFolderId);

  return (
    <div className="mm-template__picker-level">
      {parentId === null && currentFolderId !== null ? (
        <button type="button" className="mm-template__picker-item" onClick={() => onPick(null)}>
          根目录
        </button>
      ) : null}

      {rows.map((folder) => (
        <FolderRow
          key={folder.id}
          folder={folder}
          folders={folders}
          currentFolderId={currentFolderId}
          onPick={onPick}
        />
      ))}
    </div>
  );
}

/** 一行：点它 = 移进去；右侧有子级就 hover 弹下一层 */
function FolderRow({
  folder,
  folders,
  currentFolderId,
  onPick
}: {
  folder: TemplateFolder;
  folders: readonly TemplateFolder[];
  currentFolderId: string | null;
  onPick: (folderId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = folders.some((entry) => entry.parentId === folder.id);

  return (
    <div className="mm-template__picker-row" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="mm-template__picker-item" onClick={() => onPick(folder.id)}>
        <span className="mm-template__picker-name">{folder.name}</span>
        {hasChildren ? <Chevron open="static" /> : null}
      </button>

      {/* 子面板挂在这一行里面：鼠标移进去不算离开，不会闪 */}
      {open && hasChildren ? (
        <div className="mm-template__picker-level mm-template__picker-level--sub">
          <Level parentId={folder.id} folders={folders} currentFolderId={currentFolderId} onPick={onPick} />
        </div>
      ) : null}
    </div>
  );
}

export function FolderPicker({ x, y, folders, currentFolderId, onPick, onClose }: Props) {
  /* 定位与右键菜单同一个 hook：从**点击处**向下展开（不是屏幕居中）；子级再一路向右弹 */
  const { floatingRef, update } = useFloatingPosition({ placement: 'bottom-start' });

  useDismiss(true, floatingRef, onClose);

  /* 渲染后立刻定位，避免先出现在 (0,0) 再跳过去 */
  useLayoutEffect(() => {
    update({ x, y });
  }, [x, y, update]);

  return (
    <Portal>
      <div className="mm-popover mm-template__picker" ref={floatingRef} role="menu" aria-label="移动到">
        <div className="mm-template__picker-title">移动到</div>
        <Level parentId={null} folders={folders} currentFolderId={currentFolderId} onPick={onPick} />
      </div>
    </Portal>
  );
}
