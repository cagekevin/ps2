# 变更记录

> 只记「发生了什么」，不记规矩。规矩见 `docs/CONVENTIONS.md`，体检结论见 `docs/REVIEW-*.md`。
> 更细的治理变更同步登记在 `docs/GOVERNANCE.md` 第八节。

## 0.1.0 · 2026-10-27

首版：从零搭到「样式面板可用」。同一天内按依赖顺序推进，每个阶段都以真机验证收尾。

### 形状收口（唯一结果形状）

- `Result` 统一为 `{ status: 'ok'; value } | { status: 'error'; code; reason; detail }`，全仓只此一种
- 删除 `ReadOutcome`（`types/read.ts` 整个删掉）、`SwatchRead`、`JsxCall`、`toResult` 转换层
- 文件三态改由码承载：`NOT_FOUND`（不重试）/ `CORRUPT`（不重试）/ `IO_ERROR`（可重试），语义与判定原则不变
- `PS_ERROR` 拆 5 个子码：`PS_NO_DOC` / `PS_NOT_SHAPE` / `PS_SKIPPED` / `PS_UNREADY` / `PS_REJECTED`——失败原因回到类型里，不再只活在中文文案里
- 新增 `core/ps/raw.ts`：raw 约定值（`no-doc` / `not-shape` / `skipped` / `-1`）的唯一解析处，表驱动；能力函数不再手写字符串比较
- `reason`（给人看）/ `detail`（底层原文，必填）两字段各装一种语义；失败原样透传，禁止换说法重包
- 删死函数 `getLayerKind` / `getLayerName`（唯一活口 `getLayerState`），同步 `commands/README.md` 范本
- **纯形状改动，读写行为逐字节不变**；有副作用的 jsx `parseColor` 合并明确不收（另行登记）

### 地基

- 工程骨架：React 18 + TS 5.6 + Vite 5（`target: chrome103`）+ HashRouter + Zustand
- 垂直切片验证 5 个假设：Vite 产物在 CEP 加载、React 渲染、HashRouter、`evalScript`→jsx、`fetch` 可达
- 命名统一：`com.maomao.design` / 猫猫设计工具 / 数据目录 `%APPDATA%\Maomao` / jsx 前缀 `mm_`
- 8 个技术横切落地：cep / logger / storage / color / env / http / auth / ps
- 修底层缺陷：`core/ps/init.ts` 保证 jsx 加载幂等；`loadJsx` 统一转正斜杠（Windows 反斜杠被 evalScript 转义）
- 双层日志：`%TEMP%\maomao.log`（前端）+ `%TEMP%\maomao-jsx.log`（PS 侧）
- 编译期加严：`noUncheckedIndexedAccess` / `noImplicitReturns` / `verbatimModuleSyntax` / `forceConsistentCasingInFileNames`，抓出 2 个真实隐患（正则分组可能 undefined、`split('|')` 解构可能 undefined）
- 防错机制：ESLint 边界、stylelint Token、`npm run new:feature` 脚手架；确立「让正确写法最省事」原则，不新增禁止规则

### 治理

- `docs/CONVENTIONS.md`：设计原则、三层 Token、技术横切 8 项、UI 横切 3 项、禁止清单、React 规则
- `docs/GOVERNANCE.md`：10 条边界升级触发条件、范本制度、底层优先、定期体检（七项）、AI 主动询问义务
- `.codebuddy/agents/conventions-guardian.md`：架构守门员
- 范本自检 `check-templates.mjs` 升级为**双向**（清单↔代码标记），首跑抓到 2 处漏标
- 导航自检 `check-nav.mjs`：导航标了 `implemented` 但路由没注册、或路由注册了但导航没登记，都会失败

### 导航与图标

- 侧栏按原版参数重写：40px 宽、40×40 项、激活/hover `#434343`、hover 右侧滑出标签、底部 26×26 子项
- 导航 11 项与快捷键（R/M/A/T/H/U/W/E）对齐原版 `menuData`；未实现项不注册路由，点击 toast
- 图标从 `icons-sprite.svg` 按白名单提取 11 个，**内联 path 不用 `<use href>`**（旧 Chromium 会闪）
- `tools/build-icons.mjs` 生成，改白名单重跑

### 样式面板 · 显示

- `domain/style-library.ts`：四类库归一化（渐变 location 0–4096 刻度、角度 `90 + angle`、字体 `fonts[0]`、样式 `<id>.png`）
- 真实数据测试抓到一个结构错误：渐变是**双层** `gradient.gradient.colors`，测试数据少了一层
- `domain/ku-format.ts`：三种库形态（groups / flat / container）+ base64（Node Buffer）
- `core/storage` 升级：双根（`Maomao` / `SheJiZhuLi`）、任意顶层 JSON（索引是 `{index,list}`）、UTF-8 BOM、三态读
- `repo/style-repo.ts`：读索引 / 原始组 / 原始项 / 分组 id / 库原文
- 页面：仓库下拉 + 四 tab + 分组折叠（默认只展开第一组）+ 三态如实显示（缺失 / 数据异常 / 读取失败可重试）
- 真实数据验证：2 个仓库；仓库 1 有 108 组 508 项；索引登记了但文件缺失的库如实显示「文件缺失」

### 样式面板 · 应用（四条通道）

- **颜色**：改走自有 `mm_style_applyColor`（移植色板面板 819 行明文实现），按图层类型四路；不用 `ys_useStyleColor`（自动填充关闭时只改前景色）
- **渐变**：`ps_onJsx` + `ys_useGradient`
- **图层样式**：`ps_onJsx` + `ps_ysBtnUseStyle`
- **字体**：直调 `ys_checkUseFont` / `ys_useFont`，参数先 `encodeText`
- 关键修复（按定位顺序）：
  1. vendor 用错文件：97 KB 那份只有 `sb_*`，换成 338 KB 完整版
  2. 漏注入环境变量：`Sys_setSystemEnvInfo` + `VUE_APP_USER_DIR='/SheJiZhuLi'`
  3. 参数传成对象：必须先 `JSON.stringify` 再包单引号
  4. 调错通道：`ys_*` 必须经 `ps_onJsx({f,arr,n})` 调度
- `core/cep/bridge.ts`：`evalScript` 串行队列 + 超时；`callJsx` 包 IIFE 拿真实异常；`undefined` 参数直接抛错
- `core/ps/env.ts`：注入 15 个字段；`core/ps/diag.ts` + `/debug` 诊断页可一键探明 vendor 能力与配置依赖
- ctrl / shift 修饰键：`mm_style_applyShapeFill` / `mm_style_applyBorderColor`，已真机

### 样式面板 · 编辑（写库）

- `core/storage.writeTextAtomic`：`.bak` 备份 + 原子替换 + 按文件串行；`removeFile`
- `repo` 两个 mutate 入口：`mutateRawGroups` / `mutateIndex`（读失败不执行修改）
- 8 个写函数：`addKuGroup` / `renameKuGroup` / `deleteKuGroup` / `setKuGroupShow` / `moveKuGroupTo` / `renameKuItem` / `deleteKuItem` / `moveKuItemTo`
- 右键菜单（删除在前、重命名在后，未实现项置灰）+ 确认弹窗 + 内联编辑（Enter/Esc/失焦，防重复提交）
- 拖拽：300ms 长按 + 克隆浮层 + 占位落点；`domain/reorder.ts` 四分支 splice 收敛（12 个单测）；拖完挡掉误触 click（项→应用颜色、分组→折叠）
- 跨组拖拽、分组拖拽排序、折叠写回库（`show` 字段）
- 底部栏 4 个「添加分组」按钮 + 导入导出（置灰）
- 添加当前前景色：`mm_style_getForegroundColor` 直接返回库项形状，前端不碰 CMYK 换算
- 真机验证：重命名 / 删除 / 拖拽三条路径通过，`.bak` 正常生成（验证前整目录备份，验后清理）

### 视觉对齐

- 四库尺寸不共用：颜色 25×25、渐变 50×26 r4、字体 70×44 r4 底 `#535353`、样式 26×26 底 `rgba(0,0,0,.3)`
- 三层底色：页面 `#363636`、仓库条 `#282828`、底栏 `#535353`
- tab 四等分 + 1px 竖线 + 选中 `#006fff`；底栏 26px 图标条，图标 20px
- 修布局：`.mm-layout__body` 的 `overflow: auto` 导致页面 `height:100%` 失效、底栏贴不到底 → 改 `hidden`
- 修破图：`osPrefix()` 补 `file:///`；`userAssetUrl` 补 `SheJiZhuLi` 根；渐变目录 `kuGradient` → `Gradient`
- 底栏彩色/蓝色方块改用 CSS 渐变绘制（`iconchuangjian` 实际是加号）

### 质量

- `StylePage.tsx` 717 → 245 行，抽 `useStyleActions` + 4 个组件
- 收敛 `useStyleActions` 里 8 处重复取仓库、4 处重复提示
- 删死代码：`core/ps/shape.ts` + jsx `mm_shape_*`（有 bug 的第二套形状实现）、`decodeText`、`extensionSubPath`、`KuItem.color`、`store.psReady`
- 四次体检：`docs/REVIEW-2026-10-27.md`、`-2`、`-3`、`-4`
- 测试从 0 → 82 个（颜色 11、storage 5、result 2、domain 37+、ku-format 19、reorder 12、floating-position）

### 文档

- 新增 `docs/PS-CHANNEL-NOTES.md`：三条通道、参数序列化、串行队列、env、LayerKind、数据契约、CEP 坑、排障速查
- 重写 `docs/STYLE-PANEL-GAP.md`：从「差距清单」改为「现状 + 剩余缺口」，并列出已失效的旧结论
- 新增本工程 `README.md`（构建 / 部署 / 验证顺序 / 数据与日志位置 / 文档索引）
- 修正 `jsx/vendor.README.md` 的过期内容（来源、函数表、通道、返回值）
- 修正 `docs/GOVERNANCE.md` 的检查链描述与范本状态

## 待办

- 真机复验：样式缩略图、底栏图标尺寸、添加前景色
- 补 alt 改色、渐变「+」、字体「+」、样式「+」（写 PSD）
- 仓库管理（新建 / 重命名 / 删除，删除需清图片）
- 导入导出（`ku-io` + `style-library-io` + 文件对话框）
- 发送色板（色板 store + `com.fengzi.event.seban`）
- 仓库下拉换自定义样式、去掉顶部标题栏、回顶按钮
- 日志轮转（> 1 MB 改名 `maomao.log.1`）
