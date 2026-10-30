/**
 * 字重选择：每个字重渲染成该字体自己的字形（英文 A / 中文 永），最多 7 个；
 * 第 8 个是数量 chip，点开是带勾选的下拉。
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../../../components/icons';
import { Portal } from '../../../components/Portal';
import { stopClickPropagation } from '../../../components/ui';
import { isAsciiFamily } from '../../../domain/font-lang';
import type { FontItem } from '../../../domain/font-item';
import { useDismiss } from '../../../hooks/useDismiss';
import { useFloatingPosition } from '../../../hooks/useFloatingPosition';

interface Props {
  font: FontItem;
  current: number;
  onSelect: (index: number) => void;
}

export function FontWeight({ font, current, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  /* 与其它下拉同一套：`useFloatingPosition` 定位 + `.mm-popover` 表面 + Portal 挂载。
     原来这里是 `position: absolute; bottom: 100%`，会被列表的滚动容器裁掉 */
  const { floatingRef, update } = useFloatingPosition({ placement: 'top-end' });

  useDismiss(open, floatingRef, () => setOpen(false), {
    inside: () => [rootRef.current]
  });

  useLayoutEffect(() => {
    if (open) update(triggerRef.current);
  }, [open, update]);

  const previews = font.postScriptNames.length > 1 ? font.postScriptNames.slice(0, 7) : [];
  if (!previews.length) return null;

  const glyph = isAsciiFamily(font.family) ? 'A' : '永';

  function pick(index: number) {
    setOpen(false);
    onSelect(index);
  }

  return (
    <div className="mm-font__weight" ref={rootRef}>
      <div className="mm-u-row">
        <div className="mm-font__weight-list">
          {previews.map((ps, index) => (
            <button
              key={`${ps}-${index}`}
              type="button"
              className={`mm-font__glyph${index === current ? ' mm-font__glyph--current' : ''}`}
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
          ref={triggerRef}
          type="button"
          className="mm-font__weight-count"
          aria-expanded={open}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((value) => !value);
          }}
        >
          {font.weights.length}
        </button>
      </div>

      {open ? (
        <Portal>
          <div
            ref={floatingRef}
            className="mm-popover mm-font__weight-menu"
            /* 下拉的 padding 也是弹层内部：点它不能冒泡成「应用字体」 */
            onClick={stopClickPropagation}
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
                  <Icon name="icongouxuan" className="mm-font__weight-check" />
                ) : null}
                <span>{weight}</span>
              </button>
            ))}
          </div>
        </Portal>
      ) : null}
    </div>
  );
}
