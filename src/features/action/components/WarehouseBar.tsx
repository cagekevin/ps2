/**
 * 仓库条（原版 `wh` 组件，`05` §4 / §5）。
 *
 * 用公共件 `SelectBox`：**不自绘条与下拉皮肤**（深色一套，高度差登记在 A-8）。
 *
 * 三处容易搞混的地方（照 `05` §0.4 第 5 条）：
 *   1. 下拉里的「创建新分组」**新建的是仓库**，不是分组 —— 这里文案写成「新建仓库」，别照抄名字；
 *   2. 删除走 `onRemove`，和文档里的「最少保留一个分组哦」是同一个下限（删到只剩一个就拒）；
 *   3. 改名用 `InlineEdit`（`footer` 里就地进行），不改 `SelectBox` 内部。
 */

import { useState, type MouseEvent } from 'react';
import { InlineEdit } from '../../../components/InlineEdit';
import { SelectBox } from '../../../components/SelectBox';
import { Icon } from '../../../components/icons';
import { Button } from '../../../components/ui';
import type { WarehouseEntry } from '../../../domain/action-library';
import { ACTION_ICONS } from '../action-constants';
import './warehouse-bar.css';

interface Props {
  warehouses: WarehouseEntry[];
  /** 当前仓库下标 */
  currentIndex: number;
  onChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (name: string, value: string) => void;
  onRename: (name: string) => void;
}

export function WarehouseBar({ warehouses, currentIndex, onChange, onAdd, onRemove, onRename }: Props) {
  const [renaming, setRenaming] = useState(false);

  const options = warehouses.map((entry, at) => ({ value: String(at), label: entry.name }));
  const currentName = warehouses[currentIndex]?.name ?? '';

  /* 改名输入框要挡住冒泡：否则点进输入框会触发下拉项的选中 */
  function stop(event: MouseEvent<HTMLElement>): void {
    event.stopPropagation();
  }

  return (
    <div className="mm-action__warehouse">
      <SelectBox
        options={options}
        value={String(currentIndex)}
        onChange={onChange}
        icon={<Icon name={ACTION_ICONS.warehouse} />}
        onRemove={(value) => {
          const entry = warehouses[Number(value)];
          if (entry) onRemove(entry.name, value);
        }}
        footer={(close) => (
          <div className="mm-action__warehouse-footer" onMouseDown={stop}>
            {renaming ? (
              <InlineEdit
                value={currentName}
                onCommit={(next) => {
                  setRenaming(false);
                  onRename(next);
                }}
                onCancel={() => setRenaming(false)}
              />
            ) : (
              <Button
                className="mm-action__warehouse-action"
                title={'重命名当前仓库'}
                onClick={() => setRenaming(true)}
              >
                {'重命名当前仓库'}
              </Button>
            )}

            <Button
              className="mm-action__warehouse-action"
              title={'新建仓库'}
              onClick={() => {
                close();
                onAdd();
              }}
            >
              {'新建仓库'}
            </Button>
          </div>
        )}
      />
    </div>
  );
}
