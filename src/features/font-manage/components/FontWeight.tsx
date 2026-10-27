/**
 * 字重选择：每个字重渲染成该字体自己的字形（英文 A / 中文 永），最多 7 个；
 * 第 8 个是数量 chip，点开是带勾选的下拉。
 */
import { useRef, useState, type CSSProperties } from 'react';
import { Icon } from '../../../components/icons';
import { isAsciiFamily } from '../../../domain/font-lang';
import type { FontItem } from '../../../domain/font-item';
import { useDismiss } from '../../../hooks/useDismiss';
import { fontFamilyValue } from '../css';

interface Props {
  font: FontItem;
  current: number;
  onSelect: (index: number) => void;
}

export function FontWeight({ font, current, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useDismiss(open, rootRef, () => setOpen(false));

  const previews = font.postScriptNames.length > 1 ? font.postScriptNames.slice(0, 7) : [];
  if (!previews.length) return null;

  const glyph = isAsciiFamily(font.family) ? 'A' : '永';

  function pick(index: number) {
    setOpen(false);
    onSelect(index);
  }

  return (
    <div className="mm-font__weight" ref={rootRef}>
      <div className="mm-font__weight-wrap">
        <div className="mm-font__weight-list">
          {previews.map((ps, index) => (
            <button
              key={`${ps}-${index}`}
              type="button"
              className={`mm-font__glyph${index === current ? ' mm-font__glyph--current' : ''}`}
              style={{ '--mm-glyph-font': fontFamilyValue(ps, font.family) } as CSSProperties}
              onClick={(event) => {
                event.stopPropagation();
                pick(index);
              }}
            >
              {glyph}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mm-font__weight-count"
          onClick={(event) => {
            event.stopPropagation();
            setOpen((value) => !value);
          }}
        >
          {font.weights.length}
        </button>
      </div>

      {open ? (
        <div
          className="mm-font__weight-menu"
          /* 下拉的 padding 也是弹层内部：点它不能冒泡成「应用字体」 */
          onClick={(event) => event.stopPropagation()}
        >
          {font.weights.map((weight, index) => (
            <button
              key={`${weight}-${index}`}
              type="button"
              className="mm-font__weight-option"
              onClick={(event) => {
                event.stopPropagation();
                pick(index);
              }}
            >
              {index === current ? (
                <Icon name="icongouxuan" size={12} className="mm-font__weight-check" />
              ) : null}
              <span>{weight}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
