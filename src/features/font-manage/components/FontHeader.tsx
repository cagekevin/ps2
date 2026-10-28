/**
 * 字体管理页页头：标题 + 「更多」菜单（刷新 / 切换预览 / 导入导出）。
 *
 * 壳用公共件 `components/PageHeader`（40 高、深底、底部一条线），本文件只剩菜单业务。
 */
import { useRef, useState } from 'react';
import { ContextMenu, type MenuItem } from '../../../components/ContextMenu';
import { Icon } from '../../../components/icons';
import { PageHeader } from '../../../components/PageHeader';
import { PREVIEW_LABEL, type PreviewMode } from '../../../store/font';

export type HeaderMenuAction = 'refresh' | 'preview' | 'import-tags' | 'export-tags';

interface Props {
  previewMode: PreviewMode;
  onMenuSelect: (action: HeaderMenuAction) => void;
}

export function FontHeader({ previewMode, onMenuSelect }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

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
      <button
        ref={buttonRef}
        type="button"
        className="mm-font__icon-btn"
        aria-label="更多操作"
        aria-haspopup="menu"
        onClick={() => setAnchor((current) => (current ? null : buttonRef.current))}
      >
        <Icon name="icongengduocaidan" size={16} />
      </button>

      {anchor ? (
        <ContextMenu
          anchor={anchor}
          items={items}
          inside={() => [buttonRef.current]}
          onClose={() => {
            setAnchor(null);
          }}
        />
      ) : null}
    </PageHeader>
  );
}
