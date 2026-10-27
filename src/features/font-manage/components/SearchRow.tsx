/**
 * 搜索行：输入框（30px / 圆角 5）+ 放大镜（框内右侧）+ 漏斗触发器（框外右侧）。
 * 漏斗角标 = 已选条件数；分类数据为空时禁用。
 */
import { useLayoutEffect, useRef, useState } from 'react';
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
}

export function SearchRow({
  keyword,
  onKeyword,
  categories,
  filterState,
  onFilterChange
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
    <div className="mm-font__search-row">
      <div className="mm-font__search-box">
        <Input
          className="mm-font__search-input"
          value={keyword}
          placeholder="搜索"
          aria-label="搜索字体"
          onChange={(event) => onKeyword(event.target.value)}
        />
        <Icon name="iconsousuo" size={14} className="mm-font__search-icon" />
      </div>

      <button
        ref={triggerRef}
        type="button"
        className={`mm-font__filter-btn${filterCount ? ' mm-font__filter-btn--on' : ''}`}
        aria-label="筛选"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={!categories.length}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="iconguolv" size={16} />
        {filterCount ? <span className="mm-font__filter-badge">{filterCount}</span> : null}
      </button>

      {open ? (
        <div ref={floatingRef} className="mm-font__filter-float" role="dialog" aria-label="筛选">
          <FilterPanel categories={categories} state={filterState} onChange={onFilterChange} />
        </div>
      ) : null}
    </div>
  );
}
