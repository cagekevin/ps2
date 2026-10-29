/**
 * 字体标签弹层：标题 / 输入框 / 已添加的标签(N) / 全部(N)。
 * 输入已有标签 = 挂/摘，输入新标签 = 新建。
 */
import { useLayoutEffect, useMemo, useState } from 'react';
import { Portal } from '../../../components/Portal';
import type { FontTag } from '../../../domain/font-meta';
import { useDismiss } from '../../../hooks/useDismiss';
import { useFloatingPosition } from '../../../hooks/useFloatingPosition';
import { TagChip } from './TagChip';
import { TagInput } from './TagInput';

interface Props {
  x: number;
  y: number;
  tags: FontTag[];
  active: string[];
  onToggle: (text: string) => void;
  onCreate: (text: string) => void;
  onClose: () => void;
}

export function TagMenu({ x, y, tags, active, onToggle, onCreate, onClose }: Props) {
  const [keyword, setKeyword] = useState('');
  const { floatingRef, update } = useFloatingPosition({ placement: 'bottom-start' });

  useDismiss(true, floatingRef, onClose);

  useLayoutEffect(() => {
    update({ x, y });
  }, [x, y, update]);

  const activeSet = useMemo(() => new Set(active), [active]);
  const added = tags.filter((tag) => activeSet.has(tag.text));
  const rest = tags.filter((tag) => !activeSet.has(tag.text));

  function submit(): void {
    const value = keyword.trim();
    if (!value) return;

    if (tags.some((tag) => tag.text === value)) {
      onToggle(value);
      setKeyword('');
      return;
    }

    /* 新建失败（重名/IO）时保留输入，别让用户重打 */
    onCreate(value);
  }

  return <Portal>
    <div ref={floatingRef} className="mm-popover mm-font__tag-menu" role="dialog" aria-label="字体标签">
      <div className="mm-font__tag-menu-title">标签</div>

      <TagInput value={keyword} onChange={setKeyword} onEnter={submit} autoFocus />

      <div className="mm-font__tag-menu-section">已添加的标签({added.length})</div>
      {added.length ? (
        <div className="mm-font__tag-menu-chips">
          {added.map((tag) => (
            <TagChip
              key={tag.text}
              text={tag.text}
              variant="menu"
              active
              onClick={() => onToggle(tag.text)}
            />
          ))}
        </div>
      ) : null}

      <div className="mm-font__tag-menu-section">全部({tags.length})</div>
      <div className="mm-font__tag-menu-chips">
        {rest.map((tag) => (
          <TagChip
            key={tag.text}
            text={tag.text}
            variant="menu"
            onClick={() => onToggle(tag.text)}
          />
        ))}
      </div>
    </div>
  </Portal>;
}
