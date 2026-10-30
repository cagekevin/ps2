/**
 * 「添加动作」弹窗（原版 `addContext`，`05` §5 / §4.8 第 8 条）。
 *
 * 结构：PS 分组下拉 → 全选（带半选）→ 逐项勾选 → 取消 / 确定。
 *
 * 三处照原版：
 *   1. **切分组要换列表源**：`current` 默认 0，列表来自 `groups[current].children`，
 *      不是把所有动作摊平（摊平后同名动作分不清属于哪个组，加回库就串组）；
 *   2. 勾选的 key 是 `group|name`：同名动作可能出现在不同组，只按 name 去重会丢；
 *   3. 确定按钮在**没有勾选**时禁用（原版靠 disabled 而不是点了提示）。
 *
 * 空组提示用官方那句**带星号**的 `*该分组没有动作`（`05` §0.4 第 2 条：别和页面空态混用）。
 */

import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui';
import { CheckBox } from '../../../components/CheckBox';
import { SelectBox } from '../../../components/SelectBox';
import { MSG } from '../../../types/messages';
import type { ActionItem } from '../../../domain/action-library';
import './add-action-dialog.css';

interface Props {
  /** `listPsActions` 的结果（PS 分组 + 动作） */
  actions: ActionItem[];
  /** PS 里的分组名顺序（按第一次出现顺序，保持与 PS 面板一致） */
  onConfirm: (items: ActionItem[]) => void;
  onClose: () => void;
}

/** 勾选键：`group|name`（同名动作可能在不同组） */
function keyOf(item: ActionItem): string {
  return `${item.group}|${item.name}`;
}

export function AddActionDialog({ actions, onConfirm, onClose }: Props) {
  /** PS 分组名（按出现顺序） */
  const groups = useMemo(() => {
    const names: string[] = [];
    for (const item of actions) if (!names.includes(item.group)) names.push(item.group);
    return names;
  }, [actions]);

  const [current, setCurrent] = useState('0');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const groupIndex = Number(current);
  const groupName = groups[groupIndex] ?? groups[0] ?? '';
  const items = useMemo(
    () => actions.filter((item) => item.group === groupName),
    [actions, groupName]
  );

  const checkedCount = items.filter((item) => selected.has(keyOf(item))).length;
  const allChecked = items.length > 0 && checkedCount === items.length;
  const halfChecked = checkedCount > 0 && checkedCount < items.length;

  function toggleOne(item: ActionItem): void {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = keyOf(item);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /** 全选 / 取消全选：**只作用于当前分组**（切了组不该把上一组的勾选也带上） */
  function toggleAll(): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) for (const item of items) next.delete(keyOf(item));
      else for (const item of items) next.add(keyOf(item));
      return next;
    });
  }

  function submit(): void {
    onConfirm(actions.filter((item) => selected.has(keyOf(item))));
  }

  return (
    <div className="mm-modal-mask" role="dialog" aria-modal="true">
      <div className="mm-action-dialog">
        <div className="mm-modal__title">{'添加动作'}</div>

        <SelectBox
          options={groups.map((name, at) => ({ value: String(at), label: name }))}
          value={String(groupIndex)}
          onChange={setCurrent}
        />

        <CheckBox label={'全选'} checked={allChecked} indeterminate={halfChecked} onChange={toggleAll} />

        <div className="mm-action-dialog__list">
          {items.length ? (
            items.map((item) => (
              <CheckBox
                key={keyOf(item)}
                label={item.name}
                checked={selected.has(keyOf(item))}
                onChange={() => toggleOne(item)}
              />
            ))
          ) : (
            <div className="mm-action-dialog__empty">{MSG.action.emptyGroup}</div>
          )}
        </div>

        <div className="mm-action-dialog__footer">
          <Button className="mm-action-dialog__btn" onClick={onClose}>
            取消
          </Button>
          <Button
            className="mm-action-dialog__btn"
            disabled={selected.size === 0}
            onClick={submit}
          >
            确定
          </Button>
        </div>
      </div>
    </div>
  );
}
