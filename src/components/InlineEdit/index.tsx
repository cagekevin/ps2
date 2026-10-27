/**
 * 【范本】内联重命名输入框
 *
 * 用于列表项就地改名：Enter 确认、Esc 取消、失焦确认。
 * 不用 window.prompt（CEP 里样式不可控、阻塞主线程）。
 *
 * Enter 与失焦会先后触发，内部用 ref 保证只提交一次。
 */

import { useEffect, useRef, useState } from 'react';
import { Input, stopClickPropagation } from '../ui';
import './inline-edit.css';

interface InlineEditProps {
  value: string;
  onCommit: (next: string) => void;
  onCancel: () => void;
}

export function InlineEdit({ value, onCommit, onCancel }: InlineEditProps) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const committed = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function commit(next: string) {
    if (committed.current) return;
    committed.current = true;

    const text = next.trim();
    if (!text || text === value) {
      onCancel();
      return;
    }
    onCommit(text);
  }

  return (
    <Input
      ref={inputRef}
      className="mm-inline-edit"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit(draft);
        else if (event.key === 'Escape') onCancel();
      }}
      onBlur={() => commit(draft)}
      /* 避免点击输入框触发外层的选中/展开（同上：挡一次冒泡） */
      onClick={stopClickPropagation}
    />
  );
}
