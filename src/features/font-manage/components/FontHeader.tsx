/**
 * 字体管理页页头：标题 + 「更多」菜单（刷新 / 切换预览 / 导入导出）。
 *
 * 壳用公共件 `components/PageHeader`（40 高、深底、底部一条线），本文件只剩菜单业务。
 */
import { useState } from 'react';
import { ContextMenu, type MenuItem } from '../../../components/ContextMenu';
import { IconButton } from '../../../components/IconButton';
import { PageHeader } from '../../../components/PageHeader';
import { PREVIEW_LABEL, type PreviewMode } from '../../../store/font';

export type HeaderMenuAction = 'refresh' | 'preview' | 'import-tags' | 'export-tags';

interface Props {
  previewMode: PreviewMode;
  onMenuSelect: (action: HeaderMenuAction) => void;
}

export function FontHeader({ previewMode, onMenuSelect }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const items: MenuItem[] = [
    { label: '刷新字体列表', onSelect: () => onMenuSelect('refresh') },
    {
      label: `切换预览：${PREVIEW_LABEL[previewMode]}`,
      onSelect: () => onMenuSelect('preview')
    },
    { label: '', separator: true },
    { label: '导入标签', onSelect: () => onMenuSelect('import-tags') },
    { label: '导出标签', onSelect: () => onMenuSelect('export-tags') }
  ];

  return (
    <PageHeader title="我的字体">
      <IconButton
        name="icongengduocaidan"
        title="更多操作"
        /* 不传 size：图标跟着 `IconButton` 的默认 20，与字体面板 / 常用页的同类按钮同一尺寸 */
        ariaExpanded={!!anchor}
        /* 锚点取事件里的 currentTarget：`IconButton` 不转发 ref，只把原始事件交出来 */
        onClick={(event) =>
          setAnchor((current) => (current ? null : event.currentTarget))
        }
      />

      {anchor ? (
        <ContextMenu
          anchor={anchor}
          items={items}
          inside={() => [anchor]}
          onClose={() => {
            setAnchor(null);
          }}
        />
      ) : null}
    </PageHeader>
  );
}
