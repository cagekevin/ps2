/**
 * 动作页的纯数据：图标、列数菜单。
 *
 * 图标名逐条来自官方（`05` §4.8 第 10 条），**不放字面量到组件里**——
 * 页面与弹窗都从这里取，换图标只改一处。
 */

import type { MenuItem } from '../../components/ContextMenu';
import type { IconName } from '../../components/icons';
import type { ActionColumns } from '../../store/action';

export const ACTION_ICONS = {
  /** 仓库条左侧 */
  warehouse: 'iconmorencangku',
  /** 「添加分组」 */
  addGroup: 'iconchuangjian',
  /** 「显示方式」（列数） */
  columns: 'icongengduocaidan',
  /** 导入预设 */
  importPreset: 'icondaoru',
  /** 导出预设 */
  exportPreset: 'icondaochu'
} as const satisfies Record<string, IconName>;

/** 列数三档：文案逐字（单列 / 双列 / 三列），当前档在菜单里打勾 */
export function columnMenuItems(
  current: ActionColumns,
  onPick: (columns: ActionColumns) => void
): MenuItem[] {
  const labels: Record<ActionColumns, string> = {
    1: '单列',
    2: '双列',
    3: '三列'
  };
  return ([1, 2, 3] as const).map((columns) => ({
    label: labels[columns],
    checked: columns === current,
    onSelect: () => onPick(columns)
  }));
}
