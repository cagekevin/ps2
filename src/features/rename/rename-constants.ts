/**
 * 重命名页的常量表（模式 / 表达式标记菜单 / 色板变量 / 图标名 / 导出文件名）
 *
 * 照 Vue 参考实现 `ps/src/pages/rename/index.vue` 与 `domain/rename.ts` 抄：
 *   `MODES = ['默认','替换']`（原版 switchdata）、`RENAME_MARKS` 的 6 条菜单文案、
 *   `LAYER_COLORS = var(--c-layer-N)` 七色 + 清除。
 *
 * **不放色值**：7 个图层颜色的值只能写在 `styles/tokens.css`（`--mm-layer-color-1..7`）。
 * **不放消息**：「不能输入空字符哦」这类「系统告诉用户发生了什么」的话在 `MSG.rename`。
 * 这里的菜单文案是**界面文字**（读者是用户，但描述的不是「发生了什么」），就近放本文件。
 */

import { LAYER_COLOR_COUNT, RENAME_MARKS, type RenameMark } from '../../domain/rename';
import type { RenameMode } from '../../store/rename';
import type { IconName } from '../../components/icons';

/** 顶部分段切换的两档（文案照原版 switchdata：`默认` / `替换`；值是 store 的字面量联合） */
export const MODE_OPTIONS: ReadonlyArray<{ value: RenameMode; label: string }> = [
  { value: 'default', label: '默认' },
  { value: 'replace', label: '替换' }
];

/**
 * 表达式标记菜单（点输入框弹出，原版 `showTips`）。
 *
 * `UNVERIFIED`：官方这 6 条菜单文案没取到逐字串，只有「保留原来名字」出自清单 §4.6 的 32 条；
 * 拿到原版截图后按它覆盖这 6 条（顺序与 `RENAME_MARKS` 一致）。
 */
const MARK_TEXT: Record<RenameMark, string> = {
  '%n': '保留原来名字',
  '%nn': '保留原来名字（数字补零）',
  '%%n': '从数字开始排序',
  '%%nn': '从数字开始排序（数字补零）',
  '%n=': '替换文字',
  '###': '自定义数字'
};

/** 菜单顺序**只跟 `RENAME_MARKS`**（domain 那张表的顺序），文案查上面那张表，不另写 if 链 */
export const MARK_MENU: ReadonlyArray<{ mark: RenameMark; text: string }> = RENAME_MARKS.map(
  (mark) => ({ mark, text: MARK_TEXT[mark] })
);

/** 七色 + 清除：色值只交变量名，值本身在 `tokens.css`（原版 colorData） */
export const LAYER_COLORS: readonly string[] = Array.from(
  { length: LAYER_COLOR_COUNT },
  (_, index) => `var(--mm-layer-color-${index + 1})`
);

/** 本页用到的图标（`IconName` 联合类型保证写错编译失败） */
export const RENAME_ICONS: {
  readonly apply: IconName;
  readonly filter: IconName;
  readonly addGroup: IconName;
  readonly addPreset: IconName;
  readonly importPreset: IconName;
  readonly exportPreset: IconName;
  readonly clearColor: IconName;
} = {
  apply: 'icongouxuan',
  filter: 'iconguolv',
  addGroup: 'iconxinjianyangshifenzu',
  addPreset: 'iconchuangjian',
  importPreset: 'icondaoru',
  exportPreset: 'icondaochu',
  clearColor: 'iconguanbi'
};

/** 导出对话框的默认文件名（文件名不是文案，按 `MSG` 的判据留在原处） */
export const EXPORT_FILE_NAME = '重命名.cmm';
