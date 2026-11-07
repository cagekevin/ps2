# 高保真稿（mockup）怎么生成、怎么打开

给设计/评审用的稿子，两类产物分开管：现状快照（`dom-*` / `mockup-*` / `chk-*`）**不进仓库**，需要时按下面的命令重跑；重设计稿 `docs/preview/redesign/*.html` **已入库**（供评审直接打开）。
两个生成器都在 `tools/`，只读 `src/`，不改业务代码。重设计稿的 HTML 全部由 `tools/gen-redesign.mjs` 生成，改设计系统改顶部 `CSS` 常量后重跑；直接改 HTML 会在下次生成时被覆盖，需要时手动跑 `npm run check:preview` 看产物是否分叉。

---

## 一、现状快照（最保真：真 DOM + 真 CSS）

用途：把**当前实现**原样抓成静态页，用来对照 / 标注问题。不是设计稿，不许手改。

```bash
# 1. 起真应用（dev 用 src/dev/preview.ts 的假 PS 桥，不需要开 PS）
npm run dev            # http://localhost:5173

# 2. 抓每页渲染后的 DOM（样式在 dev 下是内联 <style>，一并带出）
#    Chrome 路径按本机调整；--virtual-time-budget 给够，否则抓到「加载中…」
chrome --headless=new --disable-gpu --virtual-time-budget=7000 \
  --dump-dom "http://localhost:5173/#/font" > docs/preview/dom-font.html
# 其余路由：/font-manage /common /style /set /debug → dom-manage.html 等

# 3. 去脚本、生成静态页 + 索引
node tools/make-mockup.mjs
# 产物：docs/preview/mockup-{font,manage,common,style,set,debug}.html
#       docs/preview/index.html（六页 iframe 并排，400×780）

# 4. 打开
start docs/preview/index.html
```

## 二、重设计稿（PS 原生风格 · 一套值 + 真图标）

用途：按一套设计系统重画，用来定方案。当前稿是 PS 深色面板方向：直角细线、控件压紧、蓝只给焦点与选中、浮层不反白。

```bash
node tools/gen-redesign.mjs
# 产物：docs/preview/redesign/{controls,font,manage,common,style,set,debug}.html + index.html
npm run check:preview   # 只比对产物与生成器，不写文件；手改 HTML 会红
start docs/preview/redesign/index.html
```

`controls.html` 是控件对照页（输入位三态 / 深色下拉 / 段选 / 勾选 / 按钮 / 消息行），看设计语言先看它。
图标从 `src/components/icons/index.tsx` 解析真 SVG（数量以运行时 `icons` 输出为准），文案取自真实组件与
`font-panel-constants.ts`。**不许用占位方块**——占位稿会被直接判为「不保真」。

设计系统写在 `tools/gen-redesign.mjs` 顶部的 `CSS` 常量里，改那里、重跑，七页同步变：

| 维度 | 值 |
|---|---|
| 间距 | 4 / 8 / 12 / 16 |
| 左右内边距 | 8（只写在容器上） |
| 控件高 | 22（标题栏 / 底栏 24、行 20） |
| 圆角 | 0（直角） |
| 字号 | 12 / 11 |
| 表面 | 面板与内容同底 `#2b2b2b` → 标题栏 `#262626` → 通栏块 `#242424` → 输入位 `#1e1e1e` → 按钮 `#383838` |
| 线条 | 暗线 `#1f1f1f`（分隔）/ 亮线 `#4a4a4a`（控件边） |
| 蓝 | `#2680eb`，只给焦点 / 选中 / 主操作；hover 一律叠白 |
| 浮层 | 深色 `#303030` + 亮线 + 投影，不反白 |

## 三、量宽度（别靠眼睛判断溢出）

```bash
node tools/measure-preview.mjs     # 给每页塞探针，生成 chk-*.html
chrome --headless=new --virtual-time-budget=3000 \
  --dump-dom "file:///<绝对路径>/docs/preview/redesign/chk-font.html" | Select-String MEASURE
# 期望：bodyClient == bodyScroll（相等 = 没有横向溢出）
```

---

## 踩过的坑（照着做可以省一轮）

1. **面板宽度完全自适应。** 用户想拖多宽就多宽（只要屏幕放得下），没有"标准宽度"，
   也不许假设任何范围。所以：不写死宽度、不按某个宽度调间距、布局只用 flex/grid 百分比，
   验证时至少量两个差距很大的宽度（比如 280 和 700），两边都不许溢出、不许拉散。
2. **横向内边距写在容器上**（`.body { padding: 0 var(--pad) }`，`--pad:8px`），满宽块用 `margin: 0 calc(-1 * var(--pad))` 铺到边缘。
   写在每个块上会让满宽块的负边距把内容顶出面板（实测横向溢出）。
3. **纵向间距只由容器 `gap` 给**，子块不写 margin。两处各给一半会让净间隔变成 6+6=12。
4. **不要用截图判断是否溢出。** headless Chrome 的 `--window-size` 有最小宽度，
   `--force-device-scale-factor=2` 后缩放再目测必然误判；用第三节的探针量。
5. **图标行沿用 PS 的 `space-between`**（一排工具图标撑满整行），不要改成左对齐——
   280 宽下左对齐会让右侧空一大片。
6. `--dump-dom` 之前先确认端口 200，且给 `--virtual-time-budget`，否则抓到的是「加载中…」。

## 收尾

```bash
# 关 dev
Get-NetTCPConnection -LocalPort 5173 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
# 只清现状快照产物；redesign/ 是入库稿，不在清理范围
Remove-Item -Force docs/preview/*.html, docs/preview/*.png -Recurse -ErrorAction SilentlyContinue
```
