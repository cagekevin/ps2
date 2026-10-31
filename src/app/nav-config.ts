/**
 * 【范本】导航配置
 * 全项目唯一的导航来源。新增页面：在这里加一条，再在 router 注册。
 * implemented=false 的项不注册路由，点击只提示，避免跳到空白页。
 *
 * 参数对照原版 app.v4.js 的 menuData（:1120-1238）：
 * 名称、快捷键 word、图标 icon 全部一致。
 */
import type { IconName } from '../components/icons';

export interface NavItem {
  key: string;
  name: string;
  path: string;
  icon: IconName;
  /** 快捷键（小写），对应原版 word 字段 */
  shortcut?: string;
  /** 是否已实现 */
  implemented: boolean;
  /** 是否放在底部（原版只有设置） */
  bottom?: boolean;
}

/*
 * **这三个页面确定不做**（2026-10-31 用户裁定）：素材库 / 自定义框架 / 批量套版。
 * 不是"还没做"，是"不做" —— 所以不是注释掉等将来，而是从导航里删掉：
 * 导航上挂一个永远点不动的项，就是承诺了一个不存在的东西。
 *
 * 原版的这三块（素材库 = 云素材中心下载；自定义框架 = 自由面板；批量套版 = 批量替换）
 * 与本工具的定位（PS 内的重命名 / 字体 / 样式 / 动作 / 模板）不是同一条线，做进来只会稀释。
 * 要恢复时从 git 历史取这三行即可（key 分别是 `material` / `custom` / `overprint`）。
 */
export const NAV_ITEMS: NavItem[] = [
  { key: 'template', name: '模板库', path: '/template', icon: 'icon-nav_mobanku', shortcut: 'r', implemented: true },
  { key: 'common', name: '常用功能', path: '/common', icon: 'icon-nav_changyonggongneng', shortcut: 'a', implemented: true },
  { key: 'font', name: '字体面板', path: '/font', icon: 'icon-nav_zitimianban', shortcut: 't', implemented: true },
  { key: 'font-manage', name: '字体管理', path: '/font-manage', icon: 'icon-nav_zitiguanli', shortcut: 'h', implemented: true },
  { key: 'style', name: '样式面板', path: '/style', icon: 'icon-nav_yangshiku', shortcut: 'u', implemented: true },
  { key: 'action', name: '动作管理', path: '/action', icon: 'icon-nav_dongzuoku', shortcut: 'w', implemented: true },
  { key: 'rename', name: '重命名图层', path: '/rename', icon: 'icon-nav_chongmingmingtuceng', shortcut: 'e', implemented: true },
  { key: 'set', name: '设置', path: '/set', icon: 'iconyonghushezhi', implemented: true, bottom: true }
];

export const TOP_ITEMS = NAV_ITEMS.filter((item) => !item.bottom);
export const BOTTOM_ITEMS = NAV_ITEMS.filter((item) => item.bottom);

/** 打开面板落在哪一页：**字体面板**（`/font`）。`/` 与未匹配路径都跳这里 */
export const DEFAULT_PATH = '/font';
