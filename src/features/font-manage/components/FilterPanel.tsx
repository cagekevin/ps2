/** 筛选面板：按 categories 顺序渲染，每组第一项「全部」清空该组 */
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
        const allOff = (state[group.key] ?? []).length === 0;

        return (
          <section key={group.key} className="mm-font__filter-group">
            <div className="mm-font__filter-title">{group.name}</div>
            <div className="mm-font__filter-chips">
              {group.extraTag ? (
                <button
                  type="button"
                  className={`mm-chip${allOff ? ' mm-chip--on' : ''}`}
                  onClick={() => onChange({ ...state, [group.key]: [] })}
                >
                  全部
                </button>
              ) : null}
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
