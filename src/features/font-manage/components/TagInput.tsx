/**
 * 标签名输入框（原版 `font-manage__tag__input`）。
 * TagMenu 与 TagCreator 共用一份；两套视觉只差 class。
 */
import { Input } from '../../../components/ui';
import { enterSubmit } from '../../../hooks/input-method-enter';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  variant?: 'menu' | 'modal';
  placeholder?: string;
  maxLength?: number;
  clearable?: boolean;
  autoFocus?: boolean;
}

export function TagInput({
  value,
  onChange,
  onEnter,
  variant = 'menu',
  placeholder = '标签名称不超过8个字',
  maxLength = 8,
  clearable = true,
  autoFocus = false
}: Props) {
  return (
    <div className={`mm-font__tag-input mm-font__tag-input--${variant}`}>
      <Input
        className="mm-font__tag-field"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={enterSubmit(onEnter)}
      />
      {clearable && value ? (
        <button
          type="button"
          className="mm-font__tag-clear"
          aria-label="清空输入"
          onClick={() => onChange('')}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
