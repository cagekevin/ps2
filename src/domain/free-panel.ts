/**
 * 自由面板文件形状（只定契约，本页不实现）
 *
 * 字体面板 v1 **不写** `sj_appFreePanel.json`：Ctrl+点击只提示「未上线」。
 * 这里先把形状冻结，以后接自由面板时不再改字面板命令的 payload。
 *
 * 三条写盘规则（接的时候必须照做，写错就是改用户文件格式）：
 *   1. `btnId = ++file.btnId`——全局自增，不是按块自增
 *   2. `option` **只有 `undefined`** 才补 `{}`；原版文件里确实有 `null`，别「顺手规范化」
 *   3. `showText` 是我方新增的 UI 字段，原版文件没有：**写盘前必须剥掉**，读回默认 `true`
 */

/** 文件：`<legacy>/sj_appFreePanel.json`（`%APPDATA%/SheJiZhuLi`） */
export interface FreePanelFile {
  uid: number;
  btnId: number;
  obj: {
    version: string;
    type: string;
    list: FreePanelBlock[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface FreePanelBlock {
  id: number;
  zIndex: number | string;
  showIcon: boolean;
  showNumber: number;
  /** 我方新增的 UI 字段，写盘前剥掉 */
  showText?: boolean;
  type: string;
  width?: string;
  height?: string;
  children: FreePanelBlock[];
  data: FreePanelItem[];
  [key: string]: unknown;
}

export interface FreePanelItem {
  icon: string;
  type: string;
  key: string;
  btnId: number;
  text: string;
  funcText: string;
  option: unknown;
  left: string;
  top: string;
  position: boolean;
  [key: string]: unknown;
}

/** 加入自由面板时接受的最小输入（`text` / `key` 必填） */
export interface FreePanelItemInput {
  text: string;
  key: string;
  option?: unknown;
  icon?: string;
  type?: string;
  funcText?: string;
}
