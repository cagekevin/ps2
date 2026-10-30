/**
 * 我的标签：标题 + 新建 + 折叠（容器 max-height 94px）。
 * 标签读不到时说一句，不让标签区静默变空。
 */
import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { Chevron } from '../../../components/Chevron';
import type { FontTag } from '../../../domain/font-meta';
import { TagChip } from './TagChip';

interface Props {
  tags: FontTag[];
  error: string;
  activeTag: string;
  onSelect: (tag: string) => void;
  onContext: (event: MouseEvent<HTMLButtonElement>, tag: string) => void;
  onCreate: () => void;
}

export function TagFilter({ tags, error, activeTag, onSelect, onContext, onCreate }: Props) {
  const [open, setOpen] = useState(true);
  const [overflow, setOverflow] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;

    /* 折叠高度以 CSS 变量为唯一来源，别在 TS 里再写一遍 94 */
    const limit =
      Number.parseFloat(getComputedStyle(el).getPropertyValue('--mm-tag-collapse-h')) || 94;
    const next = el.scrollHeight > limit;
    setOverflow(next);
    if (!next) setOpen(true);
  }, [tags]);

  return (
    <section className="mm-font__tags">
      <div className="mm-u-row mm-font__tags-head">
        <span>我的标签</span>
        <div className="mm-u-row mm-font__tags-tools">
          <button className="mm-btn mm-font__tags-add" type="button" aria-label="新建标签" onClick={onCreate}>
            +
          </button>
          {overflow ? (
            <button
              className={`mm-btn mm-font__tags-toggle${open ? ' mm-font__tags-toggle--open' : ''}`}
              type="button"
              aria-label="展开或收起标签"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              <Chevron />
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mm-font__tags-error">{error}（标签读取失败，字体列表不受影响）</div>
      ) : (
        <div
          ref={listRef}
          className={`mm-font__tag-list${overflow && !open ? ' mm-font__tag-list--collapsed' : ''}`}
        >
          {tags.map((tag) => (
            <TagChip
              key={tag.text}
              text={tag.text}
              active={activeTag === tag.text}
              onClick={() => onSelect(activeTag === tag.text ? '' : tag.text)}
              onContextMenu={(event) => onContext(event, tag.text)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
