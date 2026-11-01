/**
 * 【唯一可调参数表】改地址、体积上限、排版系数，只改这个文件。
 *
 * 三条规矩：
 *   1. 本文件是**叶子**：不 import 任何模块。`core` / `domain` / `commands` / `features` 都能 import 它。
 *   2. 只收「可能被调整的值」：服务地址、体积与超时、排版系数、默认名字。
 *   3. **不收协议形状**（百度表单字段名、错误码表、jsx 函数名）—— 那些是实现细节，改了就是改代码。
 */

/* ---------------- 云同步（Google Apps Script 网关） ---------------- */

/**
 * 云同步网关。**地址即账号**：换一个部署地址就是换一份数据。
 *
 * 地址不是凭证（2026-10-30 实测）：部署要求 Google 登录态，CEP 的 `fetch` 没有登录态，
 * 拿到的是 401 + HTML，不是 JSON。要让面板可用必须把部署权限改成「任何人」——那一步在
 * Google 侧，代码改不了。
 *
 * 不要外传、不要打进公开构建、不要写进 README / 截图。
 */
export const CLOUD_SYNC_URL =
  'https://script.google.com/macros/s/AKfycbyNJHgNZMci2kIY0jfhozriJYwPkw4phoUZh7nWwW1rw3ZlJaWg282EygOEnyxyka6X/exec';

/* ---------------- 百度翻译 ---------------- */

/** 百度翻译通用接口（注意是 `http://`，`nodeGet` 会按协议选 `http` 模块） */
export const TRANSLATE_URL = 'http://api.fanyi.baidu.com/api/trans/vip/translate';

/**
 * 官方内置应用的 appid / key（原版硬编码的那一对，不是我们自己的账号）。
 * 换成自己的账号就改这两行。
 */
export const TRANSLATE_APP_ID = '20200914000565553';
export const TRANSLATE_KEY = 'GhNw0VLPC2EiKagG8Xwn';

/* ---------------- 百度 OCR ---------------- */

/** 取 access_token（`client_id` = 应用的 API Key，`client_secret` = Secret Key） */
export const OCR_TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token';
/** 通用文字识别（标准含位置版）：返回逐行 `words` + `location` */
export const OCR_URL = 'https://aip.baidubce.com/rest/2.0/ocr/v1/general';
/** 百度单图上限 4MB（base64 后体积涨约 1/3，调用方按原图字节判） */
export const OCR_MAX_IMAGE_BYTES = 4 * 1024 * 1024;
/** 一次往返上限：大图识别 5–10s，给 30s；低于 15s 会误杀 */
export const OCR_TIMEOUT_MS = 30_000;
/** 导出质量档：q8 超上限就降一档，三档都超才报错 */
export const OCR_QUALITIES = [8, 6, 4] as const;

/* ---------------- OCR 排版系数 ---------------- */
/* 出处：`docs/参考/ocr-image-to-text.py`（RapidOCR 原型脚本）。改这些等于改排版行为。 */

/** 字号推断：平均字宽的权重 */
export const SIZE_BY_WIDTH = 0.7;
/** 字号推断：框高的权重 */
export const SIZE_BY_HEIGHT = 0.3;
/** 字号下限（再小也按这个建层） */
export const MIN_FONT_SIZE = 12;

/** 段落合并：垂直间距 < 当前块字号 × 该系数 */
export const Y_TOLERANCE_RATIO = 1.5;
/** 段落合并：左边界差 < 该像素数 */
export const X_TOLERANCE = 20;
/**
 * 段落合并：两块字号相对差 < 该比例才合并。
 *
 * 这一条是原脚本没有的：原脚本只判间距与左边界，导致「大标题 + 紧跟的正文」被并成一段
 * （标题字大 → 阈值 1.5× 也大）。加上字号接近判据后，标题与正文自然分开。
 */
export const SIZE_TOLERANCE_RATIO = 0.3;

/** 分组：垂直间距 > 上一块字号 × 该系数就开新组 */
export const GROUP_GAP_RATIO = 3;
/** 建层字号 = 推断字号 × 该系数（PS 里看着对的经验值，与推断是两段，别合成一个） */
export const SIZE_MULTIPLIER = 1.3;
/** 图层名截断长度 */
export const NAME_MAX = 15;
/** 承载全部文字层的组名 */
export const MASTER_GROUP_NAME = '✨ 智能重构布局';
/** 子组名前缀（后面接 1、2、3…） */
export const GROUP_PREFIX = '模块 ';
