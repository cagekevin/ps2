/**
 * 粘贴文字属性面板（原版 `pasteFont`）
 *
 * 6 个字段决定「粘贴时保留什么」：勾掉 = 该项在粘贴时置 null（不覆盖目标图层）。
 * 语义作用在 `commands/font-set.pasteFont`，这里只收集勾选状态。
 */

import { CheckBox } from '../../../components/CheckBox';
import type { PasteFontConfig } from '../../../domain/font-set';

interface Props {
  keeps: PasteFontConfig;
  onChange: (patch: Partial<PasteFontConfig>) => void;
  onReset: () => void;
}

const FIELDS: ReadonlyArray<{ key: keyof PasteFontConfig; label: string }> = [
  { key: 'scriptFamily', label: '字体' },
  { key: 'color', label: '颜色' },
  { key: 'opacity', label: '透明度' },
  { key: 'size', label: '字号' },
  { key: 'leading', label: '行距' },
  { key: 'tracking', label: '字间距' }
];

export function PasteFontPanel({ keeps, onChange, onReset }: Props) {
  return (
    <div className="mm-font-panel__panel mm-font-panel__paste">
      <div className="mm-font-panel__paste-row">
        {FIELDS.slice(0, 3).map((field) => (
          <CheckBox
            key={field.key}
            label={field.label}
            checked={keeps[field.key]}
            onChange={(value) => onChange({ [field.key]: value })}
          />
        ))}
      </div>
      <div className="mm-font-panel__paste-row">
        {FIELDS.slice(3).map((field) => (
          <CheckBox
            key={field.key}
            label={field.label}
            checked={keeps[field.key]}
            onChange={(value) => onChange({ [field.key]: value })}
          />
        ))}
      </div>
      <button type="button" className="mm-font-panel__wide-btn" onClick={onReset}>
        恢复默认
      </button>
    </div>
  );
}
