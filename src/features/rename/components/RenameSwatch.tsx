/**
 * 色块按钮（图层颜色标记）
 *
 * **盒子不在这里**：形状 / 尺寸 / 圆角 / hover 全部走仓库自己的 `.mm-swatch`
 * （`components/ui/ui.css`，吸色弹窗在用同一份）。本组件只做两件本页的事：
 *   1. 把色板变量注入 `--mm-swatch`（`--mm-layer-color-1..7`，色值唯一出处 `tokens.css`）
 *   2. 清除档：不传颜色 → 盒子透明，里面放一个 `Icon`（`iconguanbi`）
 *
 * 不新建任何色块样式：上一版自造的 `.mm-rename-swatch` / `--mm-rename-swatch` / 描边底
 * 都已删除（那等于给同一个东西做第二份皮肤）。
 */

import type { CSSProperties } from 'react';
import { Icon } from '../../../components/icons';
import { RENAME_ICONS } from '../rename-constants';

interface Props {
  /** 传 `var(--mm-layer-color-N)` 这类变量串；清除档不传 */
  color?: string;
  /** 清除档：不传颜色，中间一个 ✕ */
  clear?: boolean;
  /** 必填：色块没有可见文字，靠它当悬停提示与 `aria-label` */
  title: string;
  onPick: () => void;
}

export function RenameSwatch({ color, clear = false, title, onPick }: Props) {
  return (
    <button
      type="button"
      className="mm-swatch"
      title={title}
      aria-label={title}
      /* 动态色值只交变量（`STYLE.md` §14.1）；清除档不给变量 = 透明 */
      style={clear ? undefined : ({ '--mm-swatch': color } as CSSProperties)}
      onClick={onPick}
    >
      {clear ? <Icon name={RENAME_ICONS.clearColor} /> : null}
    </button>
  );
}
