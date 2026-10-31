/**
 * 字体管理页的「更多」菜单：刷新字体列表 / 切换预览 / 导入导出标签。
 *
 * **只是按钮 + 菜单，不含页头**：本页没有标题行（原版字体管理页也没有），
 * 它由 `SearchRow` 的 `trailing` 插槽渲染，与筛选漏斗同一排。
 *
 * 图标 14：同一排有搜索框里的文字与漏斗图标，属「与文字同排」档（`CONVENTIONS` §7 规则 14），
 * 所以显式传 `mm-icon-btn--inline`；不传会落到纯图标条的 20，比同排文字还高。
 */
import { useState } from 'react';
import { ContextMenu, type MenuItem } from '../../../components/ContextMenu';
import { IconButton } from '../../../components/IconButton';
import { PREVIEW_LABEL, type PreviewMode } from '../../../store/font';

export type FontMenuAction = 'refresh' | 'preview' | 'import-tags' | 'export-tags';

interface Props {
  previewMode: PreviewMode;
  onMenuSelect: (action: FontMenuAction) => void;
}

export function FontMenu({ previewMode, onMenuSelect }: Props) {
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
    <>
      <IconButton
        name="icongengduocaidan"
        title="更多操作"
        className="mm-icon-btn--inline"
        ariaExpanded={!!anchor}
        /* 锚点取事件里的 currentTarget：这里只要一个锚点，不必为它再引一个 useRef
           （`IconButton` 现在也支持 ref，需要跨组件持有的场合用那个） */
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
    </>
  );
}
