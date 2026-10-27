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
| 文本属性 | `src/core/ps/text.ts` | `zt_*` 直调 26 个（3 读 + 23 写）；写只认约定值与 `{err:1}`（返回结构 UNVERIFIED） | ⚠️ 待真机 |
| 官方 jsx 通道 | `src/core/ps/vendor.ts` | 两条通道唯一实现：`runVendor`（`ps_onJsx` 调度）/ `runDirect`（直调 60s） | ✅ 调度真机 / ⚠️ 直调沿用 text 结论 |
| PS 常用页 | `src/core/ps/common-use.ts` | 26 个 `cy_*`（v1 覆盖 11 个 / 12 条命令 + 只登记 2）；**按原版调用点分通道**，三处拼写照抄 | ⚠️ 待真机 |
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
| 常用页模型 | `src/domain/common-use.ts` | 14 项官方种子（逐字照抄 `configReset`）+ 文件校验 + 视图投影 | ✅ 单测 |
| 常用页设置 | `src/domain/common-use-options.ts` | 17 个 `cy*` 键白名单 + 投影 + 深合并（数组替换 / 对象逐键） | ✅ 单测 |
| 数据访问 | `src/repo/style-repo.ts` | 读文件 → Result；`mutateRawGroups` 走 `json-file` | ✅ 真实数据 |
| 数据写入口 | `src/repo/json-file.ts` | 库文件 / 字体标签星级 / 色板的唯一「读 → 改 → 写」；首次创建显式分支 | ⚠️ 待真机 |
| 字面板仓库 | `src/repo/font-set-repo.ts` | 5 个 `sj_*` 设置文件；缺失按空/默认读、首次写才创建、`sj_set.json` 只改 `zt*` | ⚠️ 待真机 |
| 常用页仓库 | `src/repo/common-use-repo.ts` | `sj_commonFunction.json`（根是裸数组，缺失按种子读不写盘）+ `sj_set.json` 的 17 个 `cy*` 键（未知键原样保留） | ⚠️ 待真机 |
| 串行队列 | `src/core/serial/index.ts` | 按 key 串行，只保证顺序、不传递失败 | ✅ 单测 |
| 业务切片 | `src/store/style-library.ts` | 只读投影，失败原样保留 | ✅ 真实数据 |
| 文字属性快照 | `src/store/text.ts` | PS 为唯一真相；读失败保留旧值 + 标 stale，写成功由页面 patch | ⚠️ 待真机 |
| 字面板切片 | `src/store/font-set.ts` | 设置/快捷字体/层级/最近字体只读投影；设置本地先生效 | ⚠️ 待真机 |
| 常用页切片 | `src/store/common-use.ts` | 网格 / 17 键设置 / 折叠态只读投影；两类来源各自留失败原因 | ⚠️ 待真机 |
| 状态 | `src/store/app.ts` | 切片写法 | ✅ 真机 |
| UI 控件 | `src/components/ui/index.tsx` | 唯一 UI 出口；`Input` 是**全仓唯一输入框渲染入口**（`variant` 两档，其余只覆盖布局） | ✅ 真机 |
| 浮层挂载 | `src/components/Portal/index.tsx` | 唯一 `document.body` 挂载点；只管挂，开关/定位不在这里 | ⚠️ 待真机 |
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
| 全局快捷键 | `src/hooks/useShortcut.ts` | 常驻字母键；负责「打字中 / 带修饰键」两条排除；与 `useDismiss` 分工写在文件头 | ⚠️ 待真机 |
| 浮层关闭 | `src/hooks/useDismiss.ts` | 全项目唯一 mousedown/keydown 监听 | ✅ 真机 |
| 浮层定位 | `src/hooks/useFloatingPosition.ts` | 唯一锚点矩形入口（`update` 返回锚点矩形，对齐宽度也用它） | ✅ 真机 |
| 焦点陷阱 | `src/hooks/useFocusTrap.ts` | 仅模态弹窗：Tab 循环 + 关闭还原焦点 | ⚠️ 待真机 |
| 受控草稿 | `src/hooks/useDraft.ts` | 输入框本地值：外部值变了才回填，渲染期收敛 | ⚠️ 待真机 |
| 定位算法 | `src/hooks/floating-position.ts` | 纯函数，翻转与夹取 | ✅ 单测 |
| 长按拖拽 | `src/hooks/useLongPressDrag.ts` | 300ms 长按 + 克隆占位 + 落点判定 | ✅ 真机 |
| 落点计算 | `src/domain/reorder.ts` | 纯函数，四分支 splice 收敛 | ✅ 单测 |
| 列表分页 | `src/hooks/usePagedList.ts` | 每页 30 + 触底追加，筛选变化回第一屏 | ⚠️ 待真机 |
| 触底加载 | `src/hooks/useInfiniteScroll.ts` | 全项目唯一 `IntersectionObserver` | ⚠️ 待真机 |
| 右键菜单 | `src/components/ContextMenu/index.tsx` | 定位走 hook，菜单项由调用方给 | ✅ 真机 |
| 输入弹窗 | `src/components/InputDialog/index.tsx` | 原版 `$inputBox`：位置 50vw-90/top30%、空值拦截、Enter 提交 | ⚠️ 待真机 |
| 输入弹窗样式 | `src/components/InputDialog/input-dialog.css` | 对齐 `.input-box` / `.input-box-main` | ⚠️ 待真机 |
| 图标按钮 | `src/components/IconButton/index.tsx` | 26×26 + 选中态 + 角标；修饰键不在这里判 | ⚠️ 待真机 |
| 图标按钮样式 | `src/components/IconButton/icon-button.css` | 对齐原版 `.base-icon` | ⚠️ 待真机 |
| 图标 + 展开面板 | `src/components/IconPanel/index.tsx` | 关闭只认触发器、互斥是 `exclusive` 开关、点外/Esc 不关；受控 `openId`/`onOpenChange` 用于「跨行只开一个」 | ⚠️ 待真机 |
| 展开面板样式 | `src/components/IconPanel/icon-panel.css` | 壳不画背景，面板内容自带 padding/底色 | ⚠️ 待真机 |
| 勾选框 | `src/components/CheckBox/index.tsx` | 12×12 / 圆角 3 / 1px `#707070` / 右空 6；原生 input | ⚠️ 待真机 |
| 单选框 | `src/components/RadioButton/index.tsx` | 12×12 / `50%` 正圆 / 同 `name` 才互斥 | ⚠️ 待真机 |
| 输入框 | `src/components/TextField/index.tsx` | 三档定宽（`variant`）+ 左图标 + Enter 提交；内部渲染 `ui.Input` | ⚠️ 待真机 |
| 折叠行 | `src/components/Collapse/index.tsx` | 整行 100%×24、箭头位 20×13、上下 12；收起不渲染内容 | ⚠️ 待真机 |
| 确认弹窗 | `src/components/Confirm/index.tsx` | 删除类操作必须二次确认 | ✅ 真机 |
| 确认入口 | `src/components/Confirm/useConfirm.tsx` | `await confirm()`，页面唯一用法 | ✅ 真机 |
| 内联编辑 | `src/components/InlineEdit/index.tsx` | Enter 确认 / Esc 取消 / 失焦确认 | ✅ 真机 |
| 命令执行 | `src/hooks/useRunCommand.ts` | 包 loading + 失败提示 + 原因留痕（code/detail 进日志，人话进 toast）；面板/页面不再各写一份 | ⚠️ 待真机 |
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
| 2026-10-27 | 字体面板 M1（底层到命令）：新增 `core/ps/text.ts`（27 个 `zt_*` 直调，写只认约定值与 `{err:1}`）、`core/http/jsonp.ts`（百度翻译无 CORS）、`domain/{md5,translate,quick-font,font-set,text-info,font-set-clipboard}`、`domain/{free-panel,free-panel-legacy}`（只定形状与 key→命令映射，不写文件）、`repo/font-set-repo.ts`（5 个 `sj_*` 设置文件；缺失按空读、首次写才创建、`sj_set.json` 只改 `zt*`）、`store/{text,font-set}.ts`、`commands/font-set.ts`（20 条）。`hooks/input-method-enter.ts` 由 font-manage 上移（第二处调用），两处 import 同步改。4.1 登记 4 行 | core、domain、repo、store、commands、hooks、features/font-manage（仅 import） |
| 2026-10-27 | 体检 `REVIEW-2026-10-27-20`（触发 §7.1 #3）：P0×1（`zt_changeTextBranchMerge` 存在性待真机）、P1×2（8 个 M2 未接入的孤儿模块、`store/font-set` 无失败通道）、P2×4；修复：`ime.ts` → `input-method-enter.ts`（三个字母读不出含义）、`panel-constants.ts` → `font-panel-constants.ts`、CONVENTIONS §3 `hooks/` 括注补两项 | docs/review、docs/CONVENTIONS、hooks、features |
| 2026-10-27 | 字体面板 M2：`features/font-panel` 根页面（`FontPanelPage`）+ 拆分 / 生成按钮 / 粘贴 / 分布四个面板 + `BadgeIcon` / `CheckRow` / `NumberField` + `useFontPanel` + 页面 CSS；`/font` 路由注册、导航 `implemented: true`；`tokens.css` 新增 3 个面板尺寸 token。删除未被使用的 `hooks/useDebouncedCallback.ts`（设置改成立即落盘）。**翻译按钮暂 disabled（M3 接入后移除）** | features/font-panel、app、styles、hooks |
| 2026-10-27 | 按原版修正 4 处偏离：①`SelectBox` 增 `onRemove`（项内删除，对齐 `dropDowncom` 的 `therrSvg`）与 `inset`（面板 `calc(100% - 20px)/left 10/mt 5`），item 由 `button` 改 `div[role=option]`（嵌套 button 非法）；②新增公共 `components/InputDialog`（原版 `$inputBox`：`left:calc(50vw-90px)`、`top:30%`、宽 220、遮罩 `.1`、z 1001），分布弹窗与层级改名/新建共用，删 `DistributedDialog`；③层级改名/新建文案「请输入新的名字 / 请输入层级名字」+ toast「重命名成功/添加成功/删除成功/更新成功」；④快选触发器去掉左右 10px | components、features/font-panel、docs |
| 2026-10-27 | 新增 `docs/plan/03-常用-2026-10-27.md`：按 `05-常用.md` 对照清单定 v1（父页面 + 12 类基础按钮 + `comspacing` / `comreference` 两个子面板）、26 个 jsx 表（11 在用 + 2 只登记 + 13 待 v2）、17 条命令、2 个数据文件（`sj_commonFunction.json` + `sj_set.json` 17 键）、M0-M4、真机 10 步；明确 5 个子面板与 4 个 PS 事件排 v2 | docs/plan |
| 2026-10-27 | `IconPanel` 机制改造：面板改 `createPortal` 落地（节点留在组件子树，消除「打开第一帧读到旧节点」）；删 `panels` Map + 无依赖 effect，只留 `mount/unmount` 计数做 id 重复告警；`IconButton` 增 `ariaExpanded` / `ariaControls`，`trigger` 的 handlers 也带 `aria-controls`；收起时不再调用 `panel(close)` | components/IconPanel、components/IconButton、docs/review |
| 2026-10-27 | React 最佳实践复查（`REVIEW-21 §6.5`）：修 5 处 —— `NumberField`/`FontHierarchy`/`CreateButtonPanel` 三处 `useEffect` 派生 state 改渲染期收敛（`rerender-derived-state-no-effect`）、`FontColor` 三遍遍历合一次（`js-combine-iterations`）、家族查找改 `useMemo` Map（`js-set-map-lookups`）；`&&` 条件渲染 0 处；登记 3 条不改（图标 barrel、`IconButton` 无 memo、`IconPanel` 刻意无依赖数组） | features/font-panel、docs/review |
| 2026-10-27 | 补齐 `REVIEW-2026-10-27-20` 的 §7.2 七项（M1 时点）：新增 §4.5 七项表，第 1 项补 `split('\|')` 全仓 0 处与 `ztgl_` 落点（实际调用仅 `core/ps/font.ts`，其余为注释）；原 §4.5 附加三项改为 §4.6；计划 §10.2 的 `§7.2 1/2/7` 同步补这两条查法 | docs/review、docs/plan |
| 2026-10-27 | 行距「(自动)」按原版补：`FontColor` 显示 `useAutoLeading ? '(自动)' : 数字`（依据 `app.v4.js:1421662`）、`NumberField` 解析改 `parseFloat`（原版 `setFontFormat`，`(自动)` 不提交）、设行距成功后 patch `useAutoLeading: false`。`REVIEW-21 §7` 该项转为已修，未修 6→5 | features/font-panel、docs/review |
| 2026-10-27 | 补齐 §6.5 段 review：8 个历史段（M0/M1/M2/M3/公共组件/设置页/按原版修正/撤销）逐个补 `§7.2 1/2/7` 三项结论；新增 `§10.9 M4 验收`、`§10.10 代码质量体检` 两个整段 review；两份体检报告补「附加三项」（横切矩阵 / 范本状态 / 视觉一致性） | docs/plan、docs/review |
| 2026-10-27 | 代码质量体检（并入 `REVIEW-2026-10-27-21` §7）：修 6 项 —— `getTextInfoRaw` 漏判 `err !== 0`（非文字图层会读到残留值）、`SelectBox` 删除钮键盘冒泡导致「删除+选中」、`mergeFontSetSettings` 子对象未与旧值合并（会刷掉别的开关）、`FontHierarchy` 保存预设写两次盘、`store/text` 刷新竞态、属性未读到就摆默认数字；登记 6 项未修（行距「(自动)」显示、`run().then` 重复、`IconPanel` 面板更新依赖、`InputDialog` 焦点陷阱、`as CSSProperties`、quickFont 两次读） | core/ps、components、domain、store、features/font-panel |
| 2026-10-27 | 字面板 M4 验收（代码侧）：数字对账 9 组件 8/9（翻译未做）、36 文案 31 出现（5 条各有理由）、jsx 29、命令 20、数据文件 5；机器侧六道关全绿；**运行时全部待真机**。体检 `REVIEW-2026-10-27-21`（触发 §7.1 #1+#3）：P0×1（`zt_changeTextBranchMerge`）、P1×2（背景对齐 Shift 参数、`translate` 族无调用方）、P2×4；修复：删 `DEFAULT_APP_UNIT` 孤儿导出 | docs/plan、docs/review、domain |
| 2026-10-27 | 撤销面板单位后缀链路：删 `core/ps/text.getTypeUnitsRaw`、`VENDOR_FUNCS` 的 `zt_getTypeUnits`（35→34 项）、`store/text.unitLabel`（§3.7 接口回原样）、`domain/units` 的单位映射、`FontColor` 的后缀。原因：该值唯一用途是显示单位，而用户只需知道数值大小、不需要知道单位，原版面板也没有独立单位元素（`:1417720` 把单位拼进值里）。**jsx 口径 30 → 29（4 读 → 3 读）**，计划 §3.1/§3.7/§4.1/§7.2 已同步。设置页 `appUnit` 保留（原版真有），当前无消费者，已如实标注 | core/ps、store、domain、features/font-panel、docs |
| 2026-10-27 | 字体面板后缀单位按原版补正（**已被上一条撤销**）：`store/text` 加 `unitLabel`，`refresh()` 与属性一起读 `appPreferences.typeUnits`（原版 `:1407034` / `:1408002` / `:1408634`），失败保持原值、默认「点」、未知映射为空；`domain/units.ts` 增 `typeUnitLabel` / `DEFAULT_TYPE_UNITS`。**这是对 §3.7 冻结接口的补正**（原版确有该项数据），已同步改计划 §3.7 | domain、store、features/font-panel、docs |
| 2026-10-27 | 设置页（`/set`）第一项「单位」：`domain/units.ts`（原版 6 项 `像素(px)/厘米(cm)/毫米(mm)/英尺(in)/点(pt)/派卡(pc)`，文案无空格）、`features/settings` 页面写 `sj_set.json` 的 `appUnit`（失败回滚 UI，对齐原版 `set/index.vue:146-158`）；路由注册、导航 `implemented: true`。**撤销上一版按推断做的「3 项界面偏好 + `core/prefs` 的 `app.unit`」**：原版存 `sj_set.json`，字体面板后缀另取文档属性 `typeUnits` | features/settings、domain、app、core/prefs（删键） |
| 2026-10-27 | 公共组件 IconButton + IconPanel：`components/IconButton`（`BadgeIcon` 上移，26×26 + 选中态 + 角标）、`components/IconPanel`（`IconPanelGroup` + `IconPanel`：关闭只认触发器、点外/Esc 不关、`exclusive` 开关管互斥、`trigger` 支持自定义触发器即点即开）；`CONVENTIONS` §6 扩到 4 项并写死四条规则；4.1 登记 4 个文件。返工：字体面板顶部 6 图标改用它（`useFontPanel` 删 `panel`/`togglePanel`）、属性区 3 个预设改为 `IconPanelGroup`（字号/行距 `exclusive={false}` 可同时展开）、`BadgeIcon` 删除 | components、docs、features/font-panel |
| 2026-10-27 | 字体面板 M3：`FontQuick` / `FontHierarchy` / `FontColor` 接入页面；`components/SelectBox` 增可选 `footer?: (close) => ReactNode`（向后兼容，既有调用不变，属范本能力扩展）；图标白名单补 `iconshuru`。**翻译按钮保持 disabled，`translate` 命令与 `domain/translate` 暂不接线（方案未定）**；单位显示因缺少合法通道暂缺，待决策 | features/font-panel、components/SelectBox、components/icons、tools |
| 2026-10-28 | 常用页 M3（两个子面板）：`features/common/components/SpacingPanel`（间距输入 + 水平/垂直两颗图标按钮 + 按图层/按坐标两个单选）与 `ReferencePanel`（宽度 + 应用 + 清除参考线 + 基于参考线切片）；网格改「每 3 个一行 + 每行一个 `IconPanelGroup`（受控 `openId`）」，`TileButton` 作为 `IconPanel` 的 trigger，面板落在本行之后；`TextField` 增第四档 `fill`；可点判定改为「有面板或命令」。**v2 缺口**：智能参考线勾选框未做 | features/common、components/TextField、docs |
| 2026-10-28 | **常用页 v1 收尾**：`README` 状态表补字体面板 / 常用页 / 设置三行；`03` 计划新增 §11 交付状态（落地清单 + 三类未清事项 + 数据契约）；`daily/架构日志/01` 按方法要求补「2026-10-28 复算」（`.status` 373→399、构造点仍 1 文件、可选失败字段仍 0），新增 `02-常用页-形状收口.md`（九个量 + 凭据 + 净减 + 退二档）；全仓提交并推送 | docs、README、daily |
| 2026-10-28 | 事件处理重复收口（`SHAPE-…-常用页.md` §七）：①Enter 提交骨架 6 → 1（`hooks/input-method-enter.enterSubmit`）②全局 keydown 收进 `hooks/useShortcut`（`nav-bar` 不再自己挂，`CONVENTIONS` §4.8 改成两个全局键盘入口）③**修 bug**：右键 `preventDefault` 原先只在 `IconButton` 内部，自定义 trigger 会同时弹系统菜单 → 收进 `IconPanel.onContextMenu` ④取色弹层两处右键删除 2 → 1 ⑤点面板本体挡冒泡 5 → 1（`ui.stopClickPropagation`）。判为不同语义不合并 4 项（三个键盘入口 / InputDialog 的 autoFocus / Portal 与 host / SelectBox 的挡冒泡） | hooks、app、components、features、docs |
| 2026-10-28 | 反馈族收口（第二轮，`SHAPE-2026-10-28-常用页.md` §六）：「执行一条命令并反馈」的 5 份实现摊开比对后，同形状的 4 份（常用页 3 + `style.runWithToast`）收进 `hooks/useRunCommand` 的四个语义槽（`success` / `quiet` / `reasonOf` / `after`）；`style` 的 `runWithToast` / `runWithFeedback` 只剩两个动词名（各 2 行），`toastFailure` 与写路径共用 `styleReason`（同一判据不再两处）。**判为不同语义不迁 3 处**：`useFontPanel.run`（不包 loading，迁了会给 20 多处加遮罩）、`home`×2（调试页要 `code` 与返回值）、`StylePage:107`（多步解析非单条命令）。`grep "loading.run("` 8 → 5，形状内 5 → 1 | features/style、hooks、commands/README、docs |
| 2026-10-28 | **形状收口手术**（`docs/review/SHAPE-2026-10-28-常用页.md`）：九个量 + 十五刀逐刀给结论。实测形状 **1 份**（`Result`）、判别位 **1 种**（`.status` 400 处）、可选失败字段 **0**、生产构造点 **1 个文件**（`types/result.ts`）。收口 2 组：①「包 loading + 失败提示」3 → 1（新 `hooks/useRunCommand`，`useCommonPage` / `SpacingPanel` / `ReferencePanel` 的私有 `run()` 全删）②折叠态归一化 2 → 1（`domain.normalizeCollapsed`，store 读与命令写共用）。顺手补刀 14：`run` 不再丢 `code`/`detail`（进日志），`StateHint` 的 CORRUPT / IO_ERROR 把 `detail` 挂 `title`。**退二档 3 条**（自由文本失败 193 处存量 / 测试 5 处 mock 字面量 / `?? ` 默认值），**未收同类 4 处**已在报告 §六点名 | hooks、domain、store、commands、features/common、components/StateHint、docs |
| 2026-10-28 | react-best-practices 第二轮复核（M3/M4 新增代码，见 `REVIEW-2026-10-28-23` §8）：修 3 项 —— ①`SettingsPage` 改两个派生布尔选择器（不再订阅整个 `options`）；②`hooks/useLongPressDrag.ts:151` 内联 `color:#ffffff` 改 `var(--mm-color-text-inverse)`；③`run(task)` 参数就地重画的 `{status:...}` 联合类型改用 `Result<void>`（`useCommonPage` / `ReferencePanel`）。登记不改 4 项（`BottomBar` 的 8 个 SVG 色值 / filter+切行两趟 / `TileButton` 不加 memo / 面板元素每次新建），各有理由写在报告里 | features/settings、hooks、features/common、docs |
| 2026-10-28 | 常用页 M4（验收）+ 体检 `REVIEW-2026-10-28-23`：数字对账 8 个口径（组件 5 / class 28+10 / 文案 50+5 / jsx 26 / 命令 17 全部有调用方 / 数据文件 2 / 公共件 5 / token 15，其中 class 与文案的差异已解释、token 计数由 18 改正为 15）；真机 10 步按实际入口修订（第 6 步走设置页、第 8 步 3 个按钮）；补 3 个「命令没有入口」的缺口 —— `setShow` → 设置页「显示的功能项」14 勾选、`resetAll` + `openDirectory` → 页头两个图标按钮；`setCollapsed` 改为只推 store 不再全量重读。**P0（`VENDOR_FUNCS` 60 项探测）仍待真机** | features/common、features/settings、docs |
| 2026-10-28 | 常用页 M2（页面骨架）：`features/common/{CommonPage,useCommonPage,common-constants}` + `components/TileButton`（50×50 / 圆角 10 / #494949 / 悬停 #222 / 角标 3×3）；缩放区（2 个 `TextField` + 4/4/10/10 档）、变换区（翻转 6 向）、三处折叠、按 `sj_set.json` 的 `cyShowZoom`/`cyShowTransformation` 显隐；设置页新增「常用功能面板」两行；`/common` 路由 + 导航 `implemented: true`；`tokens.css` +15 个 token；`build-icons` 增 `isIconName` 守卫（禁止 `as IconName`）并补 2 个图标；`store/common-use.reasons` 改存 `Result` 供 `StateHint`。**缺口**：每行 `IconPanelGroup` 顺延 M3、`setShow` 无 UI 入口待定 | features/common、features/settings、app、components/icons、styles、store、docs |
| 2026-10-27 | 影子专项第二轮（用户要求「查到就改完」）：`ui.Input` 加 `variant` + `forwardRef`，六处输入框全部改走它（裸 `<input>` 只剩 `Input` 与 CheckBox/RadioButton 内部）；新增 `components/Portal`（6 处 `createPortal(…,document.body)` 收敛）、`hooks/useDraft`（3 处草稿 state）、`hooks/useFocusTrap`（4 处弹窗统一，`Confirm`/`ImgColorDialog`/`InputDialog` 属有意补强）；`useFloatingPosition.update()` 返回锚点矩形（SelectBox 不再自量）；`--mm-z-drag` + `.mm-drag-float` 取代内联 999；`.mm-modal-mask` 收敛确认框与取色层遮罩；Toast id 改自增计数；`CONVENTIONS` §4.8 补 `core/auth` 的 localStorage 例外、§6 输入框改为「唯一渲染入口」 | components、hooks、features、styles、docs |
| 2026-10-27 | **影子/私有副本专项**（并入 `REVIEW-2026-10-27-22` §7）：修 6 条 —— ①`.stylelintrc.json` 的 px 规则从前缀漏检补齐（`min-*`/`max-*`/`padding-*`/`margin-*`）并新增 `rgb()/rgba()/hsl()` 禁写，全仓收紧后仅 7 条违规、已全部收进 token；②两处遮罩裸色改 `--mm-color-modal-mask`；③`clampIndex` 两份私有实现收敛到 `domain/font-set.clampListIndex`；④`core/ps/env.ts` 的 `/SheJiZhuLi` 改 `ROOTS.legacy`；⑤`NewGroupRow` 的文本箭头 `▸` 改 `Chevron`；⑥4 处 `min/max` 尺寸进 token。登记未修：输入框 5 份实现、6 处 body portal、`SelectBox` 自量宽度、拖拽 `z-index:999`、弹窗壳三套、草稿 state 三份、焦点陷阱单点 | .stylelintrc.json、styles、components、domain、repo、core/ps、features/style、docs |
| 2026-10-27 | 体检 `REVIEW-2026-10-27-22`（触发 §7.1 #1 + #3，范围 M0+M1）：七项 5 通过 / 2 不通过（死代码=已知预留、文档漂移=已修）；P0×1（`VENDOR_FUNCS` 一次 +25 的全局探针风险，待真机）、P1×5、P2×3。修复 9 项：jsx 计数口径 12/13 六处、`init.ts` 文本属性 27→26、`CONVENTIONS` §3 目录树补 5 项（prefs/clipboard/dialog/image/dev）、`CheckBox`/`RadioButton` 补 `:focus-visible`、`TextField` 的 `title` 改必填、`Collapse` 补 `aria-controls`、`FlipDirection` 从 commands 转出、`reorder` 队列内长度守卫、**通道口径纠错**（`cy_distributedByPitch` 原版两处都是 `jsxHistory`，§4.7 旧表与 §11.3 写成直调；代码统一登记 P1） | docs/review、components、commands、core/ps、CONVENTIONS、PS-CHANNEL-NOTES |
| 2026-10-27 | 常用页 M1（底层到命令）：`core/ps/vendor.ts`（调度 / 直调两条通道的唯一实现，`style.ts` / `text.ts` 同步收敛，删掉各自的私有副本）、`core/ps/common-use.ts`（26 个 `cy_*`，v1 覆盖 11 个 / 12 条命令 + 只登记 2）、`VENDOR_FUNCS` 35→60（净增 25，`cy_distributedByPitch` 与文本属性共用）、`domain/{common-use,common-use-options}`（+22 条单测）、`repo/common-use-repo.ts`、`store/common-use.ts`、`commands/common-use.ts`（17 条）；`CONVENTIONS` §5/§8、`PS-CHANNEL-NOTES` §11.4 新增 + §五同步；图标白名单 +4 个悬停图（90 个）。**回源码纠正计划 5 处**（通道不是一刀切、`distribute` 三参、v1 漏 `swapWireframeFill`、`VENDOR_FUNCS` 应为 60、`cya4` 的 title 是空串），已同步改计划 §3.1/§3.5/§3.6/§4.6/§7.4 并记进 §10.2 | core、domain、repo、store、commands、docs、tools |
| 2026-10-27 | 常用页 M0（约定 + 5 个公共件）：`IconPanelGroup` 加受控 `openId`/`onOpenChange`（不传走内部 state，字体面板零改动）；`CheckBox`（`CheckRow` 上移，14→12 / 圆角 2→3 / 右空 8→6）、`RadioButton`（12×12，`CreateButtonPanel` 两处裸 radio 迁入）、`TextField`（三档定宽 `variant` + 左图标 + Enter 提交，内部渲染 `ui.Input`）、`Collapse`（100%×24 / 箭头位 20×13 / 上下 12）；`CONVENTIONS` §6 由 4 项扩到 7 项并写死 12×12；`PrefKey` 加 `common.collapsed`；图标白名单 +20（网格 14 + 翻转 6）重生成 86 个；`tokens.css` 新增 10 个 token；`FontPanelPage.css` 删 26 行死样式。**`VENDOR_FUNCS` / `PS-CHANNEL-NOTES` §11.4 / §4.1 的 4 行顺延 M1**（与文件同轮，理由见 03 计划 §3.5 补注） | components、docs、styles、core/prefs、tools、features/font-panel |
| 2026-10-27 | 字体面板 M0（约定与登记）：`CONVENTIONS` §3 目录树补 `core/ps/text.ts`、§5 存储表补「官方设置文件走 repo」、§5 网络行补 `jsonpGet`、§4.7 通道表补文本属性直调、§8 能力层补 `text.ts` 并删已不存在的 `document.ts`、§16 补 `shortcut` / `implemented` 顺序；`PS-CHANNEL-NOTES` 新增 §11.3（30 个文本属性函数，全部 UNVERIFIED）、§四补超时、§五 `VENDOR_FUNCS` 扩到 35 项；`core/ps/init.ts` 登记 27 个新函数；图标白名单补字面板 20 个图标。§4.1 的 4 行（`core/ps/text.ts`、`repo/font-set-repo.ts`、`store/text.ts`、`store/font-set.ts`）与文件**同一轮**登记（M1），理由同 01 计划 §4.1.3：`check:templates` 是双向校验，先登记后建文件会让 `check` 红 | docs、core/ps、components/icons |
