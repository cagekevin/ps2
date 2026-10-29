/**
 * 按间距分布面板（原版 `comspacing`，`:37240` 一带）。
 *
 * 结构照原版：一行「间距输入 + 水平/垂直两颗图标按钮」→ 分隔线 → 一行两个单选
 * （按图层排序 / 按坐标排序）。两颗按钮分别对应 `handle(1)` / `handle(2)`，
 * 也就是 jsx 的第一个参数 `axis`。
 *
 * 参数**不落盘**：原版 `mode` 与 `width` 是组件自己的 data，不像导出配置要进 `sj_set.json`。
 * 默认间距 `10` 是原版初值（计划 §3.6）。
 */

import { useState } from 'react';
import { IconButton } from '../../../components/IconButton';
import { RadioButton } from '../../../components/RadioButton';
import { TextField } from '../../../components/TextField';
import { distribute } from '../../../commands/common-use';
import { useRunCommand } from '../../../hooks/useRunCommand';
import './panel.css';

/** 排序方式：1 按图层 / 2 按坐标（jsx 第三个参数） */
type SortMode = 1 | 2;

export function SpacingPanel() {
  const [gap, setGap] = useState('10');
  const [sortMode, setSortMode] = useState<SortMode>(1);
  /* 包 loading + 失败提示只有一处实现（`hooks/useRunCommand`） */
  const run = useRunCommand();

  function distributeTo(axis: 1 | 2): void {
    void run(() => distribute(axis, gap, sortMode));
  }

  return (
    <div className="mm-common__panel">
      <div className="mm-u-row mm-common__panel-row">
        <TextField
          variant="fill"
          title="间距"
          placeholder="10"
          inputMode="decimal"
          value={gap}
          onChange={setGap}
        />
        <span className="mm-common__panel-btn">
          <IconButton
            name="iconshuipingjuzhongfenbu"
            title="按间距水平分布"
            size={16}
            onClick={() => distributeTo(1)}
          />
        </span>
        <span className="mm-common__panel-btn">
          <IconButton
            name="iconchuizhijuzhongfenbu"
            title="按间距垂直分布"
            size={16}
            onClick={() => distributeTo(2)}
          />
        </span>
      </div>

      <div className="mm-common__panel-rule" />

      <div className="mm-u-row mm-common__panel-row">
        <RadioButton
          label="按图层排序"
          name="mm-common-spacing-sort"
          checked={sortMode === 1}
          onChange={() => setSortMode(1)}
        />
        <RadioButton
          label="按坐标排序"
          name="mm-common-spacing-sort"
          checked={sortMode === 2}
          onChange={() => setSortMode(2)}
        />
      </div>
    </div>
  );
}
