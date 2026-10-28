/**
 * 【范本】页面底栏：26 高图标条 + 图标按钮 + 竖线分隔
 *
 * 唯一入口：任何页面要底栏都用这三个件，**不要各页再写一套 26/#535353 的壳**。
 * 替代了什么：`features/style/components/BottomBar.tsx` 里自绘的壳、按钮、竖线
 * （它现在只剩业务：彩虹/渐变方块 + 导入导出菜单）。
 * 谁在用：样式页、动作页（常用页没有底栏）。
 * 禁止：
 *   - 在页面 css 里重定义底栏高度 / 底色 / 按钮宽（都走 token）
 *   - 给底栏按钮加描边（原版 `.bottom-hover:hover` 是**纯底色**，没有边框）
 *
 * 尺寸来源：`--mm-bottom-bar-h`(26) / `--mm-bottom-btn-w`(30) / `--mm-color-bottom-bar` /
 * `--mm-color-bottom-hover` / `--mm-verline-h`(13) / `--mm-color-verline`。
 */

import type { MouseEvent, ReactNode } from 'react';
import { Icon, type IconName } from '../icons';
import './bottom-bar.css';

interface BottomBarProps {
  children: ReactNode;
  /** 页面级修饰类（只管布局，不许改高度与底色） */
  className?: string;
}

/** 底栏容器：整宽、26 高、深色底 */
export function BottomBar({ children, className = '' }: BottomBarProps) {
  return (
    <div className={`mm-bottom-bar${className ? ` ${className}` : ''}`}>{children}</div>
  );
}

interface BottomBarButtonProps {
  /** 必填：底栏按钮没有可见文字，靠它当悬停提示与 `aria-label` */
  title: string;
  /** 用 sprite 图标时的名字；要自定义 SVG（如彩虹方块）就传 `children` */
  name?: IconName;
  size?: number;
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
}

/** 底栏图标按钮：30×26，hover 只换底色（无描边） */
export function BottomBarButton({
  title,
  name,
  size = 18,
  disabled = false,
  onClick,
  children
}: BottomBarButtonProps) {
  return (
    <button
      type="button"
      className="mm-bottom-bar__btn"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
    >
      {children ?? (name ? <Icon name={name} size={size} /> : null)}
    </button>
  );
}

/** 竖线分隔：1×13，#333，左右各 8 */
export function BottomBarDivider() {
  return <span className="mm-bottom-bar__divider" aria-hidden="true" />;
}
