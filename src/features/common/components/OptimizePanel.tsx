/**
 * 优化文档面板（原版 `comoptimization`，`app.v4.js:35937`）。
 *
 * 三个开关 + 一个整宽按钮「批量优化文档」。
 *
 * 与导出面板的批量不同：**官方这里没有 `>30` 确认**（`:36014` 的循环直接跑），
 * 确认只属于导出面板的批量 PSD（`13-常用-V2` §5.3），别搬过来。
 *
 * 进度遮罩由命令层给（`loading.show('正在优化文档：N/M')`，文案是栈），
 * 所以这里 `spin: false`——再包一层只会闪一下默认文案。
 */

import { CheckBox } from '../../../components/CheckBox';
import { MSG } from '../../../domain/messages';
import { Button } from '../../../components/ui';
import { optimizeFolder, setOption } from '../../../commands/common-use';
import { booleanOptionOf, type CommonUseBooleanKey } from '../../../domain/common-use-options';
import { useRunCommand } from '../../../hooks/useRunCommand';
import { useCommonUseStore } from '../../../store/common-use';
import './panel.css';

export function OptimizePanel() {
  const options = useCommonUseStore((state) => state.options);
  const run = useRunCommand();

  function setBoolean(key: CommonUseBooleanKey, value: boolean): void {
    void run(() => setOption(key, value), { spin: false });
  }

  return (
    <div className="mm-common__panel">
      <CheckBox
        label={MSG.common.optimizeAll}
        checked={booleanOptionOf(options, 'cyOptimizeAll')}
        onChange={(value) => setBoolean('cyOptimizeAll', value)}
      />
      <CheckBox
        label={MSG.common.deleteEmpty}
        checked={booleanOptionOf(options, 'cyOptimizeDeleteAllEmpty')}
        onChange={(value) => setBoolean('cyOptimizeDeleteAllEmpty', value)}
      />
      <CheckBox
        label={MSG.common.deleteHidden}
        checked={booleanOptionOf(options, 'cyOptimizeDeleteAllHide')}
        onChange={(value) => setBoolean('cyOptimizeDeleteAllHide', value)}
      />

      <Button
        className="mm-common__panel-btn"
        title={MSG.common.batchOptimize}
        onClick={() => void run(optimizeFolder, { spin: false })}
      >
        {MSG.common.batchOptimize}
      </Button>
    </div>
  );
}
