/** 自定义预览文案：字号图标 + 输入框 + 应用；空值按钮置灰 */
import { useState } from 'react';
import { Icon } from '../../../components/icons';
import { Button, Input } from '../../../components/ui';
import { enterSubmit } from '../../../hooks/input-method-enter';

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
      <Icon name="iconzihaodaxiao1" className="mm-font__preview-text-icon" />
      <Input
        className="mm-font__preview-text-field"
        value={text}
        placeholder="请输入预览文案"
        autoFocus
        onChange={(event) => setText(event.target.value)}
        onKeyDown={enterSubmit(apply)}
      />
      <Button
        
        disabled={!canApply}
        onClick={apply}
      >
        应用
      </Button>
    </div>
  );
}
