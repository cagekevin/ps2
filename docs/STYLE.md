# 样式与视觉规范（强制）

> **这是什么**：全仓界面规则的唯一出处。原 `CONVENTIONS.md` 的三节整块迁到这里 ——
> §6（UI 横切：用哪个件、表面长什么样）、§7（视觉规范）、§14（样式），2026-10-30 拆分，正文里只留指针。
>
> **编号不变**：章节号与规则号沿用原号 —— 本文的「§6.1」「§7 规则 12」「§14.1」就是代码注释、评审报告、
> `CHANGELOG` 里那些字面量，**不需要换算**。新增界面规则一律进本文，规则号按 1–18 继续往下编。
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
| 输入框 | `components/ui` 的 `Input`（**全仓唯一渲染入口**，`variant` 两档）；「定宽 + 左图标 + Enter 提交」用 `components/TextField`。表面（底色 / 描边 / 圆角 / 文字色 / 字号）只在 `ui.css` 的 `.mm-input, .mm-input-surface` 一处给；**底色按所在表面分两档**（见 §7 规则 13），由表面声明 `--mm-input-bg`，控件只消费 | 页面写裸 `<input>`、自己画边框与圆角、给输入框传裸 `width`、覆盖 `background`、在调用点判断「该用哪档底色」 |
| 输入位外壳 | 视觉上是输入位、但元素不是 input 的壳（下拉触发器、复合数字框外壳）挂 `mm-input-surface` | 在自己的 class 里再抄一份底色 / 描边 / 圆角 |
| 遮罩 | `.mm-modal-mask`（`styles/global.css`）：居中弹窗、全屏加载、局部加载共用；区域不可用走 `components/StateMask`（strong 档），输入弹窗走 faint 档 | 页面自绘 `position: fixed; inset: 0` + 半透明底；拿 `--mm-color-bg-hover`(hover 叠白) 或 `--mm-color-bg-base`(页面底色) 当遮罩 |
| **横向排列** | `.mm-u-row` / `.mm-u-row--wrap`（`styles/global.css`）：`display:flex` + `align-items:center` + `justify-content:space-between`。**全仓横排只有这一种，一律两端铺满** | 在组件 CSS 里再写一遍这套三件套；用 `justify-content: flex-start` / `flex-end` 排**多个**元素（单元素居中不受限，如图标按钮、遮罩） |
| 下拉 / 浮层壳 | `.mm-popover`（`styles/global.css`）：定位变量（`--floating-x/y`）+ 表面（浅色底 / 文字色 / 圆角 / 投影，**无描边**，见 §7 规则 16）全仓一处。`SelectBox` 面板、右键菜单、标签弹层、筛选面板、字重下拉都挂它，各自只写宽度 / 最大高 / 内边距；定位一律 `useFloatingPosition` + `Portal` | 自写 `position: fixed` + 边框 + 底色 + 阴影；用 `position: absolute` 定位弹层（会被滚动容器裁掉）；自己 `getBoundingClientRect` 算坐标 |

Enter 提交不要各写一遍判据：`onKeyDown={enterSubmit(() => commit())}`
（`hooks/input-method-enter` 里的 `enterSubmit`，判据 + `preventDefault` + 执行三件事一处）。

三个输入件的关系：`TextField` **内部就渲染 `Input`**，只是多一层定宽容器与左图标。
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

1. 组件里不出现 `px` 字面量（`0` 除外）；`min-*` / `max-*` 与 `padding-*` / `margin-*` 这类**带后缀的属性也算**
   （`stylelint` 已改为前缀匹配，此前只匹配精确属性名，`min-width: 240px` 这类能过闸）
2. 不出现色值，只能用语义变量；`hex` / `rgb()` / `rgba()` / `hsl()` **都算色值**
   （`color-no-hex` 只认 hex，其余由 `declaration-property-value-disallowed-list` 兜）
3. 间距只用 `--mm-space-*`
4. 面板宽度 200–360（PS 可拉伸），控件高度只有 `--mm-control-h` 一档（26），字号 11–13 三档，圆角不超过 4
5. **间距只有六档**：`--mm-space-tight`(2 贴合) / `--mm-space-1`(4 组内) / `--mm-space-inline`(6 同行并列) /
   `--mm-space-2`(8 组间) / `--mm-space-3`(12 区块内) / `--mm-space-4`(16 区块间)；
   页边一律 `--mm-page-pad-x`(8)，五页同值，**没有横向例外**。
   （2026-10-29：旧的 `--mm-space-exact-*` 全套已删，20 也不再是间距档；原先「页内左右统一 10」的例外与实测不符，
   按现状改成 8。20 / 30 这类固定格宽（勾选位 `--mm-check-slot`、控件预留位 `--mm-control-reserve`）
   进尺寸段，**不许当通用 padding / gap 用**——把尺寸值当间距，就是本规则要防的那种漂移。
   唯一例外是 `--mm-check-slot` 作为「图标槽」的行左缩进（规则 17）：那正是它的定义，不是拿它凑间距。）
6. **同一组内**的元素间距不得大于该组图标的边长：14 图标旁最多 14。
   跨组、跨区块的分组留白不受此限——「留白比图标还大」只在同一组里判错
7. **同排文字与图标视觉等大**：12 号字（行高 16）配 14 图标，13 号字（行高 18）配 16 图标。
   对不上时**缩图标**，不许放大字号（字号一页只有 12 / 13 两档）。
   本条只管**行内文字旁**的图标；输入位 / 数字框的左图标按规则 14 的表取 `btn` 20
8. **线条只有两档，同一角色只许一种**：颜色、粗细、长度来源唯一。
   页面分隔、列表行分隔、**输入位描边**（`.mm-input` / `.mm-input-surface`）用 `--mm-color-border`（暗线）；
   控件描边、勾选框、浮层外边缘用 `--mm-color-border-control`（亮线）。不许自造第三种线色。
   （输入框底是纯黑，暗线落在上面几乎不可见——这是刻意的：靠底色反差界定输入区，不靠边框。）
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

15. **输入位底色只有两档，按「落在哪个表面」选，不按页面选**：页面表面（`#363636`）上取
    `--mm-color-bg-input`(#2c2c2c)，抽屉表面（`--mm-color-bg-drawer` #222）上取
    `--mm-color-bg-input-drawer`(#000)。判据一句话：**输入位永远比所在表面深一档**（同向凹陷，
    不出现「一处浮、一处凹」）。落地方式是**表面声明、控件消费**：表面写 `--mm-input-bg`，
    `.mm-input` / `.mm-input-surface` 用 `background: var(--mm-input-bg, var(--mm-color-bg-input))`。
    不许在调用点加 class 或 prop 选档，也不许给某个页面单独调底色。
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
18. **滚动容器必须留稳定槽位**：任何 `overflow-y: auto` 的元素都要同时给
    `scrollbar-gutter: stable`（Chromium 94+，CEP 12 可用）。滚动条一旦出现就吃掉
    `--mm-scrollbar-w`(8)，内容横向抖一下、两端对齐当场失效 —— 官方面板不抖就是因为它不留这个变量。
    落地只有两处：页面公共壳与 `.mm-font__list` / `.mm-style__list`（`global.css`）；
    浮层里的滚动区（下拉面板 / 筛选面板）**不给**，那里宽度本身就跟触发器绑，留槽会白掉 8px。

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
- 已收敛：动作页列数 `--mm-action-columns`、下拉面板宽 `--mm-select-panel-w`、浮层坐标 `--floating-x/y`。
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
- [ ] 视觉值没有写在 JS 里（§14.1）
