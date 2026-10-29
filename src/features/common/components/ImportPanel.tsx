/**
 * 导入多图片面板（原版 `comimport`，`app.v4.js:35909`）。
 *
 * 原版只有**一行**勾选（`.import-wrap` 因此定高 40）；导入动作本身在父组件的
 * 网格格子上（`cy_importMultipleImage` 前先弹选图），面板里没有按钮。
 *
 * 高度 40 不复刻：整页控件高度只有 `--mm-control-h` 一档（`03` §0.5「尺寸只许引用已有 token」），
 * 面板高度由内容撑开。
 */

import { CheckBox } from '../../../components/CheckBox';
import { setOption } from '../../../commands/common-use';
import { booleanOptionOf } from '../../../domain/common-use-options';
import { useRunCommand } from '../../../hooks/useRunCommand';
import { useCommonUseStore } from '../../../store/common-use';
import './panel.css';

export function ImportPanel() {
  const options = useCommonUseStore((state) => state.options);
  const run = useRunCommand();

  return (
    <div className="mm-common__panel">
      <CheckBox
        label={'转成链接智能对象'}
        checked={booleanOptionOf(options, 'cyImportToLinkObject')}
        onChange={(value) =>
          void run(() => setOption('cyImportToLinkObject', value), { spin: false })
        }
      />
    </div>
  );
}
