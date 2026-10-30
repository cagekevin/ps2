/**
 * 嵌入图片面板（原版 `comembed`，`app.v4.js:35732` 一带）。
 *
 * 结构逐条照 `13-常用-V2` §1.1-A：三勾选 → 分隔线 → 三单选（`cyLinkObject` 用**数值** -1/1/2）
 * → 勾选「删除下一图层」→ 分隔线 → 勾选「拖入转链接」→ 分隔线 → 两个半宽按钮。
 * 文案全部是官方逐字，**不要改标点**（半角括号、`(与PSD同一目录)`）。
 *
 * 面板只改设置（`setOption`）与转调两个命令，不自己读写文件、不自己弹提示：
 * 失败提示与留痕由 `useRunCommand` 一处给（`CONVENTIONS` §4.8 / §9）。
 */

import { CheckBox } from '../../../components/CheckBox';
import { RadioButton } from '../../../components/RadioButton';
import { Button } from '../../../components/ui';
import {
  linkSmartObjectToSmartObject,
  setOption,
  toLinkSmartObject
} from '../../../commands/common-use';
import {
  booleanOptionOf,
  linkObjectOf,
  LINK_OBJECT_VALUES,
  type CommonUseBooleanKey,
  type LinkObjectValue
} from '../../../domain/common-use-options';
import { MSG } from '../../../types/messages';
import { useRunCommand } from '../../../hooks/useRunCommand';
import { useCommonUseStore } from '../../../store/common-use';
import './panel.css';

/** `cyLinkObject` 三档的逐字文案，顺序与官方一致（-1 / 1 / 2） */
const LINK_OBJECT_LABELS: Record<LinkObjectValue, string> = {
  '-1': '嵌入时不存链接对象',
  '1': '嵌入时存链接对象(图片原始路径)',
  '2': '嵌入时存链接对象(与PSD同一目录)'
};

export function EmbedPanel() {
  const options = useCommonUseStore((state) => state.options);
  const run = useRunCommand();

  /** 开关类设置：瞬时、无遮罩（`spin: false`），失败仍由 hook 出提示并留痕 */
  function setBoolean(key: CommonUseBooleanKey, value: boolean): void {
    void run(() => setOption(key, value), { spin: false });
  }

  function setLinkObject(value: LinkObjectValue): void {
    void run(() => setOption('cyLinkObject', value), { spin: false });
  }

  return (
    <div className="mm-common__panel">
      <CheckBox
        label={'拖入图片自动嵌入图片'}
        checked={booleanOptionOf(options, 'cyDragInAutoEmbed')}
        onChange={(value) => setBoolean('cyDragInAutoEmbed', value)}
      />
      <CheckBox
        label={'粘贴图片自动嵌入图片'}
        checked={booleanOptionOf(options, 'cyPasetImageAutoEmbed')}
        onChange={(value) => setBoolean('cyPasetImageAutoEmbed', value)}
      />
      <CheckBox
        label={'使用剪贴蒙版时自动嵌入图片'}
        checked={booleanOptionOf(options, 'cyClipMaskAutoEmbed')}
        onChange={(value) => setBoolean('cyClipMaskAutoEmbed', value)}
      />

      <div className="mm-common__panel-rule" />

      {LINK_OBJECT_VALUES.map((value) => (
        <RadioButton
          key={value}
          name="mm-common-link-object"
          label={LINK_OBJECT_LABELS[value]}
          checked={linkObjectOf(options) === value}
          onChange={() => setLinkObject(value)}
        />
      ))}

      <CheckBox
        label={'删除下一图层'}
        checked={booleanOptionOf(options, 'cyDeleteNext')}
        onChange={(value) => setBoolean('cyDeleteNext', value)}
      />

      <div className="mm-common__panel-rule" />

      <CheckBox
        label={'拖入图片转成链接智能对象'}
        checked={booleanOptionOf(options, 'cyOpenDranInToLinkObject')}
        onChange={(value) => setBoolean('cyOpenDranInToLinkObject', value)}
      />

      <div className="mm-common__panel-rule" />

      <div className="mm-common__panel-row mm-common__panel-row--pair">
        <Button
          className="mm-common__panel-btn"
          onClick={() => void run(toLinkSmartObject, { tip: MSG.common.progressLinkSmart })}
        >
          转链接智能对象
        </Button>
        <Button
          className="mm-common__panel-btn"
          onClick={() =>
            void run(linkSmartObjectToSmartObject, { tip: MSG.common.progressLinkBack })
          }
        >
          转智能对象
        </Button>
      </div>
    </div>
  );
}
