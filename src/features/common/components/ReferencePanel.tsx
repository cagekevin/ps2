/**
 * 参考线工具面板（原版 `comreference`，`:37097` 一带）。
 *
 * v1 三个动作，与原版一致：输入宽度 → 生成安全区；清除参考线；基于参考线切片。
 * 宽度空值在前端拦（原版 `useGuide` 也是先判空再发 jsx，提示「请输入宽度」）。
 *
 * **「开启智能参考线」勾选框不在 v1**：它要 `Tool_set(["marqueeSingleRowTool"])` +
 * PS 事件 `1936028772` 才算完整，计划 §4.2 排到 v2。这里不渲染半个开关。
 */

import { useState } from 'react';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/ui';
import { clearGuide, referenceWidth, sliceByGuide } from '../../../commands/common-use';
import { useRunCommand } from '../../../hooks/useRunCommand';
import './panel.css';

export function ReferencePanel() {
  const [width, setWidth] = useState('20');
  /* 包 loading + 失败提示只有一处实现（`hooks/useRunCommand`） */
  const run = useRunCommand();

  return (
    <div className="mm-common__panel">
      <div className="mm-common__panel-row">
        <TextField
          variant="fill"
          title="参考线宽度"
          placeholder="20"
          inputMode="decimal"
          value={width}
          onChange={setWidth}
        />
        <Button className="mm-common__panel-btn" onClick={() => void run(() => referenceWidth(width))}>
          应用
        </Button>
      </div>

      <div className="mm-common__panel-rule" />

      <div className="mm-common__panel-row">
        <Button
          className="mm-common__panel-btn mm-common__panel-btn--half"
          onClick={() => void run(clearGuide)}
        >
          清除参考线
        </Button>
        <Button
          className="mm-common__panel-btn mm-common__panel-btn--half"
          onClick={() => void run(sliceByGuide)}
        >
          基于参考线切片
        </Button>
      </div>
    </div>
  );
}
