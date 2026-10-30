/**
 * 常用页的一个功能格（原版 `context-svg-wrap` + `context-text`）。
 *
 * 尺寸全部走 token：方块 50×50（`--mm-common-tile`）/ 圆角 `--mm-radius-md` /
 * 内部 svg 32×32（`--mm-common-tile-icon`）。
 * 方块常态**不铺底色**（设计稿里格子就是图标 + 文字）；hover 换 `--mm-color-bg-raised-hover`，
 * 展开中换 `--mm-color-bg-panel`（凹下去一档，规则 12「展开靠底色凹下去」）。
 * **不要复用 `IconButton`**：那是 26×26 的工具条按钮，形状不同。
 *
 * 图标名来自用户文件（`sj_commonFunction.json` 的 `svg`），所以必须过 `isIconName`——
 * 不认识的名字渲染成空，而不是 `as IconName` 硬转（那是把「图标没了」装成「画了」）。
 *
 * 交互不在这里判：左键是执行还是展开、右键要不要开面板，都由页面决定（三层手势只有一处实现）。
 */

import type { MouseEvent } from 'react';
import { Icon, isIconName } from '../../../components/icons';
import type { CommonUseTile } from '../../../domain/common-use';
import './tile-button.css';

interface Props {
  tile: CommonUseTile;
  /** 文件里的下标：拖拽落点靠它回传，不要用视图下标（隐藏项会让两者错位） */
  index: number;
  /** 没有对应命令 / 未接线：灰态，点了不做事 */
  disabled?: boolean;
  /** 展开中（M3 接手子面板后由页面传） */
  active?: boolean;
  /** 左键：交给 `IconPanel` 的 handlers（本组件不判「是执行还是展开」） */
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
  /** 右键：与左键一样开关面板（`IconPanel` 交下来的语义，页面不自己判） */
  onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function TileButton({
  tile,
  index,
  disabled = false,
  active = false,
  onClick,
  onMouseDown,
  onContextMenu
}: Props) {
  /* 悬停图的名字也是文件来的，同样要过守卫；不认识就当作没有这一档 */
  const filled = tile.icon.filled && isIconName(tile.icon.filled) ? tile.icon.filled : null;
  const hasFilled = filled !== null;
  const className = [
    'mm-common__tile',
    hasFilled ? 'mm-common__tile--filled' : '',
    active ? 'mm-common__tile--active' : '',
    disabled ? 'mm-common__tile--disabled' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={className}
      data-index={index}
      title={tile.title || tile.name}
      aria-disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
    >
      <span className="mm-common__tile-box">
        {isIconName(tile.icon.rest) ? (
          <Icon
            name={tile.icon.rest}
            className="mm-common__tile-icon mm-common__tile-icon--rest"
          />
        ) : null}
        {filled ? (
          <Icon
            name={filled}
            className="mm-common__tile-icon mm-common__tile-icon--filled"
          />
        ) : null}
      </span>
      <span className="mm-common__tile-name">{tile.name}</span>
    </button>
  );
}
