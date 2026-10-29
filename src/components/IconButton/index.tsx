/**
 * 【唯一入口】图标按钮 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】图标按钮（原版 `baseIcon`）
 *
 * 26×26 点击区 + 选中态 + 右下角标。与 `components/ui` 的 `Button` 分工不同：
 * `Button` 是带文字的按钮，这里是只有一个图标的工具条按钮。
 *
 * 修饰键不在这里判定：组件只把原始事件交出去。`Ctrl` / `Shift` 的语义各处不同
 * （字体面板顶部 Ctrl = 自由面板，属性面板 Ctrl = 段落对齐），统一判定会把语义定死。
 *
 * 右键不调用 `preventDefault` 之外的处理：要不要吃掉浏览器菜单由调用方决定，
 * 传了 `onContextMenu` 就一定是「右键打开设置」，没传则只是普通按钮。
 */

import { Icon, type IconName } from '../icons';
import './icon-button.css';

interface Props {
  name: IconName;
  title: string;
  /** 图标像素尺寸；默认 20 */
  size?: number;
  active?: boolean;
  /** 右下角标（原版 `iconjiaobiao`）：表示可加入自由面板 */
  badge?: boolean;
  disabled?: boolean;
  /** 展开态（无障碍）：不传就不输出该属性，避免普通按钮被读成可展开控件 */
  ariaExpanded?: boolean;
  /** 展开面板的 DOM id，与 `ariaExpanded` 成对使用 */
  ariaControls?: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function IconButton({
  name,
  title,
  size = 20,
  active = false,
  badge = false,
  disabled = false,
  ariaExpanded,
  ariaControls,
  onClick,
  onContextMenu
}: Props) {
  return (
    <button
      type="button"
      className={`mm-icon-btn${active ? ' mm-icon-btn--active' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      disabled={disabled}
      onClick={onClick}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu?.(event);
      }}
    >
      <Icon name={name} size={size} />
      {badge ? <Icon name="iconjiaobiao" size={4} className="mm-icon-btn__badge" /> : null}
    </button>
  );
}
