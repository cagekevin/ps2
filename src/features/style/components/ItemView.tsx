/**
 * 样式库单项。
 *
 * 四库尺寸完全不同（颜色 25×25 无圆角 / 渐变 50×26 / 字体 70×44 / 样式 26×26），
 * 差异全在 CSS 的 `--color / --gradient / --font / --style` 修饰类里，
 * 这里只决定用哪个类、画什么内容。
 */
import type { CSSProperties, MouseEvent } from 'react';
import { InlineEdit } from '../../../components/InlineEdit';
import { userAssetUrl } from '../../../core/paths';
import { fontFamilyOf, type KuItem, type KuKind } from '../../../domain/style-library';

interface Props {
  kind: KuKind;
  item: KuItem;
  groupIndex: number;
  itemIndex: number;
  editing: boolean;
  onApply: (groupIndex: number, itemIndex: number, name: string, event: MouseEvent) => void;
  onContextMenu: (event: MouseEvent, groupIndex: number, itemIndex: number, name: string) => void;
  onMouseDown: (event: MouseEvent, groupIndex: number, itemIndex: number) => void;
  onRename: (name: string) => void;
  onCancelRename: () => void;
}

export function ItemView({
  kind,
  item,
  groupIndex,
  itemIndex,
  editing,
  onApply,
  onContextMenu,
  onMouseDown,
  onRename,
  onCancelRename
}: Props) {
  const menu = (event: MouseEvent) => onContextMenu(event, groupIndex, itemIndex, item.name);
  const down = (event: MouseEvent) => onMouseDown(event, groupIndex, itemIndex);

  /* 编辑态：占一个格子显示输入框，不渲染原本的色块 / 缩略图 */
  if (editing) {
    return (
      <div className="mm-style__item mm-style__item--editing">
        <InlineEdit value={item.name} onCommit={onRename} onCancel={onCancelRename} />
      </div>
    );
  }

  if (kind === 'style') {
    return (
      <button
        type="button"
        className="mm-style__item mm-style__item--style"
        title={item.name}
        data-group-index={groupIndex}
        data-item-index={itemIndex}
        onClick={(event) => onApply(groupIndex, itemIndex, item.name, event)}
        onContextMenu={menu}
        onMouseDown={down}
      >
        {item.thumb ? (
          <img className="mm-style__thumb" src={userAssetUrl('kuStyle', item.thumb)} alt={item.name} />
        ) : null}
      </button>
    );
  }

  if (kind === 'font') {
    const preview = item.fontPreview;
    return (
      <button
        type="button"
        className="mm-style__item mm-style__item--font"
        title={item.name}
        data-group-index={groupIndex}
        data-item-index={itemIndex}
        onClick={(event) => onApply(groupIndex, itemIndex, item.name, event)}
        onContextMenu={menu}
        onMouseDown={down}
      >
        {preview ? (
          <>
            {/* 四件套（原版 render `:50956-50971`，对照清单 #24）：
                字体数 + N点 + 5×5 色点 一行，「中文字」预览一行 */}
            <span className="mm-style__font-head">
              <span className="mm-style__font-count">{preview.count}</span>
              <span className="mm-style__font-size">{preview.size}</span>
              {preview.color ? (
                <span
                  className="mm-style__font-dot"
                  style={{ '--mm-dot-color': preview.color } as CSSProperties}
                />
              ) : null}
            </span>
            <span
              className="mm-style__font-sample"
              style={{ '--mm-sample-font': fontFamilyOf(preview) } as CSSProperties}
            >
              中文字
            </span>
          </>
        ) : (
          <span className="mm-style__font-family">{item.name}</span>
        )}
      </button>
    );
  }

  /* 颜色与渐变共用一个色块，尺寸由修饰类决定。
     目录名是 Gradient（大写 G），不是 kuGradient——原版 path.kuGradient 的值就是 'Gradient' */
  const background = item.image ? `url(${userAssetUrl('Gradient', item.image)})` : item.swatch;

  return (
    <button
      type="button"
      className={`mm-style__item mm-style__item--${kind === 'gradient' ? 'gradient' : 'color'}`}
      title={item.name}
      data-group-index={groupIndex}
      data-item-index={itemIndex}
      style={{ '--mm-swatch': background } as CSSProperties}
      onClick={(event) => onApply(groupIndex, itemIndex, item.name, event)}
      onContextMenu={menu}
      onMouseDown={down}
    >
      <span className="mm-style__swatch" />
    </button>
  );
}
