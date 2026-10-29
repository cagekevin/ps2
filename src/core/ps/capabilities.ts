/**
 * 本域（PS 能力）以此为准：`src/core/ps/capabilities.ts` 一行一个能力 + `core/ps/<域>.ts` 的薄函数。新增 jsx 只加表行，不写第二套通道 / 解析。
 *
 * 【范本】PS 能力表（唯一事实）
 *
 * 一行一个能力：`fn` 是 jsx 函数名，`parse` 决定「返回什么形状 + 认不出时算不算失败」。
 * 新增 PS 能力照此结构：往 `CAP` 里加一行，再在 `core/ps/<域>.ts` 里包一层语义函数
 * （如 `setFontByNames`）；**不许**在能力函数里重写门 / 前置 / 调用 / 解析。
 *
 * 每个字段逐条写死，不接受「按通道取默认」：
 *   gate    core（`mm_*` 自有 jsx）/ vendor（`ys_ / zt_ / cy_` 官方副本）
 *   channel direct（原版 `jsx`）/ dispatch（原版 `jsxHistory*`）——按原版调用点选，不按前缀猜
 *   timeout 读 30s / 写 60s / 扫全机字体 300s
 *   parse   `./raw.ts` 的具名解析器；`lenientVoid` 是 UNVERIFIED 的历史妥协，收紧要单独一轮
 *
 * `require` 是执行器的**第一步**：先判「当前图层对不对」，不对就终止，一条 jsx 都不发。
 * 判定走 `./layer` 的 `requireLayerKind`（唯一出口），这里只引用它，不写图层类型映射。
 *
 * 文字属性类能力**一律**带 `requireTextLayer`。真机上这批函数在非文字图层上不报错、返回
 * `undefined`、什么都不做（2026-10-28 日志 `raw:"undefined"`），不判就是「提示成功但图层没变」。
 */

import { LONG_TIMEOUT, READ_TIMEOUT, WRITE_TIMEOUT } from '../cep/bridge';
import { isRecord } from '../../types/guards';
import type { CapabilitySpec } from './capability';
import { requireSelection, requireShapeLayer, requireTextLayer } from './layer';

/** 「多选」类操作至少 2 个图层：位置对换 / 颜色互换 / 按间距分布都要成对才有意义 */
const requireTwoLayers = () => requireSelection(2);

/** 字体信息载荷：必须是对象且 `fonts` 非空，否则算读失败（没有字体项的信息没有意义） */
function fontsOf(data: unknown): Record<string, unknown> | null {
  if (!isRecord(data)) return null;
  const fonts = data.fonts;
  return Array.isArray(fonts) && fonts.length > 0 ? data : null;
}
import {
  lenientVoid,
  parseDataEnvelope,
  parseFontFamily,
  parseSystemFontList,
  passthrough,
  sentinelJson,
  strictData,
  strictPayload,
  strictVoid,
  unwrapRaw
} from './raw';

/** `err === 1` 且宿主没给 `msg` 时的兜底文案（宿主一般会给，如「请选择文字图层」） */
export const FONT_UNAVAILABLE = '字体不可用（系统里可能没装这个字体）';

export const CAP = {
  /* ---------------- 字体：应用与系统字体列表 ---------------- */

  /** 字体管理页点字体：系统字体直调，明文参数（不要 `encodeText`） */
  setFont: {
    fn: 'ztgl_setFont', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: strictVoid(FONT_UNAVAILABLE)
  },

  /** 应用样式库字体：参数要先 `encodeText`，解析与 `setFont` 同一套严格判据 */
  applyFont: {
    fn: 'ys_useFont', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: strictVoid(FONT_UNAVAILABLE)
  },

  /** 扫全机字体：300s（不能按「读」的 30s）；哨兵 / 数组的判定在 `parseSystemFontList` */
  systemFontList: {
    fn: 'ztgl_initSystemList', gate: 'vendor', channel: 'direct', timeout: LONG_TIMEOUT,
    parse: parseSystemFontList
  },

  /* ---------------- 文本属性：读 ---------------- */

  /** 属性快照：`err !== 0` 当失败，其余交 `data` 载荷 */
  textInfo: {
    fn: 'zt_getFontSimpleInfo', gate: 'vendor', channel: 'direct', timeout: READ_TIMEOUT,
    require: requireTextLayer, parse: strictData('当前图层没有可读的文字属性')
  },

  /** 字体快选「加当前图层」：只拆 `data`，不判 err（原版不拦） */
  currentFontInfo: {
    fn: 'zt_getCurrentFontInfo', gate: 'vendor', channel: 'direct', timeout: READ_TIMEOUT,
    require: requireTextLayer, parse: parseFontFamily
  },

  /** 翻译的输入：条目里有混淆过的 `text`，同样只拆 `data` */
  currentText: {
    fn: 'zt_getCurrentText', gate: 'vendor', channel: 'direct', timeout: READ_TIMEOUT,
    require: requireTextLayer, parse: parseDataEnvelope
  },

  /** 取色：拉起系统取色器，返回值是 `{ rgb }`；取到的色只能写到文字图层上 */
  textColor: {
    fn: 'zt_setFontColor', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: parseDataEnvelope
  },

  /* ---------------- 文本属性：写（22 个，直调 60s + 前置 + 宽松解析） ----------------
     前置必须写在表里，不能靠调用方自觉：真机上这批写函数在非文字图层上**不报错、返回 `undefined`、
     什么都不做**（2026-10-28 日志 `raw:"undefined"`），`lenientVoid` 会把它当成功——
     界面提示成功、图层没变。执行器把前置放在第一步，不通过直接终止，一条 jsx 都不发。
     唯一例外是 `distributeByPitch`：它的对象是多个图层，前置是「≥3 选中」而不是「是文字图层」。 */

  /** 换字面：`err === 1` 不止字体缺失，原因取宿主 `msg` */
  setFontName: {
    fn: 'zt_setFontName', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('字体不可用')
  },

  /** 面板输入的字号，与层级字号是两条 jsx */
  setNumberSize: {
    fn: 'layer_font_setFontSize', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持改字号')
  },

  /** 层级字号（层级面板点一下） */
  setHierarchySize: {
    fn: 'zt_setFontSize', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持改字号')
  },

  setLeading: {
    fn: 'layer_font_setLeading', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持改行距')
  },

  setTracking: {
    fn: 'zt_setFontWordSpacing', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持改字距')
  },

  setAllCaps: {
    fn: 'zt_setFontAllCaps', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持切换大小写')
  },

  setFontVision: {
    fn: 'zt_setFontVision', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持视觉调整')
  },

  /** 倾斜：jsx 侧原版拼写照抄（`zt_setFauxItali`），别改成 Italic */
  setFauxItalic: {
    fn: 'zt_setFauxItali', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持倾斜')
  },

  setFauxBold: {
    fn: 'zt_setFontAddBold', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持加粗')
  },

  /** 段落对齐：属性面板 Ctrl+点击才走这条 */
  setJustified: {
    fn: 'zt_setFontJustified', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持段落对齐')
  },

  /** 点文本对齐：第二参数「不传」与「传 false」是两种调用，由调用方决定是否带上 */
  setTextAlignment: {
    fn: 'zt_setTextAlignment', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持文本对齐')
  },

  setHorizontalCenters: {
    fn: 'zt_setHorizontalCenters', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持水平居中分布')
  },

  setVerticalCenter: {
    fn: 'zt_verticalCenter', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持垂直平均分布')
  },

  setUpDownAlign: {
    fn: 'zt_setUpDownAlign', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持垂直对齐')
  },

  /** 与背景对齐：jsx 侧原版拼写照抄（`zt_setBackrgoudAlign`） */
  setBackgroundAlign: {
    fn: 'zt_setBackrgoudAlign', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持与背景对齐')
  },

  /** 水平垂直居中：只服务第二入口，字体面板不放按钮 */
  alignHorizontal: {
    fn: 'zt_alignHorizontal', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持居中对齐')
  },

  /**
   * 按间距分布：4 个参数，第 3 个固定 `2`；与常用页同名函数是**两套参数**（§11.4 第 1 条）。
   * 前置是「≥3 选中图层」而不是文字图层——分布的对象是多个图层，不限于文字。
   */
  distributeByPitch: {
    fn: 'cy_distributedByPitch', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTwoLayers, parse: lenientVoid('当前图层不支持按间距分布')
  },

  /**
   * 拆分/合并：1 分行 / 2 分为单个 / 3 合并 / 4 合并为段落。
   *
   * 原版还有一步前置确认 `zt_changeTextBranchMerge`，真机一调就抛「没有这种元素」
   * （2026-10-28 日志）——它只是原版派发表的 key，不是可调函数，已从表和探测清单移除。
   */
  textBranchMerge: {
    fn: 'zt_textBranchMerge', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持拆分或合并')
  },

  /** 生成按钮：参数是一个对象 `{ type, isLine, padding }` */
  createButton: {
    fn: 'zt_createButton', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层无法生成按钮')
  },

  switchFontDirection: {
    fn: 'zt_switchFontDirection', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持切换文本方向')
  },

  /** 写回译文：`replace` 为真 = 覆盖原文 */
  setTranslateText: {
    fn: 'zt_setTranslateText', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    require: requireTextLayer, parse: lenientVoid('当前图层不支持写回译文')
  },

  /* ---------------- 常用页（§11.4：通道按原版调用点分，不按前缀猜） ---------------- */

  /** 放大 / 缩小：直调（原版 `jsx`），没选中图层由 jsx 自己返回约定值 */
  zoom: {
    fn: 'cy_zoom', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    parse: lenientVoid('当前图层不支持缩放')
  },

  flip: {
    fn: 'cy_transformPosition', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '自由变换', parse: unwrapRaw
  },

  /** 位置对换：两个图层互换位置，单选没有意义 */
  locationTrade: {
    fn: 'cy_locationTrade', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '位置对换', require: requireTwoLayers, parse: unwrapRaw
  },

  /**
   * 元素替换：大写 L 照抄。
   *
   * 按「成对操作一律 ≥2」挂前置。**UNVERIFIED**：若真机证明它是「选中 1 个图层 + 外部元素
   * 替换」，这行会把正常操作挡掉——那时去掉 `require` 即可（一行）。
   * 不挂的后果更糟：单选时 PS 只回一句笼统的「请确认已选中图层」，用户明明选中了。
   */
  layerReplace: {
    fn: 'cy_LayerReplace', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '元素替换', require: requireTwoLayers, parse: unwrapRaw
  },

  /** 图层颜色互换：两个图层互换颜色，单选没有意义 */
  exchangeLayerColor: {
    fn: 'cy_exchangeLayerColor', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '图层颜色互换', require: requireTwoLayers, parse: unwrapRaw
  },

  /** 修正边缘模糊：派发 key 是拼错的 `cy_coorectBlur`，函数名是这个 */
  correctBlur: {
    fn: 'cy_correctRectangleBlur', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '修正边缘模糊', parse: unwrapRaw
  },

  /** 填充线框互换：既是派发 key 也是函数名（`case 36` → `jsxHistory`） */
  swapWireframeFill: {
    fn: 'cy_swapWireframeFill', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '填充线框互换', parse: unwrapRaw
  },

  /** 按间距分布：常用页形态是 3 个参数（`gap` 是字符串），与文本面板的 4 参形态不是同一条调用 */
  distribute: {
    fn: 'cy_distributedByPitch', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '按间距分布', require: requireTwoLayers, parse: unwrapRaw
  },

  referenceWidth: {
    fn: 'cy_createSafeAreaGuide', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '生成安全区域参考线', parse: unwrapRaw
  },

  /** 清除参考线：与切片同一个函数，参数 `1` */
  clearGuide: {
    fn: 'cy_guideFunction', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    parse: lenientVoid('清除参考线失败')
  },

  /** 按参考线切片：同一个函数，参数 `2` */
  sliceByGuide: {
    fn: 'cy_guideFunction', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    parse: lenientVoid('按参考线切片失败')
  },

  /** 打开当前文件所在目录：**无参**，直调 */
  openDirectory: {
    fn: 'cy_openDirectory', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    parse: lenientVoid('打开所在目录失败')
  },

  /** 让 jsx 弹选图对话框：返回结构未实测，raw 原样交出（按 JSON 解析会把裸路径判成 CORRUPT） */
  imagePath: {
    fn: 'cy_getImagePath', gate: 'vendor', channel: 'direct', timeout: READ_TIMEOUT,
    parse: passthrough
  },

  /** 扫文件夹取 PSD 列表：jsx 自己弹选目录，**无参**，返回同样不解码 */
  psdList: {
    fn: 'cy_getPsdForFolder', gate: 'vendor', channel: 'direct', timeout: READ_TIMEOUT,
    parse: passthrough
  },

  /* ---------------- 常用页 v2：嵌入 / 智能对象 / 优化 / 变换 / 导出（plan 13 §1.2） ----------------
     通道逐条按原版调用点，不按前缀猜：`cy_insertionImage` 走 `jsxHistory`、
     `Layer_placedLayerRelinkToFile` 走 `jsx`，二者同为「嵌入」却是两条通道。

     超时：**调度通道一律 30s**（`capability.test.ts` 的硬规则）——调度器只把任务转发给宿主，
     耗时发生在 jsx 内部，把超时放宽不会让长任务更安全，只会让「点了没反应」多等几分钟。
     导出这类长任务因此也不放宽（plan 13 原来写的 120s 作废，见该文件 §11）。 */

  /** 嵌入图片：`path` 恒空 = 用 PS 里当前置入的图，参数由 commands 拼 */
  embedImage: {
    fn: 'cy_insertionImage', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '嵌入图片', parse: unwrapRaw
  },

  /** 嵌入多图片：jsx 自己处理拖入的多图，无参 */
  embedMultipleImage: {
    fn: 'cy_embedMultipleImage', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '嵌入多图片', parse: unwrapRaw
  },

  /** 导入多图片：参数 `[{ path, toLinkObject }]` */
  importMultipleImage: {
    fn: 'cy_importMultipleImage', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '导入多图片', parse: unwrapRaw
  },

  /** 转链接智能对象（改路径）：直调，参数 `[path]` */
  relinkPlacedLayer: {
    fn: 'Layer_placedLayerRelinkToFile', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    parse: lenientVoid('转链接智能对象失败')
  },

  toLinkSmartObject: {
    fn: 'cy_smartToLinkSmartObject', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '转链接智能对象', parse: unwrapRaw
  },

  linkSmartObjectToSmartObject: {
    fn: 'cy_linkSmartObjectToSmartObject', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '转智能对象', parse: unwrapRaw
  },

  /** 优化当前文档：参数是三个开关组成的一个对象 */
  optimizeDoc: {
    fn: 'cy_optimizeDoc', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '优化文档', parse: unwrapRaw
  },

  /** 优化单个 PSD：直调，参数 `[option, file]`；跨文档的循环在 commands（§8 例外） */
  batchOptimizeDoc: {
    fn: 'cy_batchOptimizeDoc', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    parse: lenientVoid('优化文档失败')
  },

  /** 自定义变换：参数顺序由 `CustomTransformParams` 具名字段保证，见 `common-use.ts` */
  customBuildTransform: {
    fn: 'cy_customBuildTransform', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '自定义变换', parse: unwrapRaw
  },

  /** 导出当前图片：整块 `cyExport`，导出比普通写慢，给 120s */
  exportImage: {
    fn: 'cy_ExportImage', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '导出图片', parse: unwrapRaw
  },

  /** 导出一级 / 二级图层：同一个配置块，函数不同 */
  exportFirstLevelLayers: {
    fn: 'cy_BatchExportLayer', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '批量导出一级图片', parse: unwrapRaw
  },

  exportSecondLevelLayers: {
    fn: 'cy_BatchExportSecondLayer', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '批量导出二级图片', parse: unwrapRaw
  },

  /** 单个 PSD 导图：`Bacth` 是官方拼写，照抄 */
  exportPsdImage: {
    fn: 'cy_BacthExportPsdToImage', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '导出 PSD', parse: unwrapRaw
  },

  /* ---------------- 动作页（05）：两条 jsx，通道不同 ---------------- */

  /**
   * 执行 PS 动作：官方走**调度**，参数是**整个 item**（`{group,name,alias?}`），
   * 官方历史名 `n` 是「动作-名」，这里静态写「动作」（`n` 只影响 PS 历史面板显示名）。
   *
   * 超时给 300s：批处理式动作可能跑几分钟。**这是调度通道唯一的超时例外**，
   * 白名单写在 `capability.test.ts` 里（`LONG_RUN_DISPATCH`），新增例外必须同时改那处。
   */
  callAction: {
    fn: 'dz_callAction', gate: 'vendor', channel: 'dispatch', timeout: LONG_TIMEOUT,
    label: '动作', parse: unwrapRaw
  },

  /** 取 PS 动作面板的分组与动作：直调、无参；返回形状交给 `domain` 归一（Vue 版也是这么做的） */
  getActionList: {
    fn: 'dz_getActionList', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
    parse: passthrough
  },

  /* ---------------- 常用页 v2：事件驱动（无 UI 按钮，由 watcher 触发） ---------------- */

  /** 智能填色：前景色方向 */
  smartFillColor: {
    fn: 'cy_smartFillColor', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '智能填充颜色', parse: unwrapRaw
  },

  /** 智能填色：背景色方向（填边框色），与上一条是两个函数 */
  smartFillLineColor: {
    fn: 'cy_smartFillLineColor', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '智能填充边框颜色', parse: unwrapRaw
  },

  /** 智能参考线：参数是 `singleRow` / `singleColumn` */
  smartReferenceLine: {
    fn: 'cy_smartReferenceLine', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '智能参考线', parse: unwrapRaw
  },

  /* ---------------- 样式：颜色走自有 jsx（gate core），渐变 / 图层样式走调度 ---------------- */

  /**
   * 读当前图层字体属性（复制字体样式用）：`false` = 不是文字图层、`{err:1}` = 读失败。
   * `fonts` 为空也按读失败——没有字体项的「字体信息」没有意义。
   */
  fontInfo: {
    fn: 'ys_getFontInfo', gate: 'vendor', channel: 'direct', timeout: READ_TIMEOUT,
    parse: strictPayload({
      whenFalse: '当前图层不是文字图层',
      whenFailed: '读取字体属性失败',
      accept: fontsOf
    })
  },

  /**
   * 读当前图层的渐变定义：`false` = 图层没有渐变、`{err:1}` = 读失败。
   * `data` 是**不透明载荷**：官方 `app.v4.js:50768` 把它整份塞进 `gradient`，我们同样不挑字段；
   * 收窄发生在读回时的 `domain/gradientItem`。别在这里给 `data` 加字段校验。
   */
  gradientInfo: {
    fn: 'ys_getGradientInfo', gate: 'vendor', channel: 'direct', timeout: READ_TIMEOUT,
    parse: strictPayload({
      whenFalse: '当前图层没有可读取的渐变',
      whenFailed: '读取渐变失败',
      accept: (data) => (data === null || data === undefined ? null : data)
    })
  },

  /** 应用颜色：移植版只读 `item.color`，不认 `isFill` */
  applyStyleColor: {
    fn: 'mm_style_applyColor', gate: 'core', channel: 'direct', timeout: READ_TIMEOUT,
    parse: unwrapRaw
  },

  /** 智能填充形状（ctrl + 点色块）：jsx 对非形状返回 `not-shape`，这里提前到第一步 */
  applyShapeFill: {
    fn: 'mm_style_applyShapeFill', gate: 'core', channel: 'direct', timeout: READ_TIMEOUT,
    require: requireShapeLayer, parse: unwrapRaw
  },

  /** 线框色（shift + 点色块）：只对形状有效，同样提前判 */
  applyBorderColor: {
    fn: 'mm_style_applyBorderColor', gate: 'core', channel: 'direct', timeout: READ_TIMEOUT,
    require: requireShapeLayer, parse: unwrapRaw
  },

  /** 取前景色：返回库项形状 `{ name, color: { hex, c, m, y, k } }`，解析出来就是载荷 */
  foregroundColor: {
    fn: 'mm_style_getForegroundColor', gate: 'core', channel: 'direct', timeout: READ_TIMEOUT,
    parse: sentinelJson
  },

  /** 应用渐变：原版传项里的 `gradient` 字段，走调度 */
  applyGradient: {
    fn: 'ys_useGradient', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '填充渐变色', parse: unwrapRaw
  },

  /** 切 PS 工具（快速吸色用 `Tool_set('eyedropperTool')`）：直调，但在官方副本里 */
  setTool: {
    fn: 'Tool_set', gate: 'vendor', channel: 'direct', timeout: READ_TIMEOUT,
    parse: unwrapRaw
  },

  /** 应用图层样式：`{ ...项, groupId }`，走调度 */
  applyStyle: {
    fn: 'ps_ysBtnUseStyle', gate: 'vendor', channel: 'dispatch', timeout: READ_TIMEOUT,
    label: '应用样式', parse: unwrapRaw
  }
} satisfies Record<string, CapabilitySpec<unknown>>;
