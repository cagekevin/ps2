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
import { type KuItem, type KuKind } from '../../../domain/style-library';

interface Props {
  kind: KuKind;
  item: KuItem;
  groupIndex: number;
  itemIndex: number;
  editing: boolean;
  onApply: (groupIndex: number, itemIndex: number, name: string, event: MouseEvent) => void;
  onContextMenu: (event: MouseEvent, groupIndex: number, itemIndex: number, name: string) => void;
  onMouseDown: (event: MouseEvent, groupIndex: number, itemIndex: number) => void;
  /** 悬停浮层；show=true 必须带项元素（浮层的定位锚点），false 表示移出 */
  onDescribe: (show: boolean, el?: HTMLElement) => void;
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
  onDescribe,
  onRename,
  onCancelRename
}: Props) {
  const menu = (event: MouseEvent) => onContextMenu(event, groupIndex, itemIndex, item.name);
  const down = (event: MouseEvent) => onMouseDown(event, groupIndex, itemIndex);
  const describeOn = (event: MouseEvent) =>
    onDescribe(true, event.currentTarget as HTMLElement);
  const describeOff = () => onDescribe(false);

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
        onMouseEnter={describeOn}
        onMouseLeave={describeOff}
      >
        {item.thumb ? (
          <img className="mm-style__thumb" src={userAssetUrl('legacy', 'kuStyle', item.thumb)} alt={item.name} />
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
        onMouseEnter={describeOn}
        onMouseLeave={describeOff}
      >
        {preview ? (
          <>
            {/* 原版 render `:50956-50971` 有「字体数 + N点 + 色点」三件；
                字体数（那个孤零零的 1）已去掉，只留「N点」+ 色点 */}
            <span className="mm-u-row mm-style__font-head">
              <span>{preview.size}</span>
              {preview.color ? (
                <span className="mm-style__font-dot" />
              ) : null}
            </span>
            <span className="mm-style__font-sample">中文字</span>
          </>
        ) : (
          <span className="mm-style__font-family">{item.name}</span>
        )}
      </button>
    );
  }

  /* 颜色与渐变共用一个色块，尺寸由修饰类决定。
     目录名是 Gradient（大写 G），不是 kuGradient —— 原版 path.kuGradient 的值就是 'Gradient' */
  const background = item.image ? `url(${userAssetUrl('legacy', 'Gradient', item.image)})` : item.swatch;

  return (
    <button
      type="button"
      className={`mm-style__item mm-style__item--${kind === 'gradient' ? 'gradient' : 'color'}`}
      style={{ '--mm-swatch': background } as CSSProperties}
      title={item.name}
      data-group-index={groupIndex}
      data-item-index={itemIndex}
      onClick={(event) => onApply(groupIndex, itemIndex, item.name, event)}
      onContextMenu={menu}
      onMouseDown={down}
      onMouseEnter={describeOn}
      onMouseLeave={describeOff}
    >
      <span className="mm-style__swatch" />
    </button>
  );
}
