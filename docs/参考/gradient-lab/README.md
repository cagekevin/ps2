# 渐变实验室 · 对照引擎（仅参考）

抓自 `https://mudong-gradient.pages.dev`（木东东东 · 渐变实验室）的公开前端，用于
`docs/plan/24-渐变面板-2026-11-14.md` 的**数值对齐**：我们只做 LCH 短/长 + sRGB 直插，
单测里的期望值要从这份源码的口径来，不靠感觉调。

| 文件 | 是什么 | 用途 |
|---|---|---|
| `color-core.js` | 站点自己的颜色引擎（15.8 KB），`createSampler` / `huePath` / `gamutMapSrgb` / `uniformLightnessSample` 都在这里 | 写 `domain/gradient.ts` 时逐行对照；**不参与构建、不被任何代码 import** |

## 它依赖什么（我们**不**引入）

末尾 `import ... from './vendor/culori-4.0.2.min.mjs'` —— Culori 4.0.2（MIT，63 KB）。
引入前要按 `CONVENTIONS` §2「单个 > 30 KB 需单独确认」走一遍，所以 v1 **不引**：
LCH(D50) 的正反变换与色域收色（保 `L`/`h`、二分降 `C`）自己写，约 120 行。

因此本文件**不能直接跑**（缺 Culori）。它的价值是「读」，不是「跑」。

## 抄什么、不抄什么

抄（数值口径）：

- LCH / LCHuv 用 **D50**；OKLCH 系列用 D65。v1 只做 LCH，所以只关心 D50。
- 色相路径判据：`delta > 180`（或正好 180 且反向）取负；`long` 反号。
- 中性色（RGB 三通道相等）**必须清掉色相**，否则 Lab 换算的舍入会把灰染成彩（`convertStop` 里专门处理）。
- 色域收色是 **CSS Color 4 §13.2（OKLCH local-MINDE）**，站点经 Culori 的 `toGamut('rgb','oklch')` 走的也是这套。
  我们自己实现同一算法（约 60 行），实测 15 组样本逐点全等 —— **不要**改成「保 `L`/`h` 二分降 `C`」，
  那是另一套策略，高饱和过渡的中间色会明显不同。

不抄：

- 8 种色彩空间的切换、`uniformLightness`（均匀明度）、明度曲线、Culori 全套。
- 图片取色 / 图片试色 / 分享 / 预设库 —— 站点的获客功能，与本插件无关。

## 权属

站点前端代码不属于本仓资产，**仅本地参考、不得分发**，处理方式同 `docs/参考/瓣公宇宙jsx/`。
