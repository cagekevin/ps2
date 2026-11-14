# 参考脚本（不参与构建、不参与部署、不被任何代码 import）

放这里的都是**参考资料**，不是运行时依赖。`.py` 不会被 `npm run build` / `npm run deploy` 打包，
仓里也没有任何模块读它。要真的用它，得按 `docs/plan/17-OCR成图层-2026-11-01.md` §9 接线。

| 文件 | 是什么 | 用途 |
|---|---|---|
| `ocr-image-to-text.py` | 本地 OCR 原型（RapidOCR，海报模式：`python 脚本 <图> <json>` 输出 `blocks[].content/rect/inferred_font_size`） | 现役实现走百度云 OCR；这份是**替代方案**的原型，也是 `core/ocr/blocks.ts` 两个公式（字号推断 / 段落合并）的原始出处 |
| `瓣公宇宙jsx/` | 第三方「瓣公宇宙」插件自带的 PS 侧 ExtendScript（JSXBIN 解码），含移除背景 / 栅格化 / 批量选层 / 智能对象 / 填充 / 翻转旋转 / 导入导出等 | 抄 PS 动作写法时的对照物；**仅本地参考、不得分发**。详见该目录 `README.md` |
| `vendor.jsxbin` | 官方「稿定设计助理」PS 侧脚本的 jsxbin 原件（`@JSXBIN@ES@2.0@…`，338KB，从 `docs/色板工具本地版_AI禁止读/jsx/` 移来） | **只作解码对照**：仓里加载的是 `jsx/vendor.jsx`（解码源码，见其 `vendor.README.md`）；不要拿这份二进制当实现参考 |
| `gradient-lab/` | 「渐变实验室」站点的颜色引擎（`color-core.js`，公开前端） | `plan 24` 渐变面板的**数值对齐口径**（D50 / 色相路径 / 中性色不染色相）；**仅本地参考、不得分发**。详见该目录 `README.md` |
