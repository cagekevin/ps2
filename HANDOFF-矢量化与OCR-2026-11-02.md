# HANDOFF · 矢量化改版 + 导出图形状收口（明天真机验一遍再往下做）

> 一次性交接单。长期契约在 `docs/plan/17-OCR成图层-2026-11-01.md`（已落地）与 `docs/plan/18-OCR只识别选区-2026-11-02.md`（形状已落地、功能未实现）。
> 本文只写「明天按什么顺序做什么、每步通过长什么样、失败改哪」。

## 1. 现状一句话

代码全部写完并已推送（`2181448`），`npm run check` 全绿（57 文件 / 556 条），但**三处改动一次真机都没跑过**：矢量化导出、OCR 导出形状、云同步上传结果。

矢量化这轮动的东西（都在 `jsx/main.jsx` 的 `mm_vec_exportLayer`）：

| 改动 | 原来 | 现在 |
|---|---|---|
| 导出范围 | 整份画布（`doc.width × doc.height`） | 只导出图层 `layer.bounds` |
| 尺寸 | 原样导出 | 长边不足 600 先放大（上限 8 倍，只放大不缩小） |
| 返回值 | 裸路径字符串 | `{ path, exportWidth, exportHeight, bounds }` |
| 坐标 | 图片坐标 = 文档坐标 | 经 `domain/vectorize.scaleSubpaths` 换算回文档 |

外加修了 `parseSvgPath` 一个 bug：闭合曲线（vtracer 输出的 `...c...Z`）的最后一段终点与起点重合时，起点拿不到进入控制柄，每个闭合轮廓的起点会变成尖角 —— 圆角正是在那里走样。

## 2. 三条命令（按顺序，都在仓库根）

```bash
npm run check      # 先确认还是全绿
npm run deploy     # 把 dist + jsx 推到 CEP 目录，不 deploy 就还是旧 jsx
```

第三条是手点，没有探针：探针只覆盖只读能力，矢量化会改文档。

## 3. 五件事（按顺序做，前四件各 1–2 分钟）

| # | 验什么 | 怎么验 | 通过长什么样 | 失败 → 改哪 |
|---|---|---|---|---|
| 1 | 矢量化：位置与尺寸 | 选一个礼盒图标（300px 左右）→ 点矢量化 | 形状层落在原图层的位置上，大小一致，圆角是圆的 | 位置整体偏移 ⇒ `scaleSubpaths` 的比例或 `bounds` 传错；层跑到左上角 ⇒ `offset` 没加（`bounds.left/top` 为 0） |
| 2 | 矢量化：喂给引擎的图 | 转完后打开 `$TMPDIR/ps_vec_engine/temp_layer.png` | 像素尺寸 = 图层尺寸 × 放大倍数（300px 图层 → 600px 图），图里只有图标、没有大片白边 | 还是 3000×3000 ⇒ 部署的还是旧 jsx；尺寸比预期小 ⇒ `VECTORIZE_MAX_UPSCALE` 上限生效（正常） |
| 3 | 矢量化：圆角 | 同上，放大到 200% 看礼盒四个角与蝴蝶结 | 四处圆角弧度一致，没有一处发尖 | 只有起点那一处发尖 ⇒ `parseSvgPath` 的 `Z` 分支没生效（看 `domain/vectorize.ts` 的 `upper === 'Z'` 段）；所有角都方 ⇒ 引擎输出问题，看第 4 步 |
| 4 | OCR：导出形状改动没弄坏链路 | 点一次「OCR」 | 照旧建出「✨ 智能重构布局」+ 模块组 | `PS_BAD_PAYLOAD` + `detail: field:path` ⇒ jsx 还是旧的（没 deploy）；建层位置整体偏移 ⇒ `offset` 不该非零，检查 `mm_ocr_exportImage` 返回值 |
| 5 | 云同步：判别位改名没漏消费点 | 设置页点一次「上传」 | 正常上传；台账比云端新时弹「确定覆盖？」 | 点了没反应 / 不弹确认 ⇒ `SettingsPage.tsx:154` 的 `outcome` 判断与 `commands/cloud.ts` 不一致 |

**第 3 步过不了就先停下**，别开始做选区 OCR —— 两边共用「jsx 返回对象 + 坐标换算」这套形状，矢量化没稳住就动第二个会两处一起返工。

## 4. 第 3 步失败时的二分法（1 分钟）

看 `$TMPDIR/ps_vec_engine/temp_layer.svg`（vtracer 的原始输出，用浏览器打开）：

- **SVG 本身圆角就尖** ⇒ 问题在输入图或引擎参数，不在我们的解析。下一步看 `temp_layer.png` 是不是糊的（放大插值太重），或调 `config.ts` 的 `VECTORIZE_OPTIONS`。
- **SVG 圆角是圆的、PS 里尖** ⇒ 问题在解析/建路径。先看 jsx 日志 `%TEMP%\maomao-jsx.log` 里 `mm_vec_replaceWithPath got subs=… built=… added=… points=…`：`built` 小于 `subs` 说明有子路径被跳过（点数 < 2），`points` 与前端算的对不上说明传输或建点有问题。

## 5. 第 3 步过了之后：OCR 选区识别

落点全在 `docs/plan/18-OCR只识别选区-2026-11-02.md` §4（7 处）+ §5（契约）。**2026-11-03 已全部落地，未真机**：

- jsx：`mm_ocr_exportImage` 切 px → `mm_ocr_selectionRect`（读 `selection.bounds` + clamp + 零尺寸兜底）→ 副本 `crop` → 返回 `{ path, offset }`。
- 前端：`domain/ocr.toOcrGroups(blocks, offset)` 第二参必填、`toLayer` 加偏移；`commands/ocr` 的 `offset` 与 `imagePath` 同生命周期。
- `bounds` 取数已确认（plan 18 §8 第 1 条）：PS 26.7 的 `selection.bounds.toSource()` 打印 `[{}, {}, {}, {}]`，即 4 个 `UnitValue`，统一走 `mm_px`。
- 剩：plan 18 §7 的 6 条验收要真机跑一遍（尤其「有选区只建选区内的层、位置与肉眼一致」）。

其余三条硬事实（已查证，不用再查）：无选区时 `selection.bounds` **抛异常**（不是返回整画布）；`crop` 吃 `[left, top, right, bottom]` 且单位跟 `rulerUnits`（进函数先切 `Units.PIXELS`）；裁完画布左上归零，偏移就是裁切矩形的左上角。

## 6. 探针脚本（不依赖 PS，随时可复跑）

都在 `tmp/`，产出 PNG 后直接用眼睛看：

```bash
node tmp/vec-gift.mjs      # 同一礼盒在 60/100/150/300/600/1200px 输入下的形状 → tmp/vec-gift.png
node tmp/vec-gift2.mjs     # 双线性 vs 最近邻放大、1200 直接渲染 vs 300 放大 → tmp/vec-gift2.png
node tmp/vec-look.mjs      # 现状参数 / 放大 / simplify 1 / simplify 2.5 → tmp/vec-compare.png
node tmp/vec-size-test.mjs # 表格数据：path 数 / 锚点 / 细线是否保留 / SVG 字节
```

依赖本机 Chrome（脚本里写死了 `/Applications/Google Chrome.app`），跑在 macOS 上。结论已经用过一轮：300px 输入的圆角明显比方，600 之后收益变小，`simplify` 才是降点的旋钮（`filterSpeckle` 在 0–16 范围内对输出几乎无影响）。

## 7. 已知限制（不是 bug，别当 bug 修）

- 只放大不缩小：4000px 的图层仍按 4000px 处理，慢但不丢细节。
- 放大上限 8 倍：20px 的小图最多到 160px，不会硬拉到 600。
- 空图层 / 全透明层返回 `skipped`（`PS_SKIPPED`），不报错、不建层。
- `bw` 模式只出一色填充：彩色图标会被阈值化成单色，颜色取第一条非背景 path 的 `fill`。彩色分层是另一个功能。
- OCR 的 `offset` 只在 `domain/ocr.toLayer` 加一次；jsx 只产出、命令层只透传，别在中间再算一遍（会双重偏移）。

## 8. 交接清单

- 已推送：`2181448`（21 文件）。
- 体检报告：`daily/架构日志/07-跨区-矢量化导出形状体检-2026-11-02.md`（四条债全结，主表剩 11 条）。
- 未真机：本文 §3 的五件事全部 + plan 18 §7 的六条验收。
- 下一步只做一件事：真机跑完 §3 第 1–5 步与 plan 18 §7，任一不过就停下来改，别叠加新功能。
