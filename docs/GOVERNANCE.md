# 治理规则：边界升级 · 范本制度 · 底层优先

> `CONVENTIONS.md` 说明「怎么写」，本文件说明「什么时候必须改、谁来改、改不动怎么办」。
> 两份文件一起构成强制约束。

---

## 一、底层优先原则（最高优先级）

**底层没设计好，禁止在其上继续开发。**

| 情形 | 必须做的事 | 禁止做的事 |
|---|---|---|
| `core` 缺少某个能力 | 先在 `core` 补齐 + 写 jsx 镜像 + 更新范本 | 在 feature 里自己 `evalScript` |
| 接口未登记 | 先加到 `endpoints.ts` | 在 feature 里拼 URL |
| 返回类型不合适 | 先改 `Result` / 类型定义，同步所有调用方 | 用 `any` 或 `as` 绕过 |
| 发现底层有缺陷 | 停止上层开发 → 修底层 → 更新范本 → 继续 | 「先绕过，后面再改」 |
| 约定没覆盖 | 先改 `CONVENTIONS.md`，再写代码 | 按自己想法写，事后再补文档 |

判定标准：**只要新代码里出现「复制粘贴、临时绕过、局部特例、any、硬编码」中的任意一个，就说明底层没准备好，必须回头改底层。**

---

## 二、边界升级触发条件

满足任意一条，**必须**先升级底层或约定，不允许直接写业务：

| # | 触发条件 | 升级动作 |
|---|---|---|
| 1 | 同一段逻辑第 3 次出现 | 上移到 `core` 或 `components` |
| 2 | 两个 feature 需要同一份数据 | 新建 `store` 切片，不允许互相 import |
| 3 | 需要新的 PS 能力 | `core/ps/<域>.ts` + `jsx/main.jsx` 镜像函数 |
| 4 | 需要新接口 | `core/http/endpoints.ts` 登记 |
| 5 | 引入新依赖 | 评估体积 / 是否原生可替代 / Chromium 103 兼容性 |
| 6 | 出现新的全局状态 | 新建 `store/<域>.ts`，禁止塞进别人的切片 |
| 7 | 现有类型不够表达 | 扩展 `src/types/`，同步所有调用方 |
| 8 | 现有约定与实际冲突 | 改约定，不改代码里的「特例」 |
| 9 | 发现范本已经过时 | 先更新范本，再推广 |

---

## 三、升级流程（固定顺序，不可跳步）

```
1. 改 docs/CONVENTIONS.md（写清楚新规则）
2. 改 core / types 实现
3. 更新对应范本文件（带【范本】标记的）
4. npm run check（typecheck + lint + stylelint + 范本自检 + 导航自检 + 单测，六道关）
5. 在下方「变更记录」登记
6. 才允许写业务代码
```

跳步视为违规。

### 新增能力前置检查

新增任何一个「入口」（UI 组件、请求封装、PS 能力、脚本、工具函数）之前，必须先填 `CONVENTIONS.md` §0.5 的判定表：

| 检查项 | 通过标准 |
|---|---|
| 唯一入口 | 全项目只有一个 import 来源 |
| 更省事 | 正确写法的字符数 ≤ 错误写法 |
| 类型闭合 | 写错参数编译失败 |
| 默认正确 | 零配置可用 |
| 失败可见 | 用错立即报错 |
| 无第二套 | 全局搜索不到同类实现 |

六项缺一项，说明入口设计不合格，先改入口，不允许用 lint 禁止来兜底。

如果发现已有两套写法，按 §0.5 原则三收敛成一套，并登记到变更记录。

---

## 四、范本制度

### 4.1 范本清单

| 层 | 范本文件 | 说明 | 状态 |
|---|---|---|---|
| CEP 通道 | `src/core/cep/bridge.ts` | 唯一 PS 交互入口 | ✅ 真机 |
| Node 模块 | `src/core/cep/node.ts` | 唯一 require 出口，文件读写靠它 | ✅ 真机 |
| 剪贴板 | `src/core/clipboard/index.ts` | 唯一复制入口，自动降级 | ✅ 真机 |
| 日志 | `src/core/logger/index.ts` | 内部脱敏 + 相同消息折叠 | ✅ 真机 |
| 存储 | `src/core/storage/index.ts` | 三根 + Result 读 + 原子写（备份/串行） | ✅ 真机 |
| 偏好 | `src/core/prefs/index.ts` | 界面状态持久化，key 强类型 | ⚠️ 待真机 |
| 文本混淆 | `src/core/cep/text-codec.ts` | 字体参数编解码（原版 Xv） | ✅ 真机 |
| 字体应用 | `src/core/ps/font.ts` | `ys_*` 先检查再应用（真机）；`ztgl_*` 系统字体列表/应用（待真机） | ⚠️ 待真机 |
| 路径 | `src/core/paths/index.ts` | 路径拼接与资源 URL | ⚠️ 待真机（缩略图待复验） |
| 命令层 | `src/commands/README.md` | 命令判定标准与写法 | — 规范 |
| 鉴权 | `src/core/auth/index.ts` | token + 版本化 key | ⚠️ 未使用 |
| 环境 | `src/core/env/index.ts` | 版本号、扩展 ID | ✅ 真机 |
| 网络 | `src/core/http/client.ts` | 唯一请求入口 | ⚠️ 未实测 |
| 接口登记 | `src/core/http/endpoints.ts` | 标注来源与验证状态 | ⚠️ 未实测 |
| PS 初始化 | `src/core/ps/init.ts` | jsx 加载保证 | ✅ 真机 |
| PS 图层 | `src/core/ps/layer.ts` | Result 转换 | ✅ 真机 |
| PS 样式 | `src/core/ps/style.ts` | 颜色走自有移植版，渐变/样式走 `ps_onJsx` | ✅ 真机 |
| PS 诊断 | `src/core/ps/diag.ts` | 探测 vendor 函数与配置依赖 | ✅ 真机 |
| PS 环境 | `src/core/ps/env.ts` | 注入官方 jsx 所需环境变量 | ✅ 真机 |
| 样式命令 | `src/commands/style.ts` | 颜色 / 渐变 / 字体 / 图层样式 / 修饰键 | ✅ 真机 |
| 类型 | `src/types/result.ts` | 全仓唯一结果形状（status/code/reason/detail） | ✅ 单测 |
| JSON 解析 | `src/types/json.ts` | 唯一的文本 → unknown 入口（label 必填） | ✅ 单测 |
| raw 协议解析 | `src/core/ps/raw.ts` | raw 约定值 / JSON / err 信封唯一解析处（表驱动） | ✅ 单测 |
| 类型守卫 | `src/types/guards.ts` | isRecord / isArrayOf | ✅ 单测 |
| 业务模型 | `src/domain/style-library.ts` | 纯归一化，实测换算 + kuListOf/kuEnsureListOf | ✅ 真实数据 |
| 库格式 | `src/domain/ku-format.ts` | 三种库文件形态识别 + base64 | ✅ 单测 |
| 数据访问 | `src/repo/style-repo.ts` | 读文件 → Result；`mutateRawGroups` 走 `json-file` | ✅ 真实数据 |
| 数据写入口 | `src/repo/json-file.ts` | 库文件 / 字体标签星级 / 色板的唯一「读 → 改 → 写」；首次创建显式分支 | ⚠️ 待真机 |
| 串行队列 | `src/core/serial/index.ts` | 按 key 串行，只保证顺序、不传递失败 | ✅ 单测 |
| 业务切片 | `src/store/style-library.ts` | 只读投影，失败原样保留 | ✅ 真实数据 |
| 状态 | `src/store/app.ts` | 切片写法 | ✅ 真机 |
| UI 控件 | `src/components/ui/index.tsx` | 唯一 UI 出口 | ✅ 真机 |
| 下拉选择 | `src/components/SelectBox/index.tsx` | 箭头统一，面板宽度跟随触发器 | ✅ 真机 |
| 下拉样式 | `src/components/SelectBox/select-box.css` | 对齐原版 SelectBox | ✅ 真机 |
| 折叠箭头 | `src/components/Chevron/index.tsx` | 展开/折叠箭头（会旋转） | ✅ 真机 |
| 折叠箭头样式 | `src/components/Chevron/chevron.css` | rotate(-90deg) 表示收起 | ✅ 真机 |
| 图片取色弹层 | `src/features/style/components/ImgColorDialog.tsx` | 色圈 / 渐变条，左键应用右键删 | ⚠️ 待真机 |
| 图片取色样式 | `src/features/style/components/img-color-dialog.css` | 对齐原版 imgColor | ⚠️ 待真机 |
| PS 事件订阅 | `src/core/cep/ps-events.ts` | 注册 + JSON 回调 + setd 判据 | ⚠️ 待真机 |
| 图片解码 | `src/core/image/index.ts` | FileReader / canvas / Image 默认注入 | ⚠️ 待真机 |
| 文件对话框 | `src/core/dialog/index.ts` | CEP fs API，取消返回 null | ⚠️ 待真机 |
| 仓库容器 | `src/repo/ku-archive.ts` | .kux 导出导入 + id 重发 + 回收 | ⚠️ 待真机 |
| 容器编解码 | `src/domain/ku-io.ts` | 纯函数（app 移植） | ✅ 单测（app 背书） |
| Toast | `src/components/Toast/index.tsx` | 禁止 alert | ✅ 真机 |
| Loading | `src/components/Loading/index.tsx` | 全屏加载唯一入口，文案栈 | ✅ 真机 |
| Spin 转圈 | `src/components/Spin/index.tsx` | 裸圈 / 带文案 / 局部遮罩三模式（照原版 NewSpin） | ✅ 真机 |
| Spin 样式 | `src/components/Spin/spin.css` | 18px / 0.8s，token 化 | ✅ 真机 |
| 路由 | `src/app/router.tsx` | 页面懒加载 | ✅ 真机 |
| 外壳 | `src/app/layout.tsx` | 全局布局 | ✅ 真机 |
| Provider | `src/app/providers.tsx` | UI 横切挂载 | ✅ 真机 |
| 导航配置 | `src/app/nav-config.ts` | 导航唯一来源 | ✅ 真机 |
| 导航栏 | `src/app/nav-bar.tsx` | 侧边导航 | ✅ 真机 |
| 图层监听 | `src/app/layer-watcher.tsx` | 唯一图层订阅者，页面只读 store | ✅ 真机 |
| 状态持久化 | `src/hooks/usePersisted.ts` | 界面偏好，key 强类型 | ⚠️ 待真机 |
| 浮层关闭 | `src/hooks/useDismiss.ts` | 全项目唯一 mousedown/keydown 监听 | ✅ 真机 |
| 浮层定位 | `src/hooks/useFloatingPosition.ts` | 唯一锚点矩形入口 | ✅ 真机 |
| 定位算法 | `src/hooks/floating-position.ts` | 纯函数，翻转与夹取 | ✅ 单测 |
| 长按拖拽 | `src/hooks/useLongPressDrag.ts` | 300ms 长按 + 克隆占位 + 落点判定 | ✅ 真机 |
| 落点计算 | `src/domain/reorder.ts` | 纯函数，四分支 splice 收敛 | ✅ 单测 |
| 列表分页 | `src/hooks/usePagedList.ts` | 每页 30 + 触底追加，筛选变化回第一屏 | ⚠️ 待真机 |
| 触底加载 | `src/hooks/useInfiniteScroll.ts` | 全项目唯一 `IntersectionObserver` | ⚠️ 待真机 |
| 右键菜单 | `src/components/ContextMenu/index.tsx` | 定位走 hook，菜单项由调用方给 | ✅ 真机 |
| 确认弹窗 | `src/components/Confirm/index.tsx` | 删除类操作必须二次确认 | ✅ 真机 |
| 确认入口 | `src/components/Confirm/useConfirm.tsx` | `await confirm()`，页面唯一用法 | ✅ 真机 |
| 内联编辑 | `src/components/InlineEdit/index.tsx` | Enter 确认 / Esc 取消 / 失焦确认 | ✅ 真机 |
| 空态提示 | `src/components/StateHint/index.tsx` | 空态 / 失败态 / IO 重试唯一入口 | ⚠️ 待真机 |
| 导航样式 | `src/app/nav-bar.css` | 对齐原版 40×40 参数 | ✅ 真机 |
| 组件样式 | `src/components/ui/ui.css` | 基础控件形状 | ✅ 编译 |
| 页面 | `src/features/home/HomePage.tsx` | feature 唯一结构 + 调试页 | ✅ 真机 |
| 样式 | `src/features/home/HomePage.css` | 只用 Token | ✅ 真机 |
| 样式页 | `src/features/style/StylePage.tsx` | 骨架与 JSX 分层，动作在 hook | ✅ 真机 |
| 样式动作 | `src/features/style/useStyleActions.ts` | 页面动作与交互状态收口 | ✅ 真机 |
| 脚手架 | `tools/new-feature.mjs` | 新 feature 生成 | ✅ 使用中 |
| 范本自检 | `tools/check-templates.mjs` | 双向校验清单 | ✅ 使用中 |

状态含义：

- ✅ 真机：在 PS 里跑过
- ✅ 单测：有覆盖的单元测试
- ✅ 真实数据：用本机库文件验证过（未在 PS 里跑）
- ⚠️ 待单测：纯函数，还没有单测（下一个动它的轮次要补）
- ⚠️ 待真机 / 未使用：还没有真实调用方，首次使用时要重点验证
- — 规范：纯文档，无可执行代码

### 4.2 标记规则

- 范本文件**第一行**必须是 `【范本】` 注释，写清楚「新增同类代码必须照此结构」
- 非范本文件不得自称范本
- 新增范本必须先登记到 4.1 表格

### 4.3 范本劣化处理

发现更好的写法时：

1. **先改范本文件**，让它成为唯一正确写法
2. 再按范本修改已有代码
3. 不允许「新代码用新写法、老代码保持旧写法」并存
4. 若改动影响多个文件，登记到变更记录

**范本不好就先优化范本，不允许绕开范本自己写。**

### 4.4 范本评审

每次新增 feature 时，同时检查：

- [ ] 范本是否仍然成立（有没有出现范本没覆盖的情况）
- [ ] 新代码是否与范本结构一致
- [ ] 是否需要新增范本条目

---

## 五、AI 协作规则

后续 AI 参与开发时，必须遵守：

1. **先读 `CONVENTIONS.md` 和本文件**，再动代码
2. **先找范本**，没有范本先建范本，再写业务
3. **底层缺失时停下**，说明缺什么，不自行绕过
4. **不允许自创目录结构、命名、请求方式、样式方案**
5. 交付时必须说明：改了哪些层、是否动了范本、`npm run check` 是否通过

违反上述任一条，视为交付不合格，需要回退重做。

---

## 六、违反检测

| 检测点 | 手段 |
|---|---|
| 类型错误 | `npm run typecheck` |
| 架构越界 | `npm run lint`（no-restricted-imports） |
| 硬编码样式 | `npm run lint:css` |
| 结构不一致 | 对照范本人工审查 / agent 审查 |

`npm run check` 不通过 = 禁止提交，禁止进入下一步。

---

## 七、定期体检（范本 + 底层）

> 代码会腐烂，范本会过时，横切会失修。体检不是可选项，是固定动作。

### 7.1 触发条件（满足任一即必须体检）

| # | 触发 | 说明 |
|---|---|---|
| 1 | **完成一个功能**（页面能跑通） | 最常见，交付即体检 |
| 2 | **新增 3 个页面** | 结构问题会在这个量级暴露 |
| 3 | **改动 `core/` 或 `domain/`** | 底层一动，所有范本都可能失效 |
| 4 | **连续 2 周没有体检** | 时间兜底 |
| 5 | **出现「两套写法」迹象** | 发现重复实现，立即收敛 |

### 7.2 体检清单（七项，逐条给结论）

| # | 检查项 | 手段 | 通过标准 |
|---|---|---|---|
| 1 | 唯一入口 | 搜 `fetch(`、`evalScript`、`localStorage`、`split('\|')` | 只出现在对应 core 模块 |
| 2 | 重复实现 | 人工看同名能力 | 一个能力只有一处实现 |
| 3 | 范本一致性 | `npm run check:templates` | 双向一致 |
| 4 | 导航路由一致性 | `npm run check:nav` | 双向一致 |
| 5 | 死代码 | 找无人 import 的文件/导出 | 无孤儿（范本页除外） |
| 6 | 文档漂移 | 对照 `CONVENTIONS.md` §3 目录树与真实目录 | 完全一致 |
| 7 | 公共能力没写进页面 | 搜 `features/` 里的底层调用（规则见 `CONVENTIONS.md` §4.8） | 输出为空 |

附加项（每次体检顺手看）：

- 横切使用矩阵：哪些横切仍是「零使用」，是否需要提前落地
- 范本状态：`GOVERNANCE.md` §4.1 的状态列是否还准确
- 视觉一致性：是否有新组件绕过了 Token（stylelint 会拦，但人工再看一眼）

### 7.3 AI 主动询问规则（强制）

AI 在以下时机**必须主动问一句**，不能等用户提：

| 时机 | 必须说的话 |
|---|---|
| 完成一个功能、准备交付 | 「这个功能完成了。按治理规则该做一次体检，现在做吗？」 |
| 开始新功能之前，距上次体检已过一个功能 | 「上次体检后已经完成了 N 个功能，建议先体检再开新功能，要现在做吗？」 |
| 改动 `core/` 或 `domain/` 之后 | 「动了底层，范本可能失效，建议立即体检，现在做吗？」 |
| 发现重复实现的苗头 | 「发现两套写法，按规则要先收敛。要现在收敛吗？」 |

**不允许**：连续做多个功能都不提体检；发现结构问题却「先记着，后面再说」。

### 7.4 体检输出

每次体检产出一份报告，放在 `docs/review/REVIEW-YYYY-MM-DD[-N].md`，包含：

1. 总体结论（乱不乱）
2. 横切使用矩阵（含状态）
3. 风险清单（P0/P1/P2，带文件行号）
4. 修复记录
5. 下一步建议

报告写完必须跑一次 `npm run check`，并在变更记录里登记。

### 7.5 体检后的动作

| 发现 | 动作 |
|---|---|
| P0（会导致抄错） | 立即修，修完才允许继续业务 |
| P1（容易漏改） | 当次修或排进下一步，不允许无限期挂起 |
| P2（结构小问题） | 可延后，但必须登记在报告里 |
| 范本过时 | 先改范本，再改调用方 |

---

## 八、变更记录

| 日期 | 变更 | 影响范围 |
|---|---|---|
| 2026-10-27 | 建立约定、边界、范本制度 | 全项目 |
| 2026-10-27 | 目标环境定为 CEP 12 / Chromium 103 | 构建配置 |
| 2026-10-27 | 完成首次体检，修复 5 项（见 `docs/review/REVIEW-2026-10-27.md`） | core/cep、app、types |
| 2026-10-27 | 新增定期体检规则（第七节）与 AI 主动询问义务 | 治理流程 |
| 2026-10-27 | 应用类 PS 能力改为调用官方 jsx 副本（`jsx/vendor.jsx`），不自己实现 | `core/ps/style.ts`、`jsx/` |
| 2026-10-27 | 第二次体检：清死字段 `psReady`、启用 `usePersisted`、补目录树（见 `docs/review/REVIEW-2026-10-27-2.md`） | store、hooks、docs |
| 2026-10-27 | 体检清单加第 7 项「公共能力没写进页面」（规则在 `CONVENTIONS.md` §4.8） | docs |
| 2026-10-27 | 第三次体检：删掉有 bug 的旧形状实现 `core/ps/shape.ts` + jsx `mm_shape_*`，修正 `core/ps` 文档树（见 `docs/review/REVIEW-2026-10-27-3.md`） | core/ps、jsx、docs |
| 2026-10-27 | 第四次体检：`StylePage` 717→245 行（抽 `useStyleActions` + 4 组件），hook 内 8 处重复取仓库收敛（见 `docs/review/REVIEW-2026-10-27-4.md`） | features/style |
| 2026-10-27 | 第五次体检：补 `useConfirm()` 命令式入口（文档规定但原本不存在），删除流程改 `await`（见 `docs/review/REVIEW-2026-10-27-5.md`） | components/Confirm、app、features/style |
| 2026-10-27 | 第六次体检：四个「+」接通 + 色板四条命令；色板根入 `storage.ROOTS`；`emitAppEvent` 转正（见 `docs/review/REVIEW-2026-10-27-6.md`） | core/ps、repo、commands、features/style |
| 2026-10-27 | 第七次体检：hover 浮层 / 拖图取色 / 快速吸色接通；图片解码出页面（`core/image` 新建）；`ErrorCode` 加 `CANCELLED`（见 `docs/review/REVIEW-2026-10-27-7.md`） | core/cep、core/image、features/style |
| 2026-10-27 | 第八次体检：用户反馈模式 9 处重复收敛为 `runWithToast` / `runWithFeedback`（见 `docs/review/REVIEW-2026-10-27-8.md`） | features/style |
| 2026-10-27 | 第九次体检：导入导出接通（ku-io 移植 + ku-archive + dialog）；修 `fs()!` 断言、坏 JSON 吞掉、菜单定位收进 `ContextMenu.anchor`（见 `docs/review/REVIEW-2026-10-27-9.md`） | repo、core/dialog、domain |
| 2026-10-27 | 第十次体检：数据流走查（jsx 契约 / 编码方向 / 回收顺序全对上）；修 `CANCELLED` 取消误报为静默（见 `docs/review/REVIEW-2026-10-27-10.md`） | features/style |
| 2026-10-27 | 新增 `docs/PS-CHANNEL-NOTES.md`：三条通道、参数序列化、串行队列、env 注入、LayerKind、库文件数据契约、CEP 坑、排障速查 | docs |
| 2026-10-27 | 重写 `docs/plan/STYLE-PANEL-GAP.md` 为「现状 + 剩余缺口」，列出已失效的旧结论 | docs |
| 2026-10-27 | 新增工程 `README.md` 与 `CHANGELOG.md`；修正 `jsx/vendor.README.md`（来源、函数表、通道、返回值）与本节检查链、范本状态 | 全项目 |
| 2026-10-27 | **形状收口·第二批**：`JSON.parse` 直写 9→1（`parseJson(text, label)` 落 `types/json.ts`）；`raw.ts` 扩成约定值+JSON+err 信封唯一解析处；删死导出 14 个；删死横切链 `core/color`+`types/color`+`ShapeStyle`；`getDocumentInfo` TS+jsx 同轮删；`kuListOf`/`kuEnsureListOf` 收敛 list 判据；jsx 裸 catch 补声明。有副作用的项（jsx `parseColor`、双解析合并）维持登记不收 | types、core、repo、domain、jsx |
| 2026-10-27 | 明确测试边界：只测纯逻辑（`.test.ts`），TSX / UI 不写测试；新增 `AGENTS.md` 作为 AI 代理前置阅读门槛 | docs、AGENTS.md |
| 2026-10-27 | docs 目录分层：体检报告 → `docs/review/`，计划与缺口 → `docs/plan/`，页面规格 → `docs/spec/`；根下只留 `CONVENTIONS` / `GOVERNANCE` / `PS-CHANNEL-NOTES` 三份标准；§7.4 输出路径同步 | docs |
| 2026-10-27 | **形状收口**：全仓唯一结果形状 `Result{status, value\|code, reason, detail}`；删除 `ReadOutcome` / `SwatchRead` / `JsxCall` / `toResult`（`types/read.ts` 整个删掉）；三态改由码承载（`NOT_FOUND` / `CORRUPT` / `IO_ERROR`）；`PS_ERROR` 拆 5 个子码；新增 `core/ps/raw.ts`（raw 约定值唯一解析，表驱动）；删死函数 `getLayerKind` / `getLayerName`。纯形状改动，读写行为不变。jsx `parseColor` 合并有副作用（碰 PS 运行时），明确不收、另行登记 | types、core、repo、domain、commands、features |
| 2026-10-27 | 约定升级（字体管理前置）：`store` 允许 `repo`/`domain`；补「首次创建文件」规则；`ztgl_*` 直调通道；§13 允许「每页 30 + 触底」分片渲染 | docs |
| 2026-10-27 | 新增 `repo/json-file.ts` 作为唯一「读→改→写」入口，`style-repo.mutateRawGroups` 改为调用它（收敛两套写法） | repo |
| 2026-10-27 | 字体底层：`core/ps/font` 加 `ztgl_*` 两个能力；`domain/font-*` + `classification`；`repo/font-repo`；`commands/font`；`store/font`；`hooks/usePagedList` / `useInfiniteScroll`；`StateHint` 上移 | core、domain、repo、commands、store、hooks、components |
| 2026-10-27 | 字体管理页仍待真机（`ztgl_*` 返回形态、`SysFont2.json` 首建、应用字面）；下一步 `REVIEW-2026-10-27-11` | docs |
| 2026-10-27 | 第十一次体检：字体 M1 底层落地（core/domain/repo/commands/store/hooks）；`json-file` 收敛；P1 色板与导入导出写入口进报告（见 `docs/review/REVIEW-2026-10-27-11.md`） | core、domain、repo、commands、store、hooks、components、docs |
| 2026-10-27 | 字体管理 M2：页面/列表/搜索/标签/评分/预览/应用，33 行清单全部落点；`ContextMenu` 加 `inside`；Toast 层级提到弹窗之上（见 `docs/review/REVIEW-2026-10-27-12.md`） | features/font-manage、components、styles、app、README |
| 2026-10-27 | 第十三审查（操作序列/并发/输入法）：`mutateJsonFile` 读改写整体排队；`isImeEnter`；弹层 `autoFocus`；字体名 CSS 转义（见 `docs/review/REVIEW-2026-10-27-13.md`） | repo、components/ui、features/font-manage |
| 2026-10-27 | 第十四审查（目录/依赖/放置）：修正 `CONVENTIONS` §3 依赖表与 §4.8/§16 说明；删除 `core/storage.readJson`（`core/prefs` 自读）；`.DS_Store` 入 ignore 并删除（见 `docs/review/REVIEW-2026-10-27-14.md`） | docs、core/storage、core/prefs、.gitignore |
| 2026-10-27 | 字体 M3：标签导入导出（任意路径读写、CEP 对话框、导入前校验、覆盖写 `.bak`、`star` 原样保留）；新增 4 条解析单测（见 `docs/review/REVIEW-2026-10-27-15.md`） | core/storage、core/dialog、commands/font、domain/font-meta、features/font-manage |
| 2026-10-27 | 架构债清理：`types/decode.ts` 删除（`ku-io`/`ku-archive` 迁 `Result`）；删除同步 `writeJson`，prefs 走 `writeTextAtomic`；归档导入导出统一走 storage（`.bak` + 串行）；页面 P2 修焦点陷阱 / 应用防重入 / 新建失败保留输入 | types、domain、repo、core、features |
| 2026-10-27 | 重复实现专项：队列收敛到 `core/serial`；文件读写正文共用内部实现；base64 收敛到 `core/cep/base64`；font-repo 读写工厂；标签/星级校验共用；`ku-archive` 去掉直连 fs 并修「按 utf8 复制图片」bug（见 `docs/review/REVIEW-2026-10-27-16.md`） | core、repo、domain、types |
| 2026-10-27 | 第十七审查（外部意见对账）：删 `withStars`/`mergeFontStars`/`FontItem.star`；「缺失=空」收敛到 `font-repo.readMetaFile`；`parseErrEnvelope` 改 `Result<number>`（无 null 通道，同一 raw 只解析一次）；`json-file` 拆三个入口、布尔参数与死导出删除；`dropped` 接进 UI；删 `classificationRead`；新增 `repo/json-file.test.ts`（见 `docs/review/REVIEW-2026-10-27-17.md`） | core、repo、domain、commands、store、features |
| 2026-10-27 | 取消「组件 ≤ 300 行」硬限制：按职责拆分，不按行数；§二 原第 6 条删除后重编号，同步 `CONVENTIONS` §13/§17/§19、`AGENTS.md`、样式页注释与字体管理计划 | docs、AGENTS.md、features/style |
| 2026-10-27 | 新增注释规则（`AGENTS.md` §5）：三处注释位置 + 五条禁止，只写现状与原因 | AGENTS.md |
| 2026-10-27 | 第十八审查（数据可恢复性与诊断）：`core/storage` 补 `restoreBackup`/`absolutePath`/`backupPath`，失败提示带路径；导入改「先评分后标签 + 失败回滚」；`tools/probe-data.mjs` 增字体段（未加面板自检入口）；`CONVENTIONS` §4.5 补 `.bak` 三条事实（见 `docs/review/REVIEW-2026-10-27-18.md`） | core、repo、commands、tools、docs |
| 2026-10-27 | 第十九审查（代码质量）：修字重弹层冒泡误触、CSS 字体名转义收口、字形 key、收回 4 个无外部消费者的导出；登记 10 条结构性建议（文件体积、重复常量、输入框、token 命名等）（见 `docs/review/REVIEW-2026-10-27-19.md`） | features、hooks、repo、docs |
| 2026-10-27 | 第十九审查 P1/P2 补齐：`useFontManage` 拆 `useTagActions`（425→285/206）、CSS 拆三文件（957→433/282/244）、`apply` 用 ref 稳定；字号 token 收敛；无障碍与重复提交/焦点还原；列表 key 与无字面项灰态（见 `docs/review/REVIEW-2026-10-27-19.md`） | features/font-manage、components、styles、docs |
| 2026-10-27 | 授权链删除（无数据源）：`FontLicense` + `license-paths` + `.mm-font__license*` + 5 个 license token 删除；`commercials`/`presets` 不再解码、不再进 `Classification`；`matchFilter` 只剩语言，`filterFonts` 不再接收分类数据。应用字面判据收到 `domain/font-item.resolveFontFace`（缺名字即 `VALIDATION`） | features/font-manage、domain、commands、styles |
| 2026-10-27 | 形状收尾（P2）：`StateHint` props 改两支联合（`result` / `empty` 不能同时传，`Result\|null` 通道删除）；`parseTagArchive` 与 `decodeRawRecords` 的失败全部带 `detail`（`tags[0].arr` / `root[1]`），校验循环合并为一处；列表灰态与命令共用 `resolveFontFace` | components/StateHint、domain、repo、features/font-manage |
