/**
 * 模板库 · 条目卡。
 *
 * 单击 = 应用（M3 接了），眼睛 = 看大图，右键 = 菜单（重命名 / 编辑源文件 / 更新预览 / 移动 / 删除）。
 * 缩略图缺失时画虚线占位，不留破图 —— 破图会让人以为文件坏了，其实只是预览没生成。
 *
 * 拖拽只挂了原生 `draggable`（由页面私有的 `useTemplateDrag` 给 props）：
 * 这份拖拽**不对外**，别把它抄成通用件（见 `useTemplateDrag` 文件头）。
 */
import { useState } from 'react';
import { IconButton } from '../../../components/IconButton';
import type { TemplateItem } from '../../../domain/template-library';
import { templateThumbUrl } from '../../../repo/template-repo';

interface Props {
  item: TemplateItem;
  /** 破缓存版本号：更新预览图后 +1，`<img>` 地址跟着变就会重载 */
  version: number;
  /** 刚存进来的那条（2s 内亮一下，让用户看见落点） */
  highlighted: boolean;
  /** 正在被拖（视觉弱化一点，让拖的那个「跟着手走」的感觉成立） */
  dragging: boolean;
  onApply: () => void;
  onPreview: () => void;
  onMenu: (x: number, y: number) => void;
  dragProps: {
    draggable: true;
    onDragStart: (event: React.DragEvent<HTMLElement>) => void;
    onDragEnd: () => void;
  };
}

export function TemplateCard({
  item,
  version,
  highlighted,
  dragging,
  onApply,
  onPreview,
  onMenu,
  dragProps
}: Props) {
  const [broken, setBroken] = useState(false);
  const src = `${templateThumbUrl(item.id, item.file)}?t=${version}`;

  const className = [
    'mm-template__card',
    highlighted ? 'mm-template__card--new' : '',
    dragging ? 'mm-template__card--dragging' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      data-item-id={item.id}
      {...dragProps}
      onContextMenu={(event) => {
        event.preventDefault();
        onMenu(event.clientX, event.clientY);
      }}
    >
      <div className="mm-template__media">
        <button type="button" className="mm-template__thumb" onClick={onApply} title={`${item.name}（点击应用）`}>
          {broken ? (
            <span className="mm-template__missing" />
          ) : (
            <img
              src={src}
              alt={item.name}
              title={`${item.width} × ${item.height}`}
              onError={() => setBroken(true)}
            />
          )}
        </button>
        <IconButton
          name="iconxianshi"
          title="查看大图"
          className="mm-icon-btn--inline mm-template__eye"
          onClick={onPreview}
        />
      </div>
      <span className="mm-template__name" title={item.name}>
        {item.name}
      </span>
    </div>
  );
}
