/** 自定义预览文案：字号图标 + 输入框 + 应用；空值按钮置灰 */
import { useState } from 'react';
import { Icon } from '../../../components/icons';
import { Input } from '../../../components/ui';
import { isImeEnter } from '../ime';

interface Props {
  current: string;
  onApply: (value: string) => void;
}

export function PreviewText({ current, onApply }: Props) {
  const [text, setText] = useState(current);
  const canApply = text.trim().length > 0;

  function apply(): void {
    if (!canApply) return;
    onApply(text.trim());
  }

  return (
    <div className="mm-font__preview-text">
      <Icon name="iconzihaodaxiao1" size={16} className="mm-font__preview-text-icon" />
      <Input
        className="mm-font__preview-text-field"
        value={text}
        placeholder="请输入预览文案"
        autoFocus
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !isImeEnter(event)) apply();
        }}
      />
      <button
        type="button"
        className="mm-font__preview-text-btn"
        disabled={!canApply}
        onClick={apply}
      >
        应用
      </button>
    </div>
  );
}
