/**
 * 生成按钮面板（原版 `btnCom`）
 *
 * 任何一项改动都立即重新生成（原版是 `watch`）：所以每个交互都是「先改配置，再 apply」。
 * 配置的落盘由页面负责，这里只抛 patch。
 */

import { CheckBox } from '../../../components/CheckBox';
import { RadioButton } from '../../../components/RadioButton';
import { Input } from '../../../components/ui';
import { useDraft } from '../../../hooks/useDraft';
import { enterSubmit } from '../../../hooks/input-method-enter';
import type { CreateButtonConfig } from '../../../domain/font-set';
import { CREATE_BUTTON_PADDINGS, CREATE_BUTTON_PRESETS } from '../font-panel-constants';

interface Props {
  config: CreateButtonConfig;
  onChange: (patch: Partial<CreateButtonConfig>) => void;
  onApply: () => void;
}

export function CreateButtonPanel({ config, onChange, onApply }: Props) {
  /* 外部配置变了才回填（规则在 `hooks/useDraft`，不在组件里各写一份） */
  const { draft: padding, setDraft } = useDraft(config.padding, (current) => current);

  function commitPadding(next: string): void {
    const text = next.trim();
    if (!text) return;
    setDraft(text);
    onChange({ padding: text });
    onApply();
  }

  function pickType(type: 1 | 2): void {
    onChange({ type });
    onApply();
  }

  function pickLine(value: boolean): void {
    onChange({ isLine: value });
    onApply();
  }

  return (
    <div className="mm-font-panel__panel mm-font-panel__create">
      <div className="mm-font-panel__row">
        <RadioButton
          label="圆角"
          name="mm-font-panel-button-type"
          title="生成圆角矩形"
          checked={config.type === 1}
          onChange={() => pickType(1)}
        />
        <RadioButton
          label="直角"
          name="mm-font-panel-button-type"
          title="生成直角矩形"
          checked={config.type === 2}
          onChange={() => pickType(2)}
        />
        <CheckBox
          label="线框"
          title="生成线框矩形"
          checked={config.isLine}
          onChange={pickLine}
        />
      </div>

      <div className="mm-font-panel__row mm-font-panel__row--pad">
        <p className="mm-font-panel__label" title="形状内边距，10,5 表示 宽=10 高=5">
          自定义边距
        </p>
        <Input
          variant="page"
          className="mm-font-panel__input-grow"
          value={padding}
          placeholder="10,20"
          title="支持表达式，详细请看帮助文档"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commitPadding(padding)}
          onKeyDown={enterSubmit(() => commitPadding(padding))}
        />
      </div>

      <div className="mm-font-panel__row mm-font-panel__row--tight">
        <p className="mm-font-panel__label">预设</p>
        {CREATE_BUTTON_PADDINGS.map((value) => (
          <button
            key={value}
            type="button"
            className="mm-font-panel__preset-btn"
            title={`内边距 ${value}`}
            onClick={() => commitPadding(value)}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="mm-font-panel__quick-grid">
        {CREATE_BUTTON_PRESETS.map((value) => (
          <button
            key={value}
            type="button"
            className="mm-font-panel__quick-btn"
            title={`预设样式${value}`}
            onClick={() => commitPadding(`自动生成${value}`)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
