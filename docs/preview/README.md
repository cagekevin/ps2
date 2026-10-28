# 高保真稿（mockup）怎么生成、怎么打开

给设计/评审用的稿子。**生成物不进仓库**（`docs/preview/` 下只有本文件），需要时按下面的命令重跑。
两个生成器都在 `tools/`，只读 `src/`，不改业务代码。

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

## 二、重设计稿（一套值 + 真图标）

用途：按一套设计系统重画，用来定方案。

```bash
node tools/gen-redesign.mjs
# 产物：docs/preview/redesign/{font,manage,common,style,set,debug}.html + index.html
start docs/preview/redesign/index.html
```

图标从 `src/components/icons/index.tsx` 解析真 SVG（93 个），文案取自真实组件与
`font-panel-constants.ts`。**不许用占位方块**——占位稿会被直接判为「不保真」。

设计系统写在 `tools/gen-redesign.mjs` 顶部的 `CSS` 常量里，改那里、重跑，六页同步变：

| 维度 | 值 |
|---|---|
| 间距 | 4 / 8 / 12 / 16 |
| 左右内边距 | 10（只写在容器上） |
| 控件高 | 26（页头 40、底栏 28、行 22） |
| 圆角 | 4 |
| 字号 | 13 / 12 / 11 |
| 表面 | 页面 `#2b2b2b` → 面板 `#363636` → 凹陷 `#222` → 按钮 `#4a4a4a` |
| 线条 | 区块 `#333` / 列表行 `#2e2e2e` |

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
2. **横向内边距写在容器上**（`.body { padding: 0 10px }`），满宽块用 `margin: 0 -10px` 铺到边缘。
   写在每个块上会让满宽块的负边距把内容顶出面板（实测溢出 10px）。
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
# 清生成物
Remove-Item -Force docs/preview/*.html, docs/preview/*.png -Recurse -ErrorAction SilentlyContinue
```
