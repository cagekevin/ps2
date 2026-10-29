/**
 * 【唯一入口】图标按钮 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】图标按钮（原版 `baseIcon`）
 *
 * 26×26 点击区 + 选中态 + 右下角标。与 `components/ui` 的 `Button` 分工不同：
 * `Button` 是带文字的按钮，这里是只有一个图标的工具条按钮。
 *
 * **图标尺寸不传，按「旁边有没有字」分两档**（值是 `tokens.css` 的 `--mm-icon-btn` / `--mm-icon-sm`，
 * 规则见 `CONVENTIONS` §7 规则 14，实测表在 `components/icons` 文件头）：
 * - 纯图标条（页头工具、对齐/样式图标排、翻转、`IconPanel` 触发器）→ 默认 20，什么都不写
 * - 与文字同排（输入框右侧、带文字的分组行 / 预设行 / 间距行）→ 传 `className="mm-icon-btn--inline"` 得 14
 * 为什么不能用容器选择器自动判：同一个容器里两种都可能有（如分组行既有组名也有工具图标），只能由调用点声明。
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
  active?: boolean;
  /**
   * 与文字同排时传 `mm-icon-btn--inline`：图标降一档（20 → 14），
   * 否则图标比同一行的 12 号字还高（`CONVENTIONS` §7 规则 7）。
   */
  className?: string;
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
  active = false,
  className = '',
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
      className={`mm-icon-btn${active ? ' mm-icon-btn--active' : ''}${className ? ` ${className}` : ''}`}
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
      <Icon name={name} />
      {badge ? <Icon name="iconjiaobiao" className="mm-icon-btn__badge" /> : null}
    </button>
  );
}
