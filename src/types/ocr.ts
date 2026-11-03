/**
 * OCR 的数据形状（纯类型）。
 *
 * 三层各有各的形状，别混：
 *   `OcrLine`  = 识别平台给的一行（含框），各平台先归一到它；
 *   `OcrBlock` = 合并后的一段文字（多行用 `\r` 连）+ 框 + 推断字号，是 `domain` 的输入；
 *   `OcrGroupSpec` / `OcrLayerSpec` = 给 jsx 的建层指令，jsx 只赋值、不算公式。
 *
 * 放 `types/` 是因为 `core` 与 `domain` 都要用，而 `domain` 不许 import `core`。
 */

export interface OcrLine {
  content: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface OcrBlock {
  /** 一段文字；多行用 `\r` 连接（原 jsx 直接喂给 `textItem.contents`） */
  content: string;
  rect: { left: number; top: number; width: number; height: number };
  /** 推断字号（参考脚本的 `inferred_font_size`：已向上取偶数、最小 12） */
  fontSize: number;
}

export interface OcrLayerSpec {
  name: string;
  content: string;
  left: number;
  top: number;
  size: number;
}

export interface OcrGroupSpec {
  name: string;
  layers: OcrLayerSpec[];
}

/** 导出图左上角在文档里的位置（px）。jsx 产出、`domain/ocr.toLayer` 消费，别在中间加第二次 */
export interface OcrOffset {
  left: number;
  top: number;
}

/**
 * 导出图 + 它在文档里的偏移。
 *
 * 有像素选区时 jsx 只导出选区，识别回来的坐标是图内坐标，加回 `offset` 才是文档坐标；
 * 无选区时整画布导出、`offset` 为 `{ 0, 0 }`。
 * 形状只有这一种（裸路径那条已删）：否则「jsx 导出图」会出现两种写法（`TD-01-31`）。
 */
export interface OcrExport {
  path: string;
  offset: OcrOffset;
}
