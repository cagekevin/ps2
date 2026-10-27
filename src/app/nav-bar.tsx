/**
 * 【范本】侧边导航
 * 只读 nav-config，不写死任何页面名。未实现项点击提示，不跳转。
 * 样式对齐原版 #nav / .nav-item（app.v4.js 的 40×40、激活 #434343、hover 右侧滑出标签）。
 */
import { NavLink, useNavigate } from 'react-router-dom';
import { Icon } from '../components/icons';
import { useToast } from '../components/Toast';
import { useShortcut } from '../hooks/useShortcut';
import { BOTTOM_ITEMS, NAV_ITEMS, TOP_ITEMS, type NavItem } from './nav-config';
import './nav-bar.css';

export function NavBar() {
  const navigate = useNavigate();
  const toast = useToast();

  /* 全局键盘监听只在 hooks 里（`useShortcut` 负责「打字中 / 带修饰键」两条排除） */
  useShortcut((key) => {
    const item = NAV_ITEMS.find((entry) => entry.shortcut === key);
    if (!item) return;
    if (!item.implemented) {
      toast.info(`${item.name} 未实现`);
      return;
    }
    navigate(item.path);
  });

  function renderItem(item: NavItem) {
    const base = `mm-nav__item${item.bottom ? ' mm-nav__item--sub' : ''}`;

    if (item.implemented) {
      return (
        <NavLink
          key={item.key}
          to={item.path}
          title={item.name}
          data-label={item.name}
          className={({ isActive }) => `${base}${isActive ? ' mm-nav__item--active' : ''}`}
        >
          <Icon name={item.icon} />
        </NavLink>
      );
    }

    return (
      <button
        key={item.key}
        type="button"
        title={`${item.name}（未实现）`}
        data-label={item.name}
        className={`${base} mm-nav__item--disabled`}
        onClick={() => toast.info(`${item.name} 未实现`)}
      >
        <Icon name={item.icon} />
      </button>
    );
  }

  return (
    <nav className="mm-nav">
      {TOP_ITEMS.map(renderItem)}
      <div className="mm-nav__spacer" />
      {BOTTOM_ITEMS.map(renderItem)}
    </nav>
  );
}
