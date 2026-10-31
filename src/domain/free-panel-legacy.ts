/**
 * 自由面板旧 key → 字面板命令的**唯一映射表**
 *
 * 为什么现在就要定：命令是普通函数，`payload` 就是函数参数对象。
 * 以后接自由面板时执行器按 `command` 调函数，`payload` 从 `option` 按 `fields / rename / fixed`
 * 三件事拼出来——若现在不按这张表定 payload，将来要再写一层翻译，等于两套契约。
 *
 * 本页只消费 `FONT_PANEL_FREE_ITEMS`（Ctrl+点击要构造的 5 项）；其余 6 条是为后续
 * 自由面板整页预留的契约，**页面不接**（原版 Vue 也只接了这 5 个）。
 */

import type { FreePanelItemInput } from './free-panel';
import type { FontSetSettings } from './font-set';

/** 目标命令名 = `commands/font-set.ts` 的导出函数名（不建注册表，按名调） */
export type FontSetCommandName =
  | 'translate'
  | 'createButton'
  | 'copyFont'
  | 'pasteFont'
  | 'fontSize'
  | 'leading'
  | 'tracking'
  | 'align'
  | 'split';

export interface LegacyPayloadRule {
  /** 从 `option` 里取哪些字段进 payload */
  fields: string[];
  /** 原版字段名 → 命令参数名（唯一已知的一处：翻译的 `delete` 要变 `replace`） */
  rename?: Record<string, string>;
  /** 与 `option` 无关的固定参数（如对齐的轴向） */
  fixed?: Record<string, unknown>;
}

export interface LegacyFontAction {
  /** 原版 `FreePanelItem.key` */
  key: string;
  command: FontSetCommandName;
  payload: LegacyPayloadRule;
  /** 字面板 Ctrl+点击的可加入项（原版这 5 个） */
  panel?: {
    text: string;
    icon: string;
    /** 加入时写进 `option` 的设置字段；`null` = 原版存的就是 `null` */
    option: keyof Pick<FontSetSettings, 'ztTranslate' | 'ztCreateButton' | 'ztPasteFont'> | null;
  };
}

export const LEGACY_FONT_ACTIONS: readonly LegacyFontAction[] = [
  {
    key: 'zt_translate',
    command: 'translate',
    /* option 里是 delete，命令参数是 replace：改名必须在这一层写明，执行器不再猜 */
    payload: { fields: ['from', 'to'], rename: { delete: 'replace' } },
    panel: { text: '翻译', icon: 'iconfanyi', option: 'ztTranslate' }
  },
  {
    key: 'zt_createButton',
    command: 'createButton',
    payload: { fields: ['config'] },
    panel: { text: '生成按钮', icon: 'iconanniu', option: 'ztCreateButton' }
  },
  {
    key: 'zt_copyFontInfo',
    command: 'copyFont',
    payload: { fields: [] },
    panel: { text: '复制文本', icon: 'iconfuzhiwenziyangshi', option: null }
  },
  {
    key: 'zt_pasteFontInfo',
    command: 'pasteFont',
    payload: { fields: ['keeps'] },
    panel: { text: '粘贴文本', icon: 'iconniantiewenziyangshi', option: 'ztPasteFont' }
  },
  { key: 'zt_setFontSize', command: 'fontSize', payload: { fields: ['value'] } },
  { key: 'zt_setFontLeading', command: 'leading', payload: { fields: ['value'] } },
  { key: 'zt_setFontTracking', command: 'tracking', payload: { fields: ['value'] } },
  {
    key: 'zt_setLeftRightAlign',
    command: 'align',
    payload: { fields: ['index'], fixed: { axis: 'h' } }
  },
  {
    key: 'zt_setUpDownAlign',
    command: 'align',
    payload: { fields: ['index'], fixed: { axis: 'v' } }
  },
  /* 这里的 key 是原版写进用户配置的字面量，必须照抄（哪怕它其实不是可调函数）：
     `zt_changeTextBranchMerge` 在真机上一调就抛「没有这种元素」，见 §11.3 第 7 条 */
  { key: 'zt_changeTextBranchMerge', command: 'split', payload: { fields: ['mode'] } }
];

/** 字面板 Ctrl+点击可加入自由面板的 5 项（v1 只用它构造提示，不写文件） */
export interface FontPanelFreeItem extends FreePanelItemInput {
  text: string;
  key: string;
  icon: string;
  /** 加入时写进 `item.option` 的值：原版直接存设置对象，`null` 就存 `null` */
  option: (settings: FontSetSettings) => unknown;
}

export const FONT_PANEL_FREE_ITEMS: readonly FontPanelFreeItem[] = LEGACY_FONT_ACTIONS.flatMap(
  (action) => {
    const panel = action.panel;
    if (!panel) return [];

    return [
      {
        text: panel.text,
        key: action.key,
        icon: panel.icon,
        option: (settings: FontSetSettings) =>
          panel.option === null ? null : settings[panel.option]
      }
    ];
  }
);
