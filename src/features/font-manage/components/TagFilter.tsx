/**
 * 字体标签筛选：一行 chips，末尾一个「+」新建。
 *
 * 形态（2026-10-31 用户裁定）：
 *   - 没有标题行 —— 标签直接跟着上面的筛选行走，不再自称一块；
 *   - **第一个 chip 是「全部」**，和标签同排、可点（= 清空标签筛选，回到全量）；
 *   - 「+」放在**标签最后面**，跟 chips 同排换行。
 *
 * **不做折叠**：折叠会把排在末尾的「+」一起裁掉，用户就点不到新建了。
 */
import type { MouseEvent } from 'react';
import { Button } from '../../../components/ui';
import type { FontTag } from '../../../domain/font-meta';
import { TagChip } from './TagChip';

interface Props {
  tags: FontTag[];
  activeTag: string;
  onSelect: (tag: string) => void;
  /** 「全部」chip：清空标签筛选 */
  onClear: () => void;
  onContext: (event: MouseEvent<HTMLButtonElement>, tag: string) => void;
  onCreate: () => void;
}

export function TagFilter({ tags, activeTag, onSelect, onClear, onContext, onCreate }: Props) {
  return (
    <div className="mm-u-tiles">
      {/* 「全部」和标签是同一类东西（一个筛选值），所以是 chip；它不可改名/删除，故不挂右键 */}
      <TagChip text="全部" active={activeTag === ''} onClick={onClear} />

      {tags.map((tag) => (
        <TagChip
          key={tag.text}
          text={tag.text}
          active={activeTag === tag.text}
          onClick={() => onSelect(activeTag === tag.text ? '' : tag.text)}
          onContextMenu={(event) => onContext(event, tag.text)}
        />
      ))}

      {/* 「+」是**纯图标按钮**：走 `ghost`，常态无底、hover 才叠一档 */}
      <Button variant="ghost" className="mm-font__tags-add" aria-label="新建标签" onClick={onCreate}>
        +
      </Button>
    </div>
  );
}
