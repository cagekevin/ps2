/** 筛选面板：按 categories 顺序渲染。**没有「全部」项** —— 清空某一组就是把它已选的逐个点掉
 *  （每个 chip 都是 toggle）；一个组里只有具体选项，不再混一个同名的「全部」（2026-10-31 用户裁定） */
import type { Category, CategoryTag } from '../../../domain/classification';
import type { FilterState } from '../../../domain/font-filter';

interface Props {
  categories: Category[];
  state: FilterState;
  onChange: (next: FilterState) => void;
}

function isOn(state: FilterState, category: string, id: number): boolean {
  return (state[category] ?? []).includes(id);
}

function label(tag: CategoryTag): string {
  if (tag.icon === 'star_fill') return '★'.repeat(tag.repeat ?? 1);
  return tag.name ?? String(tag.id);
}

export function FilterPanel({ categories, state, onChange }: Props) {
  function toggle(category: string, id: number): void {
    const current = state[category] ?? [];
    const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    onChange({ ...state, [category]: next });
  }

  return (
    <div className="mm-u-col">
      {categories.map((group) => {
        return (
          <section key={group.key} className="mm-font__filter-group">
            <div className="mm-font__filter-title">{group.name}</div>
            <div className="mm-font__filter-chips">
              {group.tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`mm-chip${isOn(state, group.key, tag.id) ? ' mm-chip--on' : ''}`}
                  onClick={() => toggle(group.key, tag.id)}
                >
                  {label(tag)}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
