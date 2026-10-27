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

export const NAV_ITEMS: NavItem[] = [
  { key: 'template', name: '模板库', path: '/template', icon: 'icon-nav_mobanku', shortcut: 'r', implemented: false },
  { key: 'material', name: '素材库', path: '/material', icon: 'icon-nav_sucaiku', implemented: false },
  { key: 'custom', name: '自定义框架', path: '/custom', icon: 'icon-nav_zidingyikuangjia', shortcut: 'm', implemented: false },
  { key: 'common', name: '常用功能', path: '/common', icon: 'icon-nav_changyonggongneng', shortcut: 'a', implemented: true },
  { key: 'font', name: '字体面板', path: '/font', icon: 'icon-nav_zitimianban', shortcut: 't', implemented: true },
  { key: 'font-manage', name: '字体管理', path: '/font-manage', icon: 'icon-nav_zitiguanli', shortcut: 'h', implemented: true },
  { key: 'style', name: '样式面板', path: '/style', icon: 'icon-nav_yangshiku', shortcut: 'u', implemented: true },
  { key: 'action', name: '动作管理', path: '/action', icon: 'icon-nav_dongzuoku', shortcut: 'w', implemented: false },
  { key: 'rename', name: '重命名图层', path: '/rename', icon: 'icon-nav_chongmingmingtuceng', shortcut: 'e', implemented: false },
  { key: 'overprint', name: '批量套版', path: '/overprint', icon: 'icon-nav_piliangtaoban', implemented: false },
  { key: 'set', name: '设置', path: '/set', icon: 'iconyonghushezhi', implemented: true, bottom: true }
];

export const TOP_ITEMS = NAV_ITEMS.filter((item) => !item.bottom);
export const BOTTOM_ITEMS = NAV_ITEMS.filter((item) => item.bottom);

export const DEFAULT_PATH = '/style';
