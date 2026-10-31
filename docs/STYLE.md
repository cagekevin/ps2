# 样式与视觉规范（强制）

> **这是什么**：全仓界面规则的唯一出处。原 `CONVENTIONS.md` 的三节整块迁到这里 ——
> §6（UI 横切：用哪个件、表面长什么样）、§7（视觉规范）、§14（样式），2026-10-30 拆分，正文里只留指针。
>
> **编号不变**：章节号与规则号沿用原号 —— 本文的「§6.1」「§7 规则 12」「§14.1」就是代码注释、评审报告、
> `CHANGELOG` 里那些字面量，**不需要换算**。新增界面规则一律进本文，规则号从 19 继续往下编。
>
> **谁在用**：改任何 css / token / 组件表面 / 图标档位 / 间距之前读本文；`CONVENTIONS.md` 只管「怎么写代码」，
> 不管「长什么样、该用哪个件」。
>
> **值不在这里**：唯一允许写原始色值与 px 的文件是 `src/styles/tokens.css`，本文只写「用哪一个、为什么」。
> 复述过一次值，2026-10-29 重构后整块过期，成了第二套标准。
>
> **禁止**：把本文的规则抄回 `CONVENTIONS.md` 或写进页面注释当第二份标准；一条规则只在一处。

---

## 6. UI 横切（7 项）

| 横切 | 入口 | 禁止 |
|---|---|---|
| 提示 | `useToast()` | `alert()` |
| 确认 | `useConfirm()` | `confirm()` |
| 加载 | `useLoading()` | 各组件自己维护 loading 文案 |
| 区域不可用 | `components/StateMask`（内部渲染 `StateHint`） | 页面自己写绝对定位 + 提示文案；也**不要**用「把内容换成一行提示」代替（会让下面的东西整体上移） |
| 图标 → 展开面板 | `<IconPanelGroup>` + `<IconPanel>`。抽屉表面（`#222` / 直角 / 通栏 / 12 内边距）只由 `icon-panel.css` 的 `__box` 给；左右通栏靠 `--mm-icon-panel-bleed`（值 = 承载行的左右 padding，由那一行声明，不声明即 0；页面根壳声明为 `--mm-page-pad-x`）。**底色用 `__box::before` 左右铺**（`top/bottom:0` + `left/right: calc(-1 * bleed)` + `z-index:-1`，`__box` 自己要 `isolation: isolate`），**不要用负 margin**；`__box` 的上下 padding 固定 `--mm-space-2`(8)、左右 0（组件给，页面不许覆写）——那会把 `__box` 连内容一起拉宽 | 页面自己写「谁开着 / 互斥 / 再点关闭」；点外部或 Esc 自动关；给 `__box` 覆写 padding / 底色 / 圆角；在承载组的那一行上加 padding（会缩抽屉，改用 `--mm-icon-panel-bleed`） |
| 勾选框 | `components/CheckBox` | 裸写 `<input type="checkbox">`、自己画方框 |
| 单选框 | `components/RadioButton` | 裸写 `<input type="radio">`、靠 state 假装互斥（原生靠 `name`） |
| 页面标题 | **一律不加**（2026-10-30）：导航上已写着页名，页内再放一条标题就是白占一行；`PageHeader` 组件与 `--mm-header-h` 已随之一并删除 | 页面写 `<header>` / `__title` 标题条，或再造一个页头组件 |
| 页面底栏 | `components/BottomBar`（`BottomBar` / `BottomBarButton` / `BottomBarDivider`） | 页面自绘 26 高底条、自己调按钮宽与 hover 描边 |
| 按钮 | `components/ui` 的 `Button`（**全仓唯一渲染入口**，支持 `ref`）。`variant` **闭合在类型里**，写错编译失败：<br>**不传 = 实心灰底**（`--mm-color-bg-raised`）—— 这是绝大多数：抽屉里的动作按钮、弹窗的取消/确定、数值档位、九宫格预设；<br>`ghost` = 透明无底 —— 只给**底栏图标按钮**与**行内小动作**（下拉项删除、「复制/清空」这类文字链）；<br>`primary` = 蓝底（一行里唯一的主操作）；<br>`danger` = 红字（不可逆动作的确认）。<br>判据：**原版截图里凡是成块的按钮都是灰底实心**，透明只出现在「它旁边已经有底」的场合 | 手写 `<button className="mm-btn …">`（那就是第二个入口，2026-10-31 已从 25 处收净）；页面写底色 / 圆角 / 字号；把本该实心的按钮挂成 `ghost`（会变成一段没有边界的文字） |
| 输入框 | `components/ui` 的 `Input`（**全仓唯一渲染入口**，**没有 `variant`**：表面按所在表面走，见规则 15 / 19）；「左图标 + 右插槽 + Enter 提交」用 `components/TextField`（**宽度吃满容器，组件不提供宽度档位**；某处真要定宽就给那个页面的局部 css）。表面（底色 / 描边 / 圆角 / 文字色 / 字号）只在 `ui.css` 的 `.mm-input, .mm-input-surface` 一处给；**底色按所在表面分档**（见 §7 规则 13），由表面声明 `--mm-input-bg`，控件只消费 | 页面写裸 `<input>`、自己画边框与圆角、给输入框传裸 `width`、覆盖 `background`、在调用点判断「该用哪档底色」、给输入框加宽度档位 prop |
| 多行输入 | `components/ui` 的 `Textarea`（**全仓唯一多行输入入口**）。表面与 `Input` 同一套（`--mm-input-bg` / `--mm-input-color`），**高度与 `resize` 不归它**：能多高、能不能拉由承载它的弹窗 / 页面局部 css 给 | 页面写裸 `<textarea>`、自己画边框与圆角、给控件加高度档位 |
| 输入位外壳 | 视觉上是输入位、但元素不是 input 的壳（下拉触发器、复合数字框外壳）挂 `mm-input-surface` | 在自己的 class 里再抄一份底色 / 描边 / 圆角 |
| 遮罩 | `.mm-modal-mask`（`styles/global.css`）：居中弹窗、全屏加载、局部加载共用；区域不可用走 `components/StateMask`（strong 档），输入弹窗走 faint 档 | 页面自绘 `position: fixed; inset: 0` + 半透明底；拿 `--mm-color-bg-hover`(hover 叠白) 或 `--mm-color-bg-base`(页面底色) 当遮罩 |
| **横向排列** | `.mm-u-row` / `.mm-u-row--wrap`（`styles/global.css`）：`display:flex` + `align-items:center` + `justify-content:space-between`。**全仓横排只有这一种，一律两端铺满**。**行里有 3 个以上元素、其中几个要挨在一起时，先分组**（嵌一层 `.mm-u-row` + 该组的 `gap`）—— 平铺会让 `space-between` 把空隙**均分成 n-1 份**，本该贴住的「标签 + 控件」被推到行中间（2026-10-31 导出抽屉的「品质」就是这么飘的）。**换行且要挨着**（chip 排 / 色块排 / 格子排）用组合层 `.mm-u-tiles`（§6.2），不是本条。**但别把这条用到该均分的地方**：一排图标按钮本来就该**均分铺满**（一排 6 个就是 6 等分），给它加 `flex-start` 会挤成左边一坨、右边空一片 —— §6.2 的 `.mm-icon-row` 只补 `gap`，不加 `justify-content` | 在组件 CSS 里再写一遍这套三件套；用 `justify-content: flex-start` / `flex-end` 排**多个**元素（单元素居中不受限，如图标按钮、遮罩） |
| 下拉 / 浮层壳 | `.mm-popover`（`styles/global.css`）：定位变量（`--floating-x/y`）+ 表面（浅色底 / 文字色 / 圆角 / 投影，**无描边**，见 §7 规则 16）全仓一处。`SelectBox` 面板、右键菜单、标签弹层、筛选面板、字重下拉都挂它，各自只写宽度 / 最大高 / 内边距；定位一律 `useFloatingPosition` + `Portal` | 自写 `position: fixed` + 边框 + 底色 + 阴影；用 `position: absolute` 定位弹层（会被滚动容器裁掉）；自己 `getBoundingClientRect` 算坐标 |

Enter 提交不要各写一遍判据：`onKeyDown={enterSubmit(() => commit())}`
（`hooks/input-method-enter` 里的 `enterSubmit`，判据 + `preventDefault` + 执行三件事一处）。

三个输入件的关系：`TextField` **内部就渲染 `Input`**，只是多一层外壳（左图标 / 右插槽 / Enter 提交）。
字体面板、输入弹窗、层级编辑、标签输入、就地编辑**全部渲染 `Input`**，各自的 css 只覆盖
宽度 / 间距 / 文字色 / 焦点描边——**底色与圆角不许覆盖**，它们只在一个地方给
（`ui.css` 的 `.mm-input, .mm-input-surface`）。改输入框颜色 = 改 `tokens.css` 的 `--mm-color-bg-input` 一行。

尺寸是**全仓定案**（`03` 计划 §9 第 8 条）：勾选 / 单选 `12×12`，右侧距 `6`，
边框 `1px` `--mm-color-border-control`（亮线档，§7 规则 8），勾选圆角 `3`、单选 `50%`。
官方勾选选中态是换 svg 图标，我方用 accent 底色，属已登记换皮肤（D-51），本轮不改。

`app/providers.tsx` 挂载前三项，页面内只调 hook；`IconPanel` 是普通组件，用在哪就在哪渲染。

**`IconPanel` 的四条定死规则**（原版行为，别按常规浮层改）：

1. 关闭只认触发器：再点同一个 = 关；同组内点另一个 = 顶掉它（互斥时）
2. **点外部不关、Esc 不关**——和 `ContextMenu` / `useDismiss` 的默认语义相反，所以它不挂 `useDismiss`
3. 互斥是 `IconPanelGroup` 的开关：`exclusive`（默认 `true`）同组只开一个；
   字号 / 行距 / 字距那种要同时展开的，传 `exclusive={false}` 或各用一个组
4. 触发器分两种：默认图标按钮（`icon` + `title`），或 `trigger` 渲染函数（数字框右侧的小箭头这类）

### 6.1 唯一入口标记（人工复核，**不设闸**）

`src/components/*/index.tsx` 的文件头第一行必须是这一行（照抄，只换角色名）：

```
 * 【唯一入口】<角色> —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
```

- **一个角色只有一个公共件**。要加同类，先问「能不能把现有的改掉」；不能才新建，新建就必须同时改标记里的角色名。
- 页面与 feature **只许覆盖**：宽度 / 间距 / 文字色 / 焦点色。底色 / 描边 / 圆角 / 字号只能在公共件里写。
  在页面里再写一遍这四样 = 第二个控件，不是「微调」。
- 分叉过的教训（2026-10-29 收口）：输入框曾有三种底色（`overlay` / `sunken` / 透明）与三种描边；
  按钮曾有四套表面（`ui.Button` + 图片取色 + 标签弹窗 + 输入弹窗）。见 `docs/review/REVIEW-2026-10-29.md`。
- 复核方式：改完公共件或新增页面后，人工跑下面两条，结果里不该出现输入框 / 按钮：
  `rg "<input|<select|<textarea" src --glob '!src/components/ui/**' --glob '!src/components/CheckBox/**' --glob '!src/components/RadioButton/**'`

---

### 6.2 组合层（10 件）

> **为什么有这一层**：§6 那张表是**单个控件**（Button / Input / Select），`global.css` 的 `.mm-u-*` 是**排列方向**。——
> 中间缺一层：原版截图里反复出现、由多个控件组成的固定形状 一行图标、一排等宽按钮、一个标签片、一条数据健康提示、一个弹窗壳。
> 2026-10-30 之前它们被各页面各自实现（同一条警告条有三份：`mm-common__warning` / `mm-font__warning` / `mm-action__warning`；
> 弹窗壳三份：`Confirm` / `InputDialog` / `TagCreator`），视觉统一时必然漏页 —— 所以上收到这里。
>
> **这一层只有 CSS 契约，没有 TSX**：10 件都不带行为，页面挂类名即用。带行为的仍是 §6 的控件。
>
> **值不在这里**：§7 规则 1–18 照样生效（不许色值、不许 `px`、间距进六档）。本表只写「用哪一个、什么时候必须用」。

| 组合件 | 类名 | 判据（命中就必须用它，不许自己写一份） | 实现位置 |
|---|---|---|---|
| 分隔线 | `.mm-divider`，竖线档 `.mm-divider--vertical` | 任何一条分隔线（线色只有暗线一档，规则 8；同排之间的隔断用 `--vertical`） | `global.css` |
| 文字 tab 条 | `.mm-tabs` + `__cell` / `__tab` / `--active` / `__line`；靠左档 `.mm-tabs--start` | 并排的**文字**档位切换（样式页四库导航 / 重命名页默认·替换）。**选中只换文字色**，不加下划线、不加底色块；档间竖线 `__line` 只用亮线。布局两档：默认**等分铺满**，`--start` **按内容宽靠左**（右侧还要放工具按钮时用） | `global.css` |
| 贴左换行排 | `.mm-u-tiles` | 一排**小块**排满后换行、且要**挨着**：chip 排（最近使用 / 序列 / 筛选标签）、色块排（图层颜色 / 提取的颜色）、样式页格子排。**与 `.mm-u-row--wrap` 的分工**：那个是 `space-between`（两端铺满、剩余空隙均分），这个是 `flex-start`（贴左、`gap` 只当最小间距）—— 判据是「这些块该铺满还是该挨着」 | `global.css` |
| 图标排 | `.mm-icon-row`（**修饰符**，与 `.mm-u-row` 同挂） | 一排 ≥2 个**同尺寸**图标按钮（对齐排 / 分布排 / 翻转 / 字重 / 样式排） | `global.css` |
| 按钮排 | `.mm-btn-grid` | ≥2 个**等宽**按钮排或网格（缩放档位 / 字号预设 / 内边距预设 / 九宫格点阵）；列数由 `--mm-btn-grid-cols` 注入（§14.1 允许的运行时值） | `global.css` |
| 标签片 | `.mm-chip`，选中态 `.mm-chip--on` | tag / chip：扁平的**可点小片**（筛选标签 / 最近使用 / 序列 / 动作项）。底 / 文字色 / hover 由**所在表面**声明（规则 19），所以同一个类在深色面板与浅色浮层里都能用，**没有第二个「浅色版」类** | `ui.css` |
| 纯色块 | `.mm-swatch` | **只有形与色**的方块（边长 `--mm-swatch-w/h`、小圆角、背景取调用点注入的 `--mm-swatch`、hover 描边不叠底）：吸色弹窗的「提取的颜色」、重命名页的图层颜色。**与样式页 `.mm-style__item--color` 的区别**：那个是**可编辑格子**，还带底 / 选中 / 编辑态，不是同一个东西 | `ui.css` |
| 角标 | `.mm-badge`，语义档 `--count` | 贴在别的东西上的**小计数或标记**（筛选计数）。档位只在**有消费者**时才加（2026-10-31 删掉零消费者的 `--info` / `--warn` 两档） | `ui.css` |
| 数据健康提示 | `.mm-notice`，语义档 `--warn` / `--error` | 「N 项无法识别」「分类筛选已禁用」这类**读到了但数据不全**的内联提示。档位只在**有消费者**时才加 | `ui.css` |
| 弹窗壳 | `.mm-modal` + `__head` / `__title` / `__body` / `__actions` / `__grow`（后两个是 `.mm-u-row` 修饰符） | 居中的小弹窗（确认 / 输入 / 新建标签）；全屏加载走 `.mm-modal-mask` + `Loading`，不挂 `.mm-modal` | `ui.css` |

**已知例外一处**：`InputDialog` 不挂 `.mm-modal` —— 它的位置是「30% 高 + 左偏 90」而不是屏幕居中（原版行为，
理由写在 `InputDialog/index.tsx` 文件头）。它的表面值（`mm-input-dialog.css`）与 `.mm-modal` 取同一组 token，
只有宽度与定位不同。改它的形状前先回头看原版，不要顺手「顺手居中」。

#### 三条使用规则

1. **组合层不许带行为**：这一层只出 CSS 契约。chip 要不要能删、notice 要不要能关，是上面一层控件的事 ——
   有行为就建 TSX 组件并登记 `GOVERNANCE` §4.1，不许在组合层里塞 onClick。
2. **`.mm-notice` 与 `StateHint` 是两回事，不许互相替代**：
   `StateHint` 是「这块区域没内容 / 读失败了」（空态、失败态，占位整块），
   `.mm-notice` 是「内容在，但数据不全」（一条黄条，挂在既有内容之上或之间）。
   判据：**把提示拿掉，下面还剩不剩东西？** 剩 ⇒ `.mm-notice`；不剩 ⇒ `StateHint`。
3. **命中判据就必须用**：上面 7 件都是 ≥2 处重复后收上来的（警告条三份、弹窗壳三份、chip 三份是实测）。
   页面里出现第 8 种自绘形状前，先问「能不能把这 7 件之一改一改」；不能才新建，新建必须同步本表与 `GOVERNANCE` §4.1。
   **反过来也成立**：建了却零消费者的一件要删（2026-10-31 删掉 `.mm-list-row` 与 `.mm-divider--strong` 就是这条）。

#### 明确不建的四件（有人会想加，先写明为什么不加）

| 候选 | 为什么不建 |
|---|---|
| `.mm-form-row`（通用「标签 + 控件」两列） | 与 `.mm-u-row` 角色重合 —— 后者已是横排唯一入口（§6）。**但**：当一个区块里**多行 label 要对齐到同一条 x**、且**内容列里还有第二行**（选项 / 按钮）时，两端铺满做不到（label 宽度不同 → 内容起点不同），必须两列。这种场景用**页面私有类**实现，不上升为组合层 —— 范本见 `ExportPanel` 的 `.mm-common__form-row`（grid：`--mm-form-label-w` + 1fr），2026-10-31 按导出抽屉截图补 |
| `.mm-stack`（纵向带间距） | 与 `.mm-u-col` 重合；`.mm-u-col` 只管方向不管间距是刻意的 —— 纵向间距按所在抽屉 / 区块定档，由承载容器给 |
| `.mm-section`（标题 + 内容） | 已有 `GroupHead`（分组头）与 `IconPanel`（触发器 + 面板）两个带行为的件覆盖；纯静态区块用 `.mm-u-col` + `.mm-divider` 表达 |
| `.mm-list-row`（列表里的一行） | 本仓没有「普通列表行」这个角色：字体项的 hover 要**通栏**（靠伪元素外扩页边，`FontList.css` 写了理由），动作项是等宽按钮网格 —— 2026-10-31 建了又零消费者，已删 |

---

## 7. 视觉规范（Design Token）

**本节不复述 token 的值**：唯一出处是 `src/styles/tokens.css`（全仓唯一允许写原始值与 px 的文件）。
复述过一次，结果 2026-10-29 重构后整块过期（色阶、控件高、字号线全对不上），成了第二套标准——
照抄它写出来的东西，值和现行 token 不一致且不会报错。要值就打开那个文件。

### 组件形状

| 组件 | 圆角 | 高度 | 内边距 | 边框 |
|---|---|---|---|---|
| Button | `--mm-radius-md` | `--mm-control-h` | `0 var(--mm-space-2)` | 无 |
| IconButton | `--mm-radius-md` | `--mm-icon-btn-size` | 0 | 无 |
| Input（含 `.mm-input-surface` 的壳） | `--mm-radius-md` | `--mm-control-h` | `0 var(--mm-space-1)` | `1px` `--mm-color-border-control` |

> 高度一律写 token 名，不写数字：数字会随档位调整而失真（本表原来的 `24` 在 2026-10-29 之后已经不对，
> 控件高是 `--mm-control-h` = 26）。表里只列**仓里真有**的公共件；`Card` / `Tag` 目前没有公共实现，
> 需要时先建、再登记 `GOVERNANCE` §4.1，不许先在页面里写一份等着以后上移。

### 状态

| 状态 | 表现 |
|---|---|
| hover | 叠 `--mm-color-bg-hover` |
| active | 背景再深一档 |
| disabled | `opacity: .4`，`cursor: not-allowed` |
| focus | `outline: 1px solid var(--mm-color-accent)` |
| selected | 边框 `--mm-color-accent` |

### 硬规则

> 编号说明：本节的「规则 N」与章节号是两套编号 —— 说「规则 19」指本节第 19 条，
> 说「§19」指文末的样式评审清单。规则号从 19 继续往下编（19 曾属一条已撤销的 min-height 规则，现复用）。

1. 组件里不出现 `px` 字面量（`0` 除外）；`min-*` / `max-*` 与 `padding-*` / `margin-*` 这类**带后缀的属性也算**
   （`stylelint` 已改为前缀匹配，此前只匹配精确属性名，`min-width: 240px` 这类能过闸）
2. 不出现色值，只能用语义变量；`hex` / `rgb()` / `rgba()` / `hsl()` **都算色值**
   （`color-no-hex` 只认 hex，其余由 `declaration-property-value-disallowed-list` 兜）
3. 间距只用 `--mm-space-*`
4. 面板宽度 200–360（PS 可拉伸），控件高度只有 `--mm-control-h` 一档（26），字号 11–13 三档，
   圆角**三档**：`--mm-radius-sm`(2) / `--mm-radius-md`(4) / `--mm-radius-lg`(6)。
   4 是常态（按钮 / 输入位 / 弹窗 / 浮层 / 格子）；6 只给**整条带底色、内部用 `overflow: hidden`
   裁切的控件**（段选 `.mm-segment`）—— 这种控件的外圆角同时也是内部选中块的圆角，
   4 在 26 高上看着是个「方角」，原版截图是 6。`--mm-radius-pill` 只给正圆（勾选 / 单选 / 转圈）。
   （2026-10-31：原写「圆角不超过 4」，与导出抽屉里段选的截图不符，按截图放宽出 6 这一档。）
5. **间距只有六档**：`--mm-space-tight`(2 贴合) / `--mm-space-1`(4 组内) / `--mm-space-inline`(6 同行并列) /
   `--mm-space-2`(8 组间) / `--mm-space-3`(12 区块内) / `--mm-space-4`(16 区块间)；
   页边一律 `--mm-page-pad-x`(8)，五页同值，**没有横向例外**。
   （2026-10-29：旧的 `--mm-space-exact-*` 全套已删，20 也不再是间距档；原先「页内左右统一 10」的例外与实测不符，
   按现状改成 8。20 / 30 这类固定格宽（勾选位 `--mm-check-slot`、控件预留位 `--mm-control-reserve`）
   进尺寸段，**不许当通用 padding / gap 用**——把尺寸值当间距，就是本规则要防的那种漂移。
   唯一例外是 `--mm-check-slot` 作为「图标槽」的行左缩进（规则 17）：那正是它的定义，不是拿它凑间距。）

   **哪一层用哪档**（2026-10-31 立；依据原版 `mt/mb` 工具类统计 —— `mt10`+`mb10` 共 19 次是纵向主力、
   `mt15` 4 次给弹窗内段落、`mt6` 9 次给小标题→内容）：

   | 层 | 手段 | 谁给 | 档位 |
   |---|---|---|---|
   | 页边（左右） | `padding` | 页面壳（`global.css` 一处） | `--mm-page-pad-x` 8，七页同值 |
   | 区块之间（纵向） | 容器 `gap` | 页面壳 / 承载容器 | `--mm-space-2` 8（原版 `mt10`） |
   | 组内（纵向） | 容器 `gap` | 承载容器 | `--mm-space-1` 4（原版 `mt6`） |
   | 同行并列（横向） | 行容器 `gap` | 行容器 | `--mm-space-inline` 6 |
   | 弹窗内段落 | 弹窗壳 `gap` | `.mm-modal` / `.mm-input-dialog__main` / `.mm-action-dialog` | `--mm-space-3` 12（原版 `mt15`；12/8 = 1.5 与原版 15/10 同比例） |
   | 控件内部 | `padding` | 控件自己的 css | `space-1` / `space-2` |

   **`margin` 只许三种用途**，不许拿它做普通块间距：
   ① **分隔线的上下留白**（`gap` 会同时给所有兄弟留白，线只要自己上下留）；
   ② **通栏元素的负 margin 抵消页边**（`margin: 0 calc(-1 * var(--mm-page-pad-x))`，padding 做不到反向）；
   ③ **元素会被挂进任意容器、无法知道父级有没有 gap**（`IconPanel__box` 的上下 8）。
   另有 `margin-left: auto` 属**定位**不属间距，不受此条限制。

   **为什么不用统一 margin**（2026-10-31 定）：margin 会与父级 `gap` **叠加**（8+8=16，规则 11 防的就是这个）、
   加一个元素要同时改它和邻居、会破坏 `.mm-u-row` 的两端对齐、还说不清是「谁的间距」。
   `gap` 由容器声明，加元素自动生效、改一处全组生效 —— 这是现状 96 处间距里 `gap` 占 57、`margin` 只剩 8 的原因。

   **一处「间距由 padding 给」的正当场景**：`.mm-font__list` 的项间距是 `.mm-font__item` 的
   `padding: 8 0` —— 项要**紧贴**，hover 与间隔线才连续（通栏伪元素外扩页边）。
   这类「贴紧的列表」用 padding 不用 gap；加 gap 会在 hover 底色之间撕出缝。
6. **同一组内**的元素间距不得大于该组图标的边长：14 图标旁最多 14。
   跨组、跨区块的分组留白不受此限——「留白比图标还大」只在同一组里判错
7. **同排文字与图标视觉等大**：12 号字（行高 16）配 14 图标，13 号字（行高 18）配 16 图标。
   对不上时**缩图标**，不许放大字号（字号一页只有 12 / 13 两档）。
   本条只管**行内文字旁**的图标；输入位 / 数字框的左图标按规则 14 的表取 `btn` 20
8. **线条只有两档，同一角色只许一种**：颜色、粗细、长度来源唯一。
   页面分隔、列表行分隔、**输入位描边**（`.mm-input` / `.mm-input-surface`）用 `--mm-color-border`（暗线）；
   控件描边、勾选框、浮层外边缘用 `--mm-color-border-control`（亮线）。不许自造第三种线色。
   （输入框底是纯黑，暗线落在上面几乎不可见——这是刻意的：靠底色反差界定输入区，不靠边框。）

   **色块 hover 用暗线**（`--mm-color-border`）：色块（样式库格子 / 取色弹窗的色块与渐变条 /
   字体面板色块）hover **不能叠底** —— 叠底会盖住色值本身，而色块就是那个颜色，只能描边。
   但它**不是重点**：描边只是告诉用户「边界在哪、别点错」，不是要它跳出来。
   所以**用暗线**，不用亮线、更不为它另立第三档线色（2026-10-31 定）。
   用 `outline` 不用 `border`：`outline` 不占内部空间，色块尺寸不变。
   （同批删掉四个零引用线色 `--mm-color-border-checked` / `-dialog` / `-warehouse` / `-swatch-hover`
   —— 线只有两档，第三档就是自造。）
   （2026-10-29：旧的 `--mm-color-verline` / `--mm-color-row-border` / `-float` 三个名字已随 token 重构删除，
   照旧名写会引用到未定义变量。）
9. **同类同尺寸**：同一页面内，**同一角色**的元素尺寸必须唯一——工具栏图标按钮、行内操作按钮、
   图标、输入框、chip、行高各算一类。不同角色可以不同，跨页也可以不同，但同页同类出现两种尺寸就是错
10. **两端对齐**：一行的左右内边距相等；同一区块内所有行（标题、内容、分隔线、列表项）的左右边界
    必须一致，不许分隔线左右 15、内容左右 10。栅格按列对齐，右边缘不参差
11. **不留无意义间隔**：相邻两块之间只允许一个档位——A 的 `margin-bottom` 加 B 的 `margin-top`
    叠成两档是错（取一处给值）；最后一个子元素的多余 `margin` 要删；不产生分组关系的空白一律去掉
12. **蓝（`--mm-color-accent`）只表示「需要被看见的状态」，不是装饰色**。四种合法用法：

    | 用法 | 例 |
    |---|---|
    | 选中 / 开启 | tab 选中、chip / tag `--on`、勾选框与单选框、下拉当前项的对号、置顶开、筛选开启 |
    | 焦点 / 进行中 | 输入框 focus 描边、就地编辑中、重命名中的格子、转圈的那一道 |
    | 主操作实底 | `--primary` 按钮、弹层主按钮 |
    | 需要被看见的标记 / 动作文字 | 筛选计数徽标、`StateHint` 的重试、「清除标签 / 新建 / 高级」这类可点动作 |

    禁止：**hover 变蓝**（hover 一律叠 `--mm-color-bg-hover`，或文字 / 图标转 `--mm-color-text-strong`）、
    **用蓝表示「展开 / 悬停」这类临时态**（展开靠底色凹下去 + 内容本身表达，图标不变色）、
    装饰描边与色块边框、标题与正文用蓝、静态用 `--mm-color-accent-hover`（hover 档只能出现在 `:hover` 里）。
    判据一句话：**把这个元素换成灰，用户会不会少知道一件事？** 会 ⇒ 用蓝；不会 ⇒ 不许用
13. **页面底色只有一个出处**：`app/layout.css` 的 `.mm-layout` 用 `--mm-color-bg-base`（`#363636`）铺满内容区，
    七个页面的根类**都不写 `background`**（写了就是第二层底，页与页之间会差一档）。
    其余按角色取（值全部回到 Vue 原版）：输入位 `--mm-color-bg-input`(#2c2c2c) /
    抽屉 `--mm-color-bg-drawer`(#222) / 页头 `--mm-color-bg-header`(#333) /
    底栏 `--mm-color-bg-bar`(#545454) / 浮层 `--mm-color-bg-overlay`(rgba(64,64,64,.96))
14. **图标四档，按「旁边有没有字」选**，值只在 `tokens.css` 的 `--mm-icon-*`，**调用点不传 size**
    （`<Icon>` 的 `width/height` 是 `1em`，按 svg 自己的 `font-size` 算，落法见本节末「尺寸落在哪里」）：

    | 场景 | 档 | 落法 |
    |---|---|---|
    | 纯图标条：页头工具、对齐 / 样式 / 字重图标排、翻转、`IconPanel` 触发器 | `btn` 20 | `IconButton` 默认，什么都不写 |
    | 输入位 / 数字框左图标（字号 / 行距 / 字距、搜索框这类框内左图标） | `md` 16 | 类挂在 `<Icon>` 上，或后代选择器命中 `.mm-icon`；官方 `svg-16` + `ml4` |
    | 与文字同排：输入框右侧、带文字的分组行 / 预设行 / 间距行 | `sm` 14 | 按钮传 `className="mm-icon-btn--inline"`；普通图标走默认 |
    | **底栏**里的一切图标（sprite 与自定义 `<svg>` 图片都要） | `sm` 14 | 底栏外壳 `.mm-bottom-bar svg` 统一压，页面与 `BottomBarButton` 都不传 |
    | 小标记：勾选对号、删除、「+」、折叠箭头 | `xs` 12 | 容器类（`.mm-select-box__check` 等）或 `.mm-chevron` |
    | 导航主项 / 常用页格子 | `nav` 24 / `tile-icon` 32 | `nav-bar.css` / `tile-button.css` |

    **尺寸落在哪里**：`<Icon>` 的 `width/height` 是 `1em`，按 **svg 自己的 font-size** 算；
    而 `global.css` 的 `:where(.mm-icon)` 已经把 svg 钉在 `sm`(14)，
    所以**给外层容器写 font-size 对图标无效**。换档只有两种落法：把类挂在 `<Icon className="…">`
    （类落在 svg 上），或写后代选择器命中 `.mm-icon`。

    **判据**：分两类判，互不干扰 —— ①**行内文字旁**的图标不得大于该排文字（规则 7）；
    ②**输入位 / 数字框的左图标**是控件结构的一部分，固定 `md` 16（官方 `svg-16`），不参与 ① 的比较。
    同一层级出现第二种尺寸时，**那个少数派就是写错的**，往多数那档并，不许新增第六档。

15. **输入位底色按「落在哪个表面」选，不按页面选**：页面表面（`#363636`）上取
    `--mm-color-bg-input`(#2c2c2c)，抽屉表面（`--mm-color-bg-drawer` #222）上取
    `--mm-color-bg-input-drawer`(#000)，浮层表面（`--mm-color-bg-popover` #fff）上取
    `--mm-color-bg-input-popover`(见规则 20)。判据一句话：**输入位永远比所在表面深一档**（同向凹陷，
    不出现「一处浮、一处凹」）。落地方式是**表面声明、控件消费**：表面写 `--mm-input-bg`，
    `.mm-input` / `.mm-input-surface` 用 `background: var(--mm-input-bg, var(--mm-color-bg-input))`。
    不许在调用点加 class 或 prop 选档，也不许给某个页面单独调底色。
    （档数跟着表面数走，不是固定两档 —— 以前只写两档，是因为当时浮层还没定成浅色。）
16. **浮层一律浅色（白底黑字），与面板的深色相反**：`.mm-popover` 一处给
    `--mm-color-bg-popover`(#fff) + `--mm-color-text-popover`(#000) + `--mm-shadow-popover`，**无描边**。
    下拉、右键菜单、标签弹层、筛选面板、字重下拉、描述浮层全部跟着变，不许给某一个浮层单独调底色；
    浮层里的图标与对号跟文字同色（`currentColor`），不许在浮层内单独写深色文字。
    浮层之间只允许两种差异：**宽度跟不跟触发器**（通栏 / 内容宽）、**贴左还是贴右**（`placement` 的
    `start` / `end`）。除这两条之外的差异就是第三种下拉，先合并再谈样式。
17. **图标与紧邻文字的间距只有一个值 `--mm-space-inline`(6)**，适用于勾选框 / 单选框 / 对号 /
    删除 / 「+」/ 折叠箭头这类小标记（12 档）。落地只有一种结构：**图标槽 + 文字** ——
    槽宽 `--mm-check-slot`(18) = 图标 12 + 间距 6；行容器给 `padding-left: var(--mm-check-slot)`，
    图标 `position: absolute; left: 0`，文字不额外加 `padding` / `margin` / `gap`。
    这样同一列表里**有没有对号的行，文字左边缘都对齐**（下拉页脚动作也一起对齐，不会被上一项的对号压住）。
    禁止：用 `left: 20px` 这类裸值对位、给文字单独 `padding-left`、给每一项按有无图标给不同内边距。
18. **宽度固定的滚动容器必须留稳定槽位**：`overflow-y: auto` 的元素，只要**外宽由外面定死**
    （页面壳、页面内的列表、弹窗内的列表），就要同时给 `scrollbar-gutter: stable`（Chromium 94+，CEP 12 可用）。
    滚动条一旦出现就吃掉 `--mm-scrollbar-w`(8)，内容横向抖一下、两端对齐当场失效 —— 官方面板不抖就是因为它不留这个变量。
    **宽度跟内容 / 触发器走的滚动区不给**（下拉面板、筛选面板、标签弹层、字重下拉）：
    它们的宽度本来就被滚动条影响，留槽等于白掉 8px。
    判据一句话：**滚动条出现时，这个容器的外宽会不会变？** 不会 ⇒ 给；会 ⇒ 不给。
19. **浅色浮层内部也要有「凹陷 / hover」两档，且由 `.mm-popover` 声明、控件消费**（2026-10-31 立）：
    规则 16 把浮层定成白底黑字，但**叠白**（`--mm-color-hover-1` / `-2`）落在白底上不可见、
    深色输入位落在白底上反差过头 —— 两者都不能直接搬到浮层里。
    所以这两档另给一套，落地机制与规则 15 完全相同（**表面声明、控件消费**）：

    | 变量（由表面声明） | 页面 / 抽屉表面的兜底 | 浅色浮层表面上的值 |
    |---|---|---|
    | `--mm-input-bg` | `--mm-color-bg-input` | `--mm-color-bg-input-popover` |
    | `--mm-input-color` | `--mm-color-text` | `--mm-color-text-popover` |
    | `--mm-hover-bg` | `--mm-color-bg-hover` | `--mm-color-hover-popover` |

    `.mm-popover` 是这三个变量的唯一声明处；`.mm-input` / `.mm-input-surface` / `.mm-chip` /
    菜单项 / 下拉项只消费。禁止：在浮层里给某个控件单独写 hover 底或输入位底；
    给 chip / input 再造一个「浅色版」变体类（这是本条要防的那种漂移）。
    判据一句话：**把控件挪进浮层，它的凹陷与 hover 还看得见吗？** 看不见 ⇒ 走这三个变量。

---

## 14. 样式

- 组件样式与组件同目录：`SwatchGrid.tsx` + `SwatchGrid.css`
- 类名 `mm-` 前缀，BEM 风格
- 不使用内联 style，动态值用 CSS 变量注入：

```tsx
<div style={{ '--mm-swatch-color': color } as React.CSSProperties} />
```

### 14.1 JS 不许改视觉样式（2026-10-30 立，eslint 已锁）

**位置 / 尺寸 / 间距 / 颜色 / 圆角 / 边框 / 字号 —— 这些只能由 css 决定，JS 不许写。**

| 场景 | 允许 | 禁止 |
|---|---|---|
| 静态视觉值 | 写进 css（token 或组件规则） | `style={{ width: 24 }}`、`el.style.padding = '8px'` |
| 运行时算出来的值（浮层坐标 / 列数 / 色值） | 交出 CSS 变量：`style={{ '--mm-x': 值 }}`、`el.style.setProperty('--mm-x', 值)`，**怎么用由 css 决定** | 直接写 `style={{ left: x }}`、`el.style.left = x`、`el.style.width = x` |
| 功能性 DOM（离屏 textarea、拖拽克隆） | 不在本条范围内，豁免见 eslint 配置 | — |

- 判据：**删掉这行 JS，视觉会不会变？会 → 它属于本条，要进 css；只是把数据交给 css → 允许。**
- 机器闸：`eslint.config.js` 的 `no-restricted-syntax` 两条（JSX `style` 里出现非 `--` 键、`element.style.xxx = `），命中即 error；豁免只给 `hooks/useLongPressDrag.ts` 与 `core/clipboard/index.ts` 两个功能模块，业务代码不许加 `eslint-disable`。
- 现在只允许三种 JS → CSS 的通道，其余一律不许内联：
  `--floating-x/y`（浮层坐标）、`--mm-select-panel-w`（面板宽 = 触发器宽）、`--mm-swatch`（运行时色值 / 渐变）。
  这三样 CSS 都表达不了，所以只能由 JS 交变量、由 CSS 决定怎么用。
  **等宽按钮排的列数是常量**，直接写 `--mm-btn-grid-cols`，不经 JS（曾有一个 `--mm-action-columns` 由 JS 注入，已随 `.mm-btn-grid` 收口删除）。
- 理由：内联样式特异性最高、改 `tokens.css` 不生效、DevTools 里要跑到第二处找 —— 视觉出问题时排查不到根因。
- **本条是视觉重写期的临时护栏，不是永久规则**：视觉定稿后连同 eslint 那两条一起删。债号 `TD-13-1`（`node scripts/debt.mjs show TD-13-1`）。

---

## 19. 样式评审清单（只看样式时用这张，全量清单在 `CONVENTIONS` §19）

- [ ] 没有 `px` 字面量、没有色值，只有 token（`src/styles/tokens.css` 之外）
- [ ] 间距落在六档里，没有自造档位；尺寸值没有被当 padding / gap 用（规则 5）
- [ ] 同类同尺寸；一行的左右边界与区块内其他行一致（规则 9、10）
- [ ] 蓝只出现在「需要被看见的状态」，没有 hover 变蓝、没有装饰性蓝（规则 12）
- [ ] 页面根类没有 `background`；输入位底色由表面声明（规则 13、15）
- [ ] 图标档位按「旁边有没有字」选，调用点没传 size（规则 14）
- [ ] 图标与文字之间只有 `--mm-space-inline`，走图标槽结构（规则 17）
- [ ] 每个 `overflow-y: auto` 都带 `scrollbar-gutter: stable`（规则 18）
- [ ] 浮层里的控件没有自己写 hover 底 / 输入位底，也没有再造「浅色版」变体类（规则 19）
- [ ] 间距走的是「容器 `gap`」；`margin` 只出现在三种场合（分隔线留白 / 通栏负 margin 抵消 / 无法知道父级有没有 gap），没有拿它做普通块间距（规则 5）
- [ ] 没有「父级 gap + 子元素 margin」同时给同一处间距（规则 11：叠加成双倍）
- [ ] 视觉值没有写在 JS 里（§14.1）
