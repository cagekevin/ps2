/**
 * 设置页的单位选项（原版 `sj_set.json` 的 `appUnit`）
 *
 * 逐字对齐原版 `app.v4.js:2074372` 的 `company` 数组：**括号前没有空格**，
 * 顺序是 px / cm / mm / in / pt / pc（不是按字母排的）。
 *
 * 它决定的是「数值输入框的默认单位」（原版 `app.v4.js:2268567` 的补单位函数：
 * 文本里已带合法单位就用文本的，否则用 `appUnit`）。
 *
 * 字体面板**不显示单位后缀**（2026-10-27 决定：用户不需要知道，原版面板里也没有独立后缀）。
 * 原版 `fontUnit`（`:1408634`）只用于把单位拼进字号/行距的值里，我们不采用这种做法。
 */

export interface UnitOption {
  label: string;
  /** 写进 `sj_set.json` 的 `appUnit`：原版从「像素(px)」里 `substr(n+1, 2)` 截出来 */
  value: string;
}

export const UNITS: readonly UnitOption[] = [
  { label: '像素(px)', value: 'px' },
  { label: '厘米(cm)', value: 'cm' },
  { label: '毫米(mm)', value: 'mm' },
  { label: '英尺(in)', value: 'in' },
  { label: '点(pt)', value: 'pt' },
  { label: '派卡(pc)', value: 'pc' }
];

/** 文件里的值不在列表里时回到第一项（原版设置页 `index < 0 ? 0`；默认值在 `FONT_SET_DEFAULTS.appUnit`） */
export function unitIndexOf(value: string): number {
  const index = UNITS.findIndex((item) => item.value === value);
  return index < 0 ? 0 : index;
}


