# 猫猫设计工具（maomao-design-tools）

Photoshop 面板工具，`稿定设计助理` 的自建替代实现。React + TypeScript + Vite，跑在 CEP 12（Chromium 103）里。

- Bundle：`com.maomao.design`，菜单名「猫猫设计工具」，版本 `0.1.0`
- 数据目录：`%APPDATA%\Maomao`（自有）+ `%APPDATA%\SheJiZhuLi`（读官方已有样式库）
- 不依赖官方客户端运行，不读官方前端代码；应用类 PS 能力复用官方 jsx 副本（见 `jsx/vendor.README.md`）

## 现在能做什么

| 模块 | 状态 |
|---|---|
| 左侧导航（11 项、快捷键 R/M/A/T/H/U/W/E） | ✅ 真机 |
| 样式面板 · 显示（仓库 / 四 tab / 分组折叠 / 三态） | ✅ 真机 |
| 样式面板 · 应用（颜色 / 渐变 / 图层样式 / 字体 / ctrl / shift） | ✅ 真机 |
| 样式面板 · 编辑（删除 / 重命名 / 同组拖拽 / 跨组拖拽 / 新建分组 / 折叠写库） | ✅ 真机（跨组与分组排序待复验） |
| 添加前景色到分组 | 🔧 待真机 |
| 导入导出 / 发送色板 / 仓库管理 | ❌ 未实现（入口置灰或提示未实现） |
| 字体管理（系统字体列表 / 搜索 / 标签 / 评分 / 预览 / 应用 / 标签导入导出） | 🔧 已实现，待真机 |
| 字体面板（拆分 / 生成按钮 / 粘贴 / 分布 / 快速吸色 / 层级预设 / 属性 / 翻译） | 🔧 已实现，待真机 |
| 常用页（缩放区 / 翻转 / 14 项网格 / 拖拽排序 / 折叠 / 两块区域显隐 / 两个子面板） | 🔧 已实现，待真机 |
| 设置（单位 / 常用页两块区域显隐 / 14 项显隐） | 🔧 已实现，待真机 |

完整矩阵与剩余缺口：样式面板看 `docs/plan/STYLE-PANEL-GAP.md`，
常用页看 `docs/plan/03-常用-2026-10-27.md` §11（交付状态与真机清单）。

## 技术栈

| 项 | 版本 / 选择 | 约束 |
|---|---|---|
| TypeScript | 5.6 | `strict` + `noUncheckedIndexedAccess` 等 8 项（见 `CONVENTIONS.md` §4.1） |
| React | 18.3 | 只用函数组件 + Hooks |
| Vite | 5.4 | `target: chrome103`、`base: './'` |
| 路由 | react-router-dom 6 | 必须 `HashRouter`（CEP 是 `file://`） |
| 状态 | Zustand 5 | 按 feature 切片 + 选择器订阅 |
| 请求 | 原生 `fetch` | 禁止 axios |
| 样式 | 原生 CSS + `tokens.css` | 禁止 CSS-in-JS、禁止硬编码色值/px |
| 测试 | Vitest 2 | `core` / `domain` 纯函数必须有单测 |

## 快速开始

```bash
npm install

npm run dev      # 浏览器里调 UI（无 PS 能力，走降级分支）
npm run build    # tsc --noEmit + vite build
npm run deploy   # build 后部署到 CEP 扩展目录（唯一发布入口）
```

### 部署与验证

`npm run deploy` 会先删目标目录再复制 `CSXS/`、`dist/`、`jsx/`，并校验必需文件、检测 `jsx/jsx` 嵌套。

```
Windows: %APPDATA%\Adobe\CEP\extensions\com.maomao.design
macOS:   ~/Library/Application Support/Adobe/CEP/extensions/com.maomao.design
```

验证顺序（**顺序不能省**）：

1. 关闭面板窗口 → 重新打开（JS/CSS 改动生效）
2. 改了 `CSXS/manifest.xml` 或首次安装 → **完全退出 Photoshop** 再开（CEP 只在这时重扫扩展）
3. 改了 `jsx/*.jsx` → 关面板重开（jsx 在面板加载时 `evalFile` 执行一次）

> CEP 会缓存页面，**关面板再开不会重新读盘**。改了 HTML/JS/CSS 却看不到变化时，先完全退出 PS。

### 调试入口

面板右上角「诊断」→ `#/debug`：

- 当前图层类型 / 名称（800ms 轮询，经 store）
- 「诊断官方能力」：vendor 函数是否定义、官方配置文件是否存在、`cyAutoFillColor` 实际值
- 「查看日志」：直接读 `%TEMP%\maomao.log`，可复制

## 数据与日志

| 路径 | 内容 |
|---|---|
| `%APPDATA%\Maomao\prefs.json` | 界面偏好（tab、展开状态、上次仓库） |
| `%APPDATA%\SheJiZhuLi\sj_kuStoreInfo.ini` | 官方样式库索引（读，写时带 `.bak`） |
| `%APPDATA%\SheJiZhuLi\sj_ku*.ini` | 四类库文件（读，写时带 `.bak`） |
| `%APPDATA%\SheJiZhuLi\kuStyle\` | 样式缩略图 `<itemId>.png`、分组 PSD `<groupId>.psd` |
| `%TEMP%\maomao.log` | 前端日志（已脱敏，相同消息 3 秒折叠） |
| `%TEMP%\maomao-jsx.log` | PS 侧日志（`layer.kind` 真实值、异常行号） |

改用户库文件前，先整目录备份（例如 `%APPDATA%\SheJiZhuLi\_backup_before_xxx\`），再按「重命名 → 删除 → 拖拽」从低风险到高风险验证。

## 目录

```
src/
├─ core/          技术横切（cep / logger / storage / prefs / paths / color / env / http / auth / ps / clipboard）
├─ domain/        纯模型与归一化（json / ku-format / style-library / reorder）
├─ repo/          数据访问：读文件 → 三态
├─ commands/      业务命令：组合原子能力 + 写库
├─ store/         状态切片
├─ hooks/         交互原语（useDismiss / useFloatingPosition / useLongPressDrag / usePersisted）
├─ components/    纯 UI（ui / Toast / Loading / ContextMenu / Confirm / InlineEdit / icons）
├─ features/      页面
├─ app/           router / layout / providers / nav-config / layer-watcher
├─ styles/        tokens.css / global.css
└─ types/         result / read / guards / color / layer

jsx/
├─ main.jsx       自有 PS 能力（mm_*）
├─ vendor.jsx     官方 jsx 副本（ys_*，jsxbin，原样复制）
└─ vendor.README.md  来源、函数、依赖、升级方式

tools/            deploy / check-templates / check-nav / new-feature / build-icons / extract-icons / probe-data
docs/             见下方文档索引
```

依赖方向只允许向下：`features → commands → store → core`，`components → core`。越界由 ESLint 拦。

## 检查（提交前必须全绿）

```bash
npm run check
```

六道关：`typecheck` → `lint` → `lint:css` → `check:templates`（范本双向校验）→ `check:nav`（导航↔路由一致）→ `test`。

新增页面用脚手架，不要手建目录：

```bash
npm run new:feature
```

## 文档索引

| 文件 | 内容 | 什么时候读 |
|---|---|---|
| `docs/CONVENTIONS.md` | 写法规矩（命名、分层、类型、横切、Token、禁止清单） | **写代码前必读** |
| `docs/GOVERNANCE.md` | 何时升级底层、范本制度、体检规则 | 加能力 / 交付前 |
| `docs/CHANGELOG.md` | 全项目变更记录（按日期追加） | 交付前登记 |
| `docs/PS-CHANNEL-NOTES.md` | PS 通道事实：三条通道、参数序列化、串行队列、env、数据契约、排障 | 调 jsx / 改数据层 |
| `docs/plan/STYLE-PANEL-GAP.md` | 样式面板现状与剩余缺口 | 排期 |
| `docs/plan/01-字体管理-2026-10-27.md` | 字体管理页实施计划 | 做第一页 |
| `docs/plan/02-字体面板-2026-10-27.md` | 字体面板实施计划（9 组件 / 25 个 jsx 契约） | 第二页 |
| `docs/plan/14-失败语义收口-2026-10-30.md` | PS 失败语义：形状 / 契约 / 数据流 + 三步收口（`PS_BAD_PAYLOAD` 与三个构造器） | 改解析器 / 排「假失败」 |
| `docs/review/REVIEW-2026-10-27*.md` | 十九次体检/审查报告 | 复盘 |
| `docs/spec/` | 页面规格（编号 01/02/05，与参考工程 `docs/页面/` 对齐） | 开工前 |
| `jsx/vendor.README.md` | 官方 jsx 副本来源与依赖 | 升级 vendor |
| `src/commands/README.md` | 命令层判定标准与写法 | 新增命令 |

## 已知限制

- 颜色应用走 vendor 的 `ys_useStyleColor`，**单选多选同一个调用**（遍历在 vendor 内部）；智能对象批量不上色、图层组不上色是官方行为
- 样式库只支持本机 `groups` 明文形态的写入；`flat` / `container` 只读
- 日志不轮转，长期使用会变大
- 导入导出、发送色板、仓库管理未实现
- 面板宽度按 300–360 设计，最小 300

## 来源

- 参考实现：`D:\稿定设计助理-存档\app`（Vue 2 重写版，已验证可用）
- 官方面板可读源码：`%APPDATA%\Adobe\CEP\extensions\com.local.psz.panel.v4\panel\js\app.v4.js`（拆解版见 `..\psz-panel-v4\`）
- 色板面板明文 jsx（颜色应用的移植来源）：`%APPDATA%\fz.FengZi3Hao\jsx\main.jsx`（819 行，未加密）
