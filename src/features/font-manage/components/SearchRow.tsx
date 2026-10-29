/**
 * 工具行：输入框（30px / 圆角 5）+ 放大镜（框内右侧）+ 漏斗触发器（框外右侧）+ 行尾插槽。
 * 漏斗角标 = 已选条件数；分类数据为空时禁用。
 *
 * 本页**没有标题行**，所以「更多」菜单也从 `trailing` 进来，与漏斗同一排（原版字体管理页如此）。
 */
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../../../components/icons';
import { Input } from '../../../components/ui';
import type { Category } from '../../../domain/classification';
import type { FilterState } from '../../../domain/font-filter';
import { useDismiss } from '../../../hooks/useDismiss';
import { useFloatingPosition } from '../../../hooks/useFloatingPosition';
import { FilterPanel } from './FilterPanel';

interface Props {
  keyword: string;
  onKeyword: (value: string) => void;
  categories: Category[];
  filterState: FilterState;
  onFilterChange: (next: FilterState) => void;
  /** 行尾插槽：本页的「更多」菜单落在这里，与漏斗同排 */
  trailing?: ReactNode;
}

export function SearchRow({
  keyword,
  onKeyword,
  categories,
  filterState,
  onFilterChange,
  trailing
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const { floatingRef, update } = useFloatingPosition({ placement: 'bottom-end' });

  useDismiss(open, floatingRef, () => setOpen(false), {
    inside: () => [triggerRef.current]
  });

  useLayoutEffect(() => {
    if (!open) return;
    update(triggerRef.current);
  }, [open, update]);

  const filterCount = Object.values(filterState).reduce((sum, ids) => sum + ids.length, 0);

  return (
    <div className="mm-u-row mm-font__search-row">
      <div className="mm-u-row mm-u-grow mm-font__search-box">
        <Input
          className="mm-u-grow mm-font__search-input"
          value={keyword}
          placeholder="搜索"
          aria-label="搜索字体"
          onChange={(event) => onKeyword(event.target.value)}
        />
        <Icon name="iconsousuo" className="mm-font__search-icon" />
      </div>

      <button
        ref={triggerRef}
        type="button"
        className={`mm-btn mm-font__filter-btn${filterCount ? ' mm-font__filter-btn--on' : ''}`}
        aria-label="筛选"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={!categories.length}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="iconguolv" />
        {filterCount ? <span className="mm-font__filter-badge">{filterCount}</span> : null}
      </button>

      {trailing}

      {open ? (
        <div ref={floatingRef} className="mm-popover mm-font__filter-float" role="dialog" aria-label="筛选">
          <FilterPanel categories={categories} state={filterState} onChange={onFilterChange} />
        </div>
      ) : null}
    </div>
  );
}
