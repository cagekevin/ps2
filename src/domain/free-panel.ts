/**
 * 自由面板文件形状（**契约完整，写入口未做** —— 见 `daily/架构日志/05-跨区-自由面板-现状与接续-2026-10-29.md`）
 *
 * 现状一句话：本文件的四个 interface 与 `free-panel-legacy.ts` 的映射表都已定稿，
 * 但仓里**没有任何代码写** `sj_appFreePanel.json`（缺 `repo/free-panel-repo.ts` 与 `commands.addToFreePanel`）。
 * 手势口径：**普通右键 = 展开子面板**（已实现，勿改）；**Ctrl+右键 = 加入自由面板**（未接，债 `TD-09-7`）。
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
