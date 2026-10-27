/**
 * 数字输入（原版 `baseInputMore`）
 *
 * 交互边界：
 *   - Enter / 失焦提交；输入法选词时的 Enter 不算提交（判据在 `hooks/input-method-enter`）
 *   - 每个数字框有本地草稿，回填规则统一在 `hooks/useDraft`（不在组件里各写一份）
 *   - 不在组件里挂 document 监听（拖动改值那套要全局 mousemove，§4.8 不允许写进 feature）
 */

import { Icon, type IconName } from '../../../components/icons';
import { Input } from '../../../components/ui';
import { useDraft } from '../../../hooks/useDraft';
import { enterSubmit } from '../../../hooks/input-method-enter';

interface Props {
  value: string;
  title?: string;
  /** 左侧拖拽/类型图标 */
  icon?: IconName;
  /** 右侧单位（像素 / 点 / 毫米） */
  suffix?: string;
  min?: number;
  max?: number;
  /** 预设面板是否展开（只影响箭头方向，开关状态由外层 `IconPanel` 持有） */
  presetOpen?: boolean;
  onCommit: (value: number) => void;
  /** 有预设档位时显示箭头；不传则不显示 */
  onPreset?: () => void;
}

function clamp(value: number, min?: number, max?: number): number {
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
}

export function NumberField({
  value,
  title,
  icon,
  suffix,
  min,
  max,
  presetOpen = false,
  onCommit,
  onPreset
}: Props) {
  /* 外部值变了才回填（切图层 / 读回属性），用户正在输入的草稿不被覆盖 */
  const { draft: text, setDraft, resetDraft } = useDraft(value, (current) => current);

  function commit(): void {
    /* 原版 `setFontFormat` 用 `parseFloat`（`app.v4.js:1412424`）：只取前面的数字，
       "12 点" / "12px" 都能提交；"(自动)" 取不到数字 → 回退，不当成 0 去改文档 */
    const parsed = Number.parseFloat(text.trim());
    if (!Number.isFinite(parsed)) {
      resetDraft();
      return;
    }
    const next = clamp(parsed, min, max);
    setDraft(String(next));
    onCommit(next);
  }

  return (
    <div className="mm-font-panel__number" title={title}>
      {icon ? (
        <span className="mm-font-panel__number-icon">
          <Icon name={icon} size={16} />
        </span>
      ) : null}

      <span className="mm-font-panel__number-box">
        <Input
          className="mm-font-panel__number-input"
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={enterSubmit(commit)}
        />
        {suffix ? <span className="mm-font-panel__number-suffix">{suffix}</span> : null}
        {onPreset ? (
          <button
            type="button"
            className={`mm-font-panel__number-caret${
              presetOpen ? ' mm-font-panel__number-caret--open' : ''
            }`}
            title="预设"
            aria-label="预设"
            aria-expanded={presetOpen}
            onClick={onPreset}
          >
            <Icon name="iconxiala" size={8} />
          </button>
        ) : null}
      </span>
    </div>
  );
}
