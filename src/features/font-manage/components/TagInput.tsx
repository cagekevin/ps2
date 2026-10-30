/**
 * 标签名输入框（原版 `font-manage__tag__input`）。
 * TagMenu（浅色浮层里）与 TagCreator（深色弹窗里）共用同一份，
 * 输入位的底与文字色由**所在表面**声明（`STYLE.md` §7 规则 15 + 规则 19），这里不区分。
 */
import { Input } from '../../../components/ui';
import { enterSubmit } from '../../../hooks/input-method-enter';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  placeholder?: string;
  maxLength?: number;
  clearable?: boolean;
  autoFocus?: boolean;
}

export function TagInput({
  value,
  onChange,
  onEnter,
  placeholder = '标签名称不超过8个字',
  maxLength = 8,
  clearable = true,
  autoFocus = false
}: Props) {
  return (
    <div className="mm-font__tag-input">
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
