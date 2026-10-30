/**
 * 参考线工具面板（原版 `comreference`，`:37097` 一带）。
 *
 * v1 三个动作，与原版一致：输入宽度 → 生成安全区；清除参考线；基于参考线切片。
 * 宽度空值在前端拦（原版 `useGuide` 也是先判空再发 jsx，提示「请输入宽度」）。
 *
 * v2 补上最上面那一行「开启智能参考线」：勾选 → `commands.toggleSmartGuide(true)`
 * 切 PS 的参考线工具并把 `store.guideOn` 置真；真正的订阅在 `app/common-use-watcher`
 * （页面不订阅 PS 事件，`CONVENTIONS` §4.8），拖出参考线时它调 `cy_smartReferenceLine`。
 *
 * 「使用后请关闭」是官方文案的一部分，别删：开关开着时 PS 一直处于单行参考线工具，
 * 用户会以为画布操作坏了。
 */

import { useState } from 'react';
import { CheckBox } from '../../../components/CheckBox';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/ui';
import {
  clearGuide,
  referenceWidth,
  sliceByGuide,
  toggleSmartGuide
} from '../../../commands/common-use';
import { useRunCommand } from '../../../hooks/useRunCommand';
import { useCommonUseStore } from '../../../store/common-use';
import './panel.css';

export function ReferencePanel() {
  const [width, setWidth] = useState('20');
  /* 开关本身是界面状态（不落盘），真值在 store：watcher 要按它订阅 / 退订事件 */
  const guideOn = useCommonUseStore((state) => state.guideOn);
  /* 包 loading + 失败提示只有一处实现（`hooks/useRunCommand`） */
  const run = useRunCommand();

  return (
    <div className="mm-common__panel">
      <CheckBox
        label={'开启智能参考线(使用后请关闭)'}
        title={'开启后，点击即可生成参考线'}
        checked={guideOn}
        onChange={(value) => void run(() => toggleSmartGuide(value))}
      />

      <div className="mm-common__panel-rule" />

      <div className="mm-u-row mm-common__panel-row">
        <TextField
          variant="fill"
          title={'参考线宽度'}
          placeholder="20"
          inputMode="decimal"
          value={width}
          onChange={setWidth}
        />
        <Button
          className="mm-common__panel-btn"
          title={'在文档中间安全区域生成2条参考线'}
          onClick={() => void run(() => referenceWidth(width))}
        >
          应用
        </Button>
      </div>

      <div className="mm-common__panel-rule" />

      <div className="mm-btn-grid mm-common__panel-row--pair">
        <Button
          className="mm-common__panel-btn"
          onClick={() => void run(clearGuide)}
        >
          清除参考线
        </Button>
        <Button
          className="mm-common__panel-btn"
          onClick={() => void run(sliceByGuide)}
        >
          基于参考线切片
        </Button>
      </div>
    </div>
  );
}
