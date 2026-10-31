/**
 * 模板库 · 子文件夹格。
 *
 * 与条目卡同一个网格、同一尺寸（`STYLE` 规则 9：同类同尺寸）。
 *
 * 三个细节：
 *   - 图标用 `iconwenjianjiaguanli`：这是仓里**已经在表示「目录」**的那个（`ExportPanel` 的
 *     「选择目录」同款）。`iconwenjianjiamulu` 是带箭头的目录树形状，当文件夹图标不像。
 *   - 条目数做成**缩略图右下角的角标**，不占卡片正文那一行。
 *   - 没有缩略图 ⇒ **不留衬底**（那块深色是给图片 letterbox 垫的，没图片时就是一块割裂的黑块）。
 */
import { Icon } from '../../../components/icons';
import type { TemplateFolder } from '../../../domain/template-library';

interface Props {
  folder: TemplateFolder;
  count: number;
  onEnter: () => void;
  onMenu: (x: number, y: number) => void;
  /** 接住「拖进来的条目」（模板库私有拖拽，见 `useTemplateDrag`） */
  dropProps: {
    onDragOver: (event: React.DragEvent<HTMLElement>) => void;
    onDrop: (event: React.DragEvent<HTMLElement>) => void;
  };
}

export function FolderCard({ folder, count, onEnter, onMenu, dropProps }: Props) {
  return (
    <div
      className="mm-template__card"
      {...dropProps}
      onContextMenu={(event) => {
        event.preventDefault();
        onMenu(event.clientX, event.clientY);
      }}
    >
      <button
        type="button"
        className="mm-template__thumb mm-template__thumb--plain"
        onClick={onEnter}
        title={`进入「${folder.name}」`}
      >
        <Icon name="iconwenjianjiaguanli" className="mm-template__icon" />
        <span className="mm-template__badge" title={`${count} 个模板`}>
          {count}
        </span>
      </button>
      <span className="mm-template__name" title={folder.name}>
        {folder.name}
      </span>
    </div>
  );
}
