/**
 * 字面板的静态常量：图标 / 标题 / 档位 / 单位。
 *
 * 纯数据，没有行为；页面与子组件都从这里取，模板里不再出现字面量数组。
 * 图标名与文案逐字对齐原版（`app.v4.js` 根组件 data 与各子组件），
 * 组四第一个图标 id 末尾的连字符是原版的真实 id，不要去「修正」。
 */

import type { IconName } from '../../components/icons';

export const TOP_ICONS_ONE: readonly IconName[] = ['iconfanyi', 'iconchaifen', 'iconanniu'];
export const TOP_ICONS_TWO: readonly IconName[] = [
  'iconfuzhiwenziyangshi',
  'iconniantiewenziyangshi'
];
export const TOP_TITLES_ONE = ['翻译', '拆分文本', '创建按钮'] as const;
export const TOP_TITLES_TWO = ['复制文字属性', '粘贴文字属性'] as const;

/**
 * 批量文字的入口图标：**替换掉原来的「调整文本方向」**（那个功能不用了）。
 *
 * 用 `iconpiliangwenzi`：与 nav 的 `icon-nav_piliangtaoban` 同形，但 sprite 里另存了一份
 * viewBox 收紧到图形包围盒的版本 —— nav 那个四周留白是按导航格留的，塞进 20 档工具排会小一号。
 * 两个 symbol 各自服务各自的位置，**不要合并**，也不要靠 CSS transform 去补。
 */
export const TEXT_BATCH_ICON: IconName = 'iconpiliangwenzi';

/** 顶部带角标的按钮下标：组一 0/2、组二 1（角标 = 可加入自由面板，v1 仅展示） */
export const TOP_BADGES_ONE: readonly number[] = [0, 2];
export const TOP_BADGES_TWO: readonly number[] = [1];

export const BOTTOM_ICONS_ONE: readonly IconName[] = [
  'iconzuoduiqi',
  'iconchuizhiduiqi',
  'iconyouduiqi',
  'iconchuizhijuzhongfenbu'
];
export const BOTTOM_ICONS_TWO: readonly IconName[] = [
  'iconbeijingchuizhiduiqi',
  'iconchuizhifenbu'
];
export const BOTTOM_ICONS_THREE: readonly IconName[] = [
  'icondingbuduiqi',
  'iconshuipingduiqi',
  'icondibuduiqi',
  'iconshuipingjuzhongfenbu'
];
export const BOTTOM_ICONS_FOUR: readonly IconName[] = [
  'iconbeijingshuipingduiqi-',
  'iconshuipingfenbu'
];

export const BOTTOM_TITLES_ONE = ['左对齐', '居中对齐', '右对齐', '水平居中分布'] as const;
export const BOTTOM_TITLES_TWO = ['与背景水平对齐', '垂直分布元素'] as const;
export const BOTTOM_TITLES_THREE = ['顶对齐', '居中对齐', '底对齐', '垂直平均分布'] as const;
export const BOTTOM_TITLES_FOUR = ['与背景垂直对齐', '水平分布元素'] as const;

/** 拆分/合并：按钮文案 + 悬停说明（`app.v4.js:38895-38896`） */
export const SPLIT_BUTTONS = ['分行', '分为单个', '合并', '合并为段落'] as const;
export const SPLIT_TITLES = [
  '将多行文本拆分为多个单行文本',
  '将文本拆分为单个文本',
  '将多个文本合并',
  '将多个文本合并为段落'
] as const;

/**
 * 生成按钮的 1~8 快档（`app.v4.js:39033`）。
 *
 * 原版 `:39056` 还有三个内边距预设（`10,5` / `28,12` / `15=3:1`），**已删**（2026-10-31 用户裁定）：
 * 这三种写法的实际用途重复于下面 1~8 快档 + 手填输入框，多三个按钮只是多三处要维护的文案。
 */
export const CREATE_BUTTON_PRESETS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const HIERARCHY_TITLES = [
  '第1层级字号',
  '第2层级字号',
  '第3层级字号',
  '第4层级字号',
  '第5层级字号',
  '第6层级字号'
] as const;

/** 属性面板 3 个对齐图标的短名 + 修饰键提示（`app.v4.js:40539`） */
export const ALIGN_TITLES = ['左', '居中', '右'] as const;
export const ALIGN_TIP = '对齐文本，ctrl+点击设置段落对齐，shift+点击设置点文本';

/** 一个字重一个图标，最多显示 7 个（`app.v4.js:32316` 的 weightLen） */
export const WEIGHT_ICON_LIMIT = 7;

/** 字重图标按序号取：`iconzihaodaxiao1` ~ `iconzihaodaxiao7` */
export function weightIconName(index: number): IconName {
  const names: readonly IconName[] = [
    'iconzihaodaxiao1',
    'iconzihaodaxiao2',
    'iconzihaodaxiao3',
    'iconzihaodaxiao4',
    'iconzihaodaxiao5',
    'iconzihaodaxiao6',
    'iconzihaodaxiao7'
  ];
  return names[index] ?? 'iconzihaodaxiao1';
}
