/**
 * DLSS 神经渲染的数据形状（纯类型）。
 *
 * 三层别混：
 *   `DlssLook`   = 外观参数（内置预设用，不含输出尺寸）；
 *   `DlssParams` = 外观 + 输出尺寸（二选一，不能都不给）；
 *   `DlssExport` / `DlssPlaced` = jsx 两次调用的载荷。
 *
 * 键名与 token 键一一对应（`i/d/c/ls/lt/sk/st/sr/am/ui/sc/w`），**不许改**：
 * 旧 PSD 的图层名里已经写着它们，改一个字符就读不回来（`domain/dlss-token.ts` 文件头）。
 */

/** DLSS SR 模型预设；`'default'` = 交给驱动选 */
export type DlssSrPreset = 'default' | 'E' | 'F' | 'J' | 'K' | 'L' | 'M';

/** 不含输出尺寸的「外观」参数：内置预设用它（输出尺寸是每张图自己定的） */
export interface DlssLook {
  /** 强度 0–2 */
  i: number;
  /** 细节 0–2 */
  d: number;
  /** 色彩 0–2 */
  c: number;
  /** 局部结构 0–2 */
  ls: number;
  /** 局部影调 0–2 */
  lt: number;
  /** 皮肤（-1 = 关） */
  sk: number;
  /** 风格：0 标准 / 1 自然 / 2 电影 */
  st: 0 | 1 | 2;
  sr: DlssSrPreset;
  /** 自动蒙版 */
  am: 0 | 1;
  /** UI 修正 */
  ui: 0 | 1;
}

/**
 * 一组神经渲染参数：输出尺寸**二选一，不能都不给**。
 *
 * 写成判别联合是为了让「都不给」编译不过 —— 否则 `dlssResultName` 会算出 `0x`。
 */
export type DlssParams = DlssLook &
  ({ sc: number; w?: never } | { w: number; sc?: never });

/**
 * 导出阶段结果（`mm_dlss_exportLayer` 的载荷）。
 * **不带 path**：路径是调用方传进去的，jsx 再返回一遍就是同一件事两个来源。
 */
export interface DlssExport {
  /** 图层在文档里的区域左上角 */
  left: number;
  top: number;
  width: number;
  height: number;
  /** 原图层名（结果名以它为底，`dlssResultName` 会去掉旧后缀） */
  layerName: string;
}

/** `--probe-nr` 输出里的环境信息（一次自检同时给「能不能跑」和「跑在什么上」） */
export interface DlssEngineInfo {
  /** 显卡（去掉 `NVIDIA GeForce` 前缀与显存括号） */
  gpu: string;
  /** 驱动版本 */
  driver: string;
  /** `nvngx_dlssnr.dll` 版本 */
  version: string;
}

/** 导回阶段结果（`mm_dlss_finishResult` 的载荷）；尺寸 ≠ 区域时 `mode: 'document'` */
export interface DlssPlaced {
  mode: 'layer' | 'document';
  name: string;
  /** 只有 `mode: 'layer'` 有（结果层的实际落点） */
  left?: number;
  top?: number;
  width: number;
  height: number;
}
