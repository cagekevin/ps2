# 参考脚本（不参与构建、不参与部署、不被任何代码 import）

放这里的都是**参考资料**，不是运行时依赖。`.py` 不会被 `npm run build` / `npm run deploy` 打包，
仓里也没有任何模块读它。要真的用它，得按 `docs/plan/17-OCR成图层-2026-11-01.md` §9 接线。

| 文件 | 是什么 | 用途 |
|---|---|---|
| `ocr-image-to-text.py` | 本地 OCR 原型（RapidOCR，海报模式：`python 脚本 <图> <json>` 输出 `blocks[].content/rect/inferred_font_size`） | 现役实现走百度云 OCR；这份是**替代方案**的原型，也是 `core/ocr/blocks.ts` 两个公式（字号推断 / 段落合并）的原始出处 |
