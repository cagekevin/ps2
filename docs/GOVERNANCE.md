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
5. 在 `docs/CHANGELOG.md` 登记
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

如果发现已有两套写法，按 §0.5 原则三收敛成一套，并登记到 `docs/CHANGELOG.md`。

---

## 四、范本制度

### 4.1 范本清单

> **2026-10-30**：2026-10-29 曾把全部样式文件骨架化（只留结构与定位，视觉待重写）——
> **当日视觉稿已上线**（全仓 34 个 CSS 按 tokens 写回），下表中 CSS 范本行的视觉描述**重新成立**；
> 设计 Token 未动，仍是颜色 / 尺寸唯一出处。新增 CSS 范本条目时写明三件事：**宽 / 皮 / 默认 path**。

| 层 | 范本文件 | 说明 |
|---|---|---|
| 设计 Token | `src/styles/tokens.css` | 全仓唯一允许写原始色值与 px 的文件；色阶按亮度单调、语义角色唯一、间距六档、控件高度一档、字号三档；蓝的用法见 `docs/STYLE.md` §7 规则 12 |
| 公共布局原语 | `src/styles/global.css` | 全仓**横排唯一入口** `.mm-u-row` / `.mm-u-row--wrap`（`display:flex` + `align-items:center` + `justify-content:space-between`，一律两端铺满，没有左对齐 / 右对齐变体）；**组合层·布局**（`STYLE.md` §6.2）也在这里：`.mm-divider` / `.mm-icon-row` / `.mm-btn-grid` / `.mm-tabs`（文字 tab 条，`--start` 为按内容宽靠左档）/ `.mm-u-tiles`（贴左换行排，与 `.mm-u-row--wrap` 的两端铺满分方向），除 `.mm-u-tiles` 与 `.mm-tabs` 外都不带 `justify-content`（行类必须与 `.mm-u-row` 同挂）；浮层壳 `.mm-popover`、遮罩 `.mm-modal-mask`、勾选 / 单选根、页面根容器也在这里；页面壳与 `.mm-font__list` / `.mm-style__list` 的 `scrollbar-gutter: stable`（`docs/STYLE.md` §7 规则 18）也只在这里给 |
| CEP 通道 | `src/core/cep/bridge.ts` | 唯一 PS 交互入口 |
| Node 模块 | `src/core/cep/node.ts` | 唯一 require 出口，文件读写靠它 |
| 剪贴板 | `src/core/clipboard/index.ts` | 唯一复制入口，自动降级 |
| 日志 | `src/core/logger/index.ts` | 内部脱敏 + 相同消息折叠 + 清空入口（诊断页） |
| 存储 | `src/core/storage/index.ts` | 三根 + Result 读 + 原子写（备份/串行） |
| 偏好 | `src/core/prefs/index.ts` | 界面状态持久化，key 强类型；`savePref(key, value)` 是「写入并立即落盘」的唯一入口（失败只记日志、不阻断业务），`flushPrefs` 不导出 |
| 文本混淆 | `src/core/cep/text-codec.ts` | 字体参数编解码（原版 Xv） |
| 字体应用 | `src/core/ps/font.ts` | `ys_*` 先检查再应用；`checkFontUsable` 不可用时返回**宿主原话**（「请选择文字图层!」/「字体缺失」），不再统一改写成「字体不可用」；`ztgl_setFont` 成功返回 `{"code":"OK"}`（不是 `err` 信封；解析用 `lenientVoid`，认不出就原样转发当成功）；`applyFont` / `getSystemFontList` 已进能力表 |
| 文本属性 | `src/core/ps/text.ts` | `zt_*` 全部直调、**条数以能力表为准**（本行曾写 26/25/24/21 四个数字，每删一个能力就漂一次）；写只认约定值与 `{err:1}`；除读函数外都走能力表（`CAP.*`），前置写在表的 `require` 里（执行器第一步判定，不通过直接终止）：绝大多数带 `requireTextLayer`，`distributeByPitch` 带 `requireSelection(2)`（分布的对象是多个图层，不限于文字）；写一律 `lenientVoid` + 60s。非文字图层上这批写函数不报错、返回 `undefined`、什么都不做。`zt_changeTextBranchMerge` 已删（抛「没有这种元素」，是派发表 key 不是函数）；`zt_switchFontDirection` 已删（入口被「批量文字」替换，2026-10-31）。批量文字的三个 `mm_text_*` 在 `core/ps/text-batch.ts`，**不是范本**（未登记本表），解析器在同目录 `text-batch-raw.ts` —— 放回 `text-batch.ts` 会形成 `capabilities ↔ text-batch` 运行时环 |
| PS 能力执行器 | `src/core/ps/capability.ts` | 唯一执行器：门（core / vendor）→ 前置 → 调用（直调 / 调度）→ 解析，四步固定；不认识任何 jsx 函数名与兜底文案，唯一认识的码是门失败的 `PS_UNREADY`；`gate` 与 `channel` 是判别联合，错组合编译不过 |
| PS 能力表 | `src/core/ps/capabilities.ts` | 一行一个能力（`fn`/`gate`/`channel`/`timeout`/`parse`/`require`）；严格度由 `parse` 的解析器决定，新增能力只加一行 |
| PS 常用页 | `src/core/ps/common-use.ts` | 26 个 `cy_*`（v1 覆盖 11 个 / 12 条命令 + 只登记 2）；**按原版调用点分通道**，三处拼写照抄 |
| 路径 | `src/core/paths/index.ts` | 路径拼接与资源 URL |
| 命令层 | `src/commands/README.md` | 命令判定标准与写法 |
| 鉴权 | `src/core/auth/index.ts` | token + 版本化 key；401 订阅表走 `core/feedback/channel` |
| 环境 | `src/core/env/index.ts` | 版本号、扩展 ID |
| 网络 | `src/core/http/client.ts` | 唯一请求入口 |
| 接口登记 | `src/core/http/endpoints.ts` | 标注来源与验证状态 |
| 动作库形状 | `src/domain/action-library.ts` | 7 形状里的 4 个 + 解码（结构 reject / 项 filter）+ 11 个纯编辑函数；`group` 执行必带、别名空串 = 删别名、删分组补「默认分组」 |
| `.dzx` 编解码 | `src/domain/action-dzx.ts` | 外层字段名照抄官方 `arrFileData` / `store`；解码严格（不合格 `CORRUPT`）；`planImportFiles` 只算计划，写序在 repo |
| 动作库读写 | `src/repo/action-repo.ts` | 索引（对象）+ 仓库文件（裸数组）两个入口；缺失读默认值**不写盘**；导入写序「先文件、最后索引」；`readWarehouseText` 取原文（不重新序列化）。**读/写解码分开**：读用 `decodeLibraryFile`（带 `dropped` 记账），写用 `decodeLibraryGroups`（只要裸数组）——混用会把库文件写成 `{groups,dropped}`（`TD-03-3`，单测钉住） |
| 动作库投影 | `src/store/action.ts` | 只读投影 + `columns`（prefs `action.listColumns`，坏值归 2）；不写文件，**失败只存失败臂**：多源用 `failures: { <来源>: Failure }`、单源用 `failure`（`Result` 不进 store，`TD-05-2`） |
| PS 重命名 | `src/core/ps/rename.ts` | 两条 jsx 都**直调 + 只发不读**：`cmm_batchName([表达式, 是否过滤子图层])` / `cmm_setLayerColor([0..7])`；表达式求值在 PS 侧，前端只拼串 |
| 重命名预设模型 | `src/domain/rename.ts` | 裸数组 `RenameGroup[]`；第 0 组「最近使用」由程序写（`isGroupEditable` 一处守）；删标记按 `%%nn→%%n→%nn→%n=→%n` 全删；`.cmm` 只认 JSON，坏结构 `CORRUPT` |
| 重命名预设读写 | `src/repo/rename-repo.ts` | `sj_cmmRename.ini`（后缀 `.ini`、内容是裸数组）：缺失 = 种子不写盘 / 改动 = `updateOrCreateJsonFile` / `.cmm` 导入 = 整份替换；写路径只写预设本体，不写 `dropped` |
| 重命名预设投影 | `src/store/rename.ts` | 只读投影：读失败**保留上一份** + 失败臂进 `failure`（单源 store 与 `store/text` 同名）；`dropped` 记账后由页面显示「N 项无法识别」；另存两个界面偏好的**归一化后**值（`normalizeMode` 是唯一判据，落盘在 `commands/rename` 的 `setMode` / `setColorSignOpen`，键的唯一拼写在 `RENAME_PREF_KEYS`） |
| PS 动作 | `src/core/ps/action.ts` | 动作页两条 jsx：`dz_callAction`（**调度**，参数是**整个 item**，长任务 300s，是调度通道唯一的超时例外）+ `dz_getActionList`（**直调**，无参，返回不解码）。两条都是 `function`；`dz_getActionList` 返回**裸数组** `[{ name, children: [{ name, isAdd }] }]`，与 `domain/action-library.mapPsActions` 的解码一致 |
| PS 初始化 | `src/core/ps/init.ts` | jsx 加载 + 两扇门的能力探测：`CORE_FUNCS` / `VENDOR_FUNCS`（**条数不写在这里**，随能力增删变；要数直接读 `init.ts` 的数组），两清单都由 `init.test.ts` 与能力表对账（表里加一行必须同时加）；探测**本身**失败记进 `PsCapability.probeFailure`，不折成「清单里全部缺失」。**探测分两级**：只有 `CORE_REQUIRED`（`mm_layer_getState`）/ `VENDOR_REQUIRED`（`ps_onJsx` + `Sys_setSystemEnvInfo`）缺了才整门不可用；其余缺了记进 `PsCapability.missing`，由 `callCapability` 按 `spec.fn` 逐个报 `PS_UNREADY` + `detail: fn:<名字>` |
| PS 图层 | `src/core/ps/layer.ts` | Result 转换；**前提判断的唯一出口**：`requireLayerKind(allow, need)` + `requireTextLayer` / `requireShapeLayer`（类型）、`requireSelection(min)`（多选数量，走独立的 `mm_layer_getSelection`），不满足返回 `PS_WRONG_LAYER`（reason 写明「当前是什么，需要什么」） |
| PS 样式 | `src/core/ps/style.ts` | 颜色 / 渐变 / 图层样式全部走 `ps_onJsx`；颜色用 vendor 的 `ys_useStyleColor`，**单选多选同一个调用**（遍历在 vendor 内部），前端不判数量不循环 |
| PS 诊断 | `src/core/ps/diag.ts` | 探测 vendor 函数与配置依赖；`runDebugScript` 把诊断页输入的一段 ExtendScript 原样发给宿主并回显结果——**唯一执行「页面递进来的代码」的入口**，只给 `/debug` 用，业务不许经它绕过 `core/ps` 建能力 |
| PS 环境 | `src/core/ps/env.ts` | 注入官方 jsx 所需环境变量 |
| 样式命令 | `src/commands/style.ts` | 颜色 / 渐变 / 字体 / 图层样式 / 修饰键 |
| 类型 | `src/types/result.ts` | 全仓唯一结果形状（status/code/reason/detail） |
| JSON 解析 | `src/types/json.ts` | 唯一的文本 → unknown 入口（label 必填） |
| 列表解码 | `src/types/decode-list.ts` | 唯一的「数组 → 逐项解码 + `dropped`」入口（`reject` / `filter` 两策略，`pathPrefix` 决定 `detail` 前缀）；**只用于读视图**，写路径必须读原始记录 |
| raw 协议解析 | `src/core/ps/raw.ts` | raw 约定值 / JSON / err 信封唯一解析处（表驱动）；信封 `msg`（失败原因）走 `envelopeMessage`；能力表的 `parse` 只许引用这里的具名解析器（`passthrough` / `unwrapRaw` / `lenientVoid` / `strictData` / `strictPayload` / `parseDataEnvelope`）。**判据：只认宿主明确说过的信号，两个方向都不猜** —— `{"err":0}` / `{"code":"OK"}` / 无返回 / 裸 `0` 算成功，`{"err":1}` 算宿主拒绝（`VALIDATION` + 宿主原话），约定值走 `RAW_FAILURES`，**其余一律 `PS_BAD_PAYLOAD` + 原文进 `detail`**（既不编失败，也不编成功）。`parseJsxRaw` / `unwrapRaw` **只许 `font.ts` / `style.ts` / `diag.ts` 的多步组合逻辑用**，单能力必须进能力表 —— 这两条是判据不是闸，评审时看 |
| 类型守卫 | `src/types/guards.ts` | isRecord / isArrayOf |
| 业务模型 | `src/domain/style-library.ts` | 纯归一化，实测换算 + kuListOf/kuEnsureListOf |
| 库格式 | `src/domain/ku-format.ts` | 三种库文件形态识别 + base64 |
| 常用页模型 | `src/domain/common-use.ts` | 14 项官方种子（逐字照抄 `configReset`）+ 文件校验 + 视图投影 |
| 常用页设置 | `src/domain/common-use-options.ts` | 17 个 `cy*` 键白名单 + 投影 + 深合并（数组替换 / 对象逐键） |
| 数据访问 | `src/repo/style-repo.ts` | 读文件 → Result；`mutateRawGroups` 走 `json-file` |
| 数据写入口 | `src/repo/json-file.ts` | **全仓唯一写盘入口**：读改写 3 个 + 整份替换 2 个（`replaceJsonFile` 给值、`replaceFileText` 给原文，别合并成 `string \| T` 联合）；首次创建显式分支；**不认识任何业务文件的形状**（`sj_set` 的顶层解码在 `repo/settings-object.ts`）。`repo/*` 不许直接调 `core/storage.writeTextAtomic`——那会绕开「读改写 ↔ 整份替换」之间的排队 |
| 设置文件形状 | `src/repo/settings-object.ts` | `sj_set.json` 的文件名常量 + 顶层解码 + 原始记录数组；两个按键分工的 repo 共用这一份 |
| 字面板仓库 | `src/repo/font-set-repo.ts` | 5 个 `sj_*` 设置文件；缺失按空/默认读、首次写才创建、`sj_set.json` 只改 `zt*` |
| 常用页仓库 | `src/repo/common-use-repo.ts` | `sj_commonFunction.json`（根是裸数组，缺失按种子读不写盘）+ `sj_set.json` 的 17 个 `cy*` 键（未知键原样保留） |
| 串行队列 | `src/core/serial/index.ts` | 按 key 串行，只保证顺序、不传递失败 |
| 业务切片 | `src/store/style-library.ts` | 只读投影；失败**只存失败臂**（`indexFailure` / `failures`，不存整条 `Result`），`code`/`reason`/`detail` 一个不丢；三态读法：`failures[k]` 非空 = 失败、`libraries[k]` 非空且无失败 = 读到（空数组 = 读到但是空）、两者皆空 = 还没读 |
| 文字属性快照 | `src/store/text.ts` | PS 为唯一真相；读失败保留旧值 + 标 stale，写成功由页面 patch |
| 字面板切片 | `src/store/font-set.ts` | 设置/快捷字体/层级/最近字体只读投影；设置本地先生效 |
| 常用页切片 | `src/store/common-use.ts` | 网格 / 17 键设置 / 折叠态只读投影；两类来源的失败臂在 `failures: { tiles, options }`（与 `store/action` 同名同形） |
| 状态 | `src/store/app.ts` | 切片写法 |
| UI 控件 | `src/components/ui/index.tsx` | 唯一 UI 出口；`Input` 是**全仓唯一输入框渲染入口**（**没有 `variant`**，表面按所在表面走，见 `STYLE.md` 规则 15 / 19；其余只覆盖布局）；`Textarea` 是**全仓唯一多行输入入口**（同一套表面契约，**高度与 `resize` 归调用方**，控件不给档位）；输入位表面（底色 / 描边 / 圆角 / 文字色 / 字号）只在 `ui.css` 的 `.mm-input, .mm-input-surface` 与 `.mm-textarea` 三处，下拉触发器与复合数字框外壳挂 `mm-input-surface` |
| 界面文案 | `src/types/messages.ts` | 唯一入口：`MSG.corrupt`（文件坏）/ `MSG.badPayload`（宿主返回认不出）/ `MSG.stale`（状态过期）+ 分域的官方逐字句；`fail` / `failWithDetail` 里**不许再写中文**，现场（字段路径 / 下标）一律进 `detail`。存量：`font`/`style` 约 99 处（`TD-09-6`）、`core/ps` 29 处（`TD-04-1`） |
| 分组头 | `src/components/GroupHead/index.tsx` | 整行「箭头 + 名称 + 计数（可选）+ 行尾插槽（可选）」；内层 button 管开合 / 右键 / 拖拽，`data-*` 挂在它上面（拖拽落点靠它选节点）；`titleSlot` 为就地改名态（不渲染 button）。**与 `IconPanel`（触发器+面板）、已删的 `Collapse`（标题+内容）不同层**：这里没有面板、没有内容区 |
| 段选样式 | `src/components/Segment/segment.css` | 整条定宽 `--mm-segment-w`(100，两块各 50)、圆角 `--mm-radius-lg`(6)；未选中的底取输入位档（比所在表面深一档），选中项铺 accent 实底 + 反白 |
| 段选 | `src/components/Segment/index.tsx` | 2–4 档并排互斥按钮组；高 `--mm-control-h`、圆角 `--mm-radius-md`、选中 `--mm-color-accent`；判据：**≤4 档且要并排看全 → 段选**，选项多 / 有列表语义 → `SelectBox`，逐项长文本 → `RadioButton` |
| 浮层挂载 | `src/components/Portal/index.tsx` | 唯一 `document.body` 挂载点；只管挂，开关/定位不在这里 |
| 下拉选择 | `src/components/SelectBox/index.tsx` | 箭头固定 `<Chevron>`（无 `arrowIcon` / `arrowSize` 参数）；面板宽度 = 触发器宽（inline 写死，**无变体、无 `--floating-width` 中间变量**），定位走 `useFloatingPosition` 且 `flip: false`（只左对齐向下，放不下只夹取） |
| 下拉样式 | `src/components/SelectBox/select-box.css` | 对齐原版 SelectBox |
| 箭头 | `src/components/Chevron/index.tsx` | **全仓唯一箭头件**：`open` **必传** —— `open={开合状态}` 收起朝右（`-90deg`）/ 展开朝下（组头 / 抽屉标题 / 缩放行 / 标签展开）；`open="static"` 恒朝下、不表达开合（字体面板的 `NumberField` 预设箭头与 `DistributionHelp`「高级用法」、`SelectBox` 下拉 ∨）；图标统一 `iconzhankaizhedie`；**没有 `arrowIcon` / `size` 参数**，要第二个箭头形状就是违规 |
| 箭头样式 | `src/components/Chevron/chevron.css` | `--closed` 的 `rotate(-90deg)` 全仓只此一处（只有 `open={false}` 会命中，`"static"` 恒朝下）；`transition` 走 `--mm-dur-fast` |
| 图片取色弹层 | `src/features/style/components/ImgColorDialog.tsx` | 色圈 / 渐变条，左键应用右键删 |
| 图片取色样式 | `src/features/style/components/img-color-dialog.css` | 对齐原版 imgColor |
| PS 事件订阅 | `src/core/cep/ps-events.ts` | 注册 + JSON 回调 + setd 判据；`subscribeHostEvent` 返回 `Result<取消函数>`，非 CEP / 注册被拒都折成 `PS_UNREADY`，**不抛异常**；一次性等待用 `startHostEventWait`（订阅 / 超时 / 退订都在这里），调用方只递判据 |
| 图片解码 | `src/core/image/index.ts` | FileReader / canvas / Image 默认注入 |
| 文件对话框 | `src/core/dialog/index.ts` | CEP fs API，取消返回 null |
| 仓库容器 | `src/repo/ku-archive.ts` | .kux 导出导入 + id 重发 + 回收；写内层库文件走 `replaceFileText`（原文，不重新序列化） |
| 容器编解码 | `src/domain/ku-io.ts` | 纯函数（app 移植） |
| 状态通道 | `src/core/feedback/channel.ts` | 单通道订阅 + 通知 + 挂载门；`toast` / `loading` 共用，禁止再各写一份 `Set + emit` |
| Toast | `src/components/Toast/index.tsx` | 禁止 alert |
| Loading | `src/components/Loading/index.tsx` | 全屏加载唯一入口，文案栈 |
| Spin 转圈 | `src/components/Spin/index.tsx` | 裸圈 / 带文案 / 局部遮罩三模式（照原版 NewSpin） |
| Spin 样式 | `src/components/Spin/spin.css` | 18px / 0.8s，token 化；转圈那一道取 accent（规则 12「进行中」一档） |
| 路由 | `src/app/router.tsx` | 页面懒加载 |
| 外壳 | `src/app/layout.tsx` | 全局布局 |
| Provider | `src/app/providers.tsx` | UI 横切挂载 |
| 导航配置 | `src/app/nav-config.ts` | 导航唯一来源 |
| 导航栏 | `src/app/nav-bar.tsx` | 侧边导航 |
| 图层监听 | `src/app/layer-watcher.tsx` | 唯一的**常驻**图层订阅者，页面只读 store；命令内的一次性事件等待（吸色等）不在此列，见 `CONVENTIONS` §3.1.5 第 5 条 |
| 常用页事件 | `src/app/common-use-watcher.tsx` | 常用页 5 个语义（拖入 / 粘贴 / 剪贴蒙版 / 填色 / 参考线）的唯一订阅者；按 store 的 5 个设置开关 + `guideOn` 订阅 / 退订，失败只 `log.warn` 不弹 toast；与 `layer-watcher` 分开（那个永不写盘） |
| 全局快捷键 | `src/hooks/useShortcut.ts` | 常驻字母键；负责「打字中 / 带修饰键」两条排除；与 `useDismiss` 分工写在文件头 |
| 禁右键菜单 | `src/hooks/useNoContextMenu.ts` | 全项目唯一 `contextmenu` 监听；只 `preventDefault`、不 `stopPropagation`（自己的 `ContextMenu` 仍能打开）；只在 `app/layout` 挂一次 |
| 浮层关闭 | `src/hooks/useDismiss.ts` | 全项目唯一 mousedown/keydown 监听 |
| 浮层定位 | `src/hooks/useFloatingPosition.ts` | 唯一锚点矩形入口（`update` 返回锚点矩形，对齐宽度也用它） |
| 焦点陷阱 | `src/hooks/useFocusTrap.ts` | 仅模态弹窗：Tab 循环 + 关闭还原焦点 |
| 受控草稿 | `src/hooks/useDraft.ts` | 输入框本地值：外部值变了才回填，渲染期收敛 |
| 定位算法 | `src/hooks/floating-position.ts` | 纯函数，翻转与夹取 |
| 长按拖拽 | `src/hooks/useLongPressDrag.ts` | 300ms 长按 + 克隆占位 + 落点判定 |
| 落点计算 | `src/domain/reorder.ts` | 纯函数，四分支 splice 收敛 |
| 列表分页 | `src/hooks/usePagedList.ts` | 每页 30 + 触底追加，筛选变化回第一屏 |
| 触底加载 | `src/hooks/useInfiniteScroll.ts` | 全项目唯一 `IntersectionObserver` |
| 右键菜单 | `src/components/ContextMenu/index.tsx` | 定位走 hook，菜单项由调用方给 |
| 输入弹窗 | `src/components/InputDialog/index.tsx` | 原版 `$inputBox`：位置 50vw-90/top30%、空值拦截、Enter 提交 |
| 输入弹窗样式 | `src/components/InputDialog/input-dialog.css` | 对齐 `.input-box` / `.input-box-main` |
| 页面底栏样式 | `src/components/BottomBar/bottom-bar.css` | 26 高、通栏（抵掉页边）、深底；按钮 30 宽、hover 纯底色无描边；底栏里**所有** svg 由外壳压到 14 |
| 页面底栏 | `src/components/BottomBar/index.tsx` | 26 高深底 + 30 宽图标按钮（hover 纯底色无描边）+ 1×13 竖线；页面不再自绘底栏 |
| 图标按钮 | `src/components/IconButton/index.tsx` | 26×26 + 选中态 + 角标；修饰键不在这里判 |
| 图标按钮样式 | `src/components/IconButton/icon-button.css` | 对齐原版 `.base-icon` |
| 图标 + 展开面板 | `src/components/IconPanel/index.tsx` | 关闭只认触发器、互斥是 `exclusive` 开关、点外/Esc 不关；受控 `openId`/`onOpenChange` 用于「跨行只开一个」 |
| 图标 + 展开面板样式 | `src/components/IconPanel/icon-panel.css` | `__box` 只给通栏（`width:100%`）+ `isolation: isolate`；**底色由 `__box::before` 左右铺满**（`left/right: calc(-1 * bleed)`、`z-index:-1`），内容盒与位置不动。左右通栏靠承载行声明的 `--mm-icon-panel-bleed`（页面根壳声明为 `--mm-page-pad-x`）；`__box` 上下 padding 固定 `--mm-space-2`(8)、左右 0（组件给，页面不许覆写）；不许用负 margin（会连内容一起拉宽） |
| 勾选框 | `src/components/CheckBox/index.tsx` | 12×12 / 圆角 3 / 1px `--mm-color-border-control` / 右空 6；原生 input |
| 单选框 | `src/components/RadioButton/index.tsx` | 12×12 / `50%` 正圆 / 同 `name` 才互斥 |
| 输入框 | `src/components/TextField/index.tsx` | 左图标 / 右插槽 + Enter 提交；内部渲染 `ui.Input`；**不定宽**——外壳吃满容器（`flex: 1 1 auto`），要定宽给那个页面的局部 css（`STYLE.md` §6.1），组件不出宽度档位 |
| 确认弹窗 | `src/components/Confirm/index.tsx` | 删除类操作必须二次确认 |
| 确认入口 | `src/components/Confirm/useConfirm.tsx` | `await confirm()`，页面唯一用法 |
| 内联编辑 | `src/components/InlineEdit/index.tsx` | Enter 确认 / Esc 取消 / 失焦确认 |
| 命令执行 | `src/hooks/useRunCommand.ts` | 包 loading + 失败提示 + 原因留痕（code/detail 进日志，人话进 toast）；面板/页面不再各写一份 |
| 空态提示 | `src/components/StateHint/index.tsx` | 空态 / 失败态 / IO 重试唯一入口；前提类码（`PS_NO_DOC` / `PS_WRONG_LAYER`）灰字，不标红 |
| 区域遮罩 | `src/components/StateMask/index.tsx` | 内容照常渲染撑住高度，提示盖在上面（不换布局、不跳版）；文案与语气复用 `StateHint` |
| 导航样式 | `src/app/nav-bar.css` | 对齐原版 40×40 参数 |
| 组件样式 | `src/components/ui/ui.css` | 基础控件形状（Button / Input / Field）；`Button` 是按钮唯一入口（支持 `ref`，`variant` 三档闭合在类型里：`primary` / `numeric` / 不传）+ **组合层·控件表面**（`STYLE.md` §6.2）：`.mm-chip` / `.mm-swatch`（纯色块，只含形与色）/ `.mm-badge` / `.mm-notice` / `.mm-modal`，都只出 CSS 契约、不带行为 |
| 页面 | `src/features/home/HomePage.tsx` | feature 唯一结构 + 调试页（诊断 / 执行代码 / 日志） |
| 样式 | `src/features/home/HomePage.css` | 只用 Token |
| 样式页 | `src/features/style/StylePage.tsx` | 骨架与 JSX 分层，动作在 hook |
| 样式动作 | `src/features/style/useStyleActions.ts` | 页面动作与交互状态收口 |
| 脚手架 | `tools/new-feature.mjs` | 新 feature 生成 |
| PS 返回形状探针 | `tools/probe-ps.mjs` | `npm run probe:ps`：用 PS COM `DoJavaScript` 批量拿所有 jsx 的真实返回，**AI 自己测，不靠人点面板**。加载 + 注入 + 探测必须在同一次调用（jsxbin 函数活不过一次调用）；只收集不判定（分类只在 `raw.ts`）；会改文档，用测试文档。用法见 `PS-CHANNEL-NOTES` §十六 |
| 范本自检 | `tools/check-templates.mjs` | 双向校验清单 |

### 4.2 标记规则

- 范本文件**第一行**必须是 `【范本】` 注释，写清楚「新增同类代码必须照此结构」
- 非范本文件不得自称范本
- 新增范本必须先登记到 4.1 表格

### 4.3 范本劣化处理

发现更好的写法时：

1. **先改范本文件**，让它成为唯一正确写法
2. 再按范本修改已有代码
3. 不允许「新代码用新写法、老代码保持旧写法」并存
4. 若改动影响多个文件，登记到 `docs/CHANGELOG.md`

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

### 7.0 体检的首要目标：让后来者抄不错

> **判据真源：`docs/adr/ADR-0001-半收口比不做更糟：做完必须自列检查项并全部过关.md`**
> （判据、五类半收口形态、交付前 6 项检查都在那里，本文件不复述。）
>
> 本节只留操作顺序：**先清半收口，再看 §7.2 七项**；七项里第 2 项（重复实现）与第 6 项（文档漂移）是主战场。

### 7.1 触发条件（满足任一即必须体检）

| # | 触发 | 说明 |
|---|---|---|
| 1 | **完成一个功能**（页面能跑通） | 最常见，交付即体检 |
| 2 | **新增 3 个页面** | 结构问题会在这个量级暴露 |
| 3 | **改动 `core/` 或 `domain/`** | 底层一动，所有范本都可能失效 |
| 4 | **连续 2 周没有体检** | 时间兜底 |
| 5 | **出现「两套写法」迹象** | 发现重复实现，立即收敛 |

### 7.1.1 体检范围（先定范围，再跑清单）

**默认范围 = 本次改动碰过的文件 + 它们的直接上下游**（谁 import 它、它 import 谁）。
不是全仓。

| 情形 | 范围 |
|---|---|
| 改业务代码（页面 / 组件 / 命令 / store） | 本次改动的文件 + 直接调用方 |
| 改 `core/` 出口、`types/` 契约、公共组件 | 上述 + **该出口的全部 fan-in**（用 `mv-sync-refs.mjs refs` 列出） |
| 用户明确说「全身体检」 | 才允许 `find-dead src`、对照目录树、全仓 grep |

**禁止**：用户没说范围时自己扩到全仓；把与本轮改动无关的既有问题写进本次报告（发现就单独登记一笔债，别混进来充数）。

### 7.2 体检清单（七项，逐条给结论；**按上面定的范围裁剪**）

| # | 检查项 | 手段 | 通过标准 |
|---|---|---|---|
| 1 | 唯一入口 | **只在本轮改动文件里**搜 `fetch(`、`evalScript`、`localStorage`、`split('\|')` | 只出现在对应 core 模块 |
| 2 | 重复实现 | 人工看同名能力 | 一个能力只有一处实现 |
| 3 | 范本一致性 | `npm run check:templates` | 双向一致 |
| 4 | 导航路由一致性 | `npm run check:nav` | 双向一致 |
| 5 | 死代码 | 只查**本轮改动后变成零引用**的符号（半径外对账），不跑全仓 `find-dead` | 无本轮新增孤儿 |
| 6 | 文档漂移 | 只核本轮**新增 / 移动 / 删除 / 改名**的模块在 §3 目录树与相关表里是否同步 | 本轮涉及的部分一致 |
| 7 | 公共能力没写进页面 | 只搜**本轮改动波及的** `features/` 文件（规则见 `CONVENTIONS.md` §4.8） | 输出为空 |

附加项（按范围看）：

- 横切使用矩阵：只核本轮**用到**的横切是否走唯一入口
- 范本状态：只核本轮**动过**的 §4.1 行是否还准确
- 视觉一致性：只核本轮**新增 / 修改**的组件是否绕过 Token

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

每次体检产出一份报告，放在 `docs/review/REVIEW-YYYY-MM-DD[-N].md`，开头必须写**本轮范围**（改了哪些文件），包含：

1. 总体结论（乱不乱）
2. 横切使用矩阵（含状态）
3. 风险清单（P0/P1/P2，带文件行号）
4. 修复记录
5. 下一步建议

报告写完必须跑一次 `npm run check`，并在 `docs/CHANGELOG.md` 里登记。

### 7.5 体检后的动作

| 发现 | 动作 |
|---|---|
| **半收口**（抽了一半 / 改了一半 / 写了一半 / 只改主要几条就宣称收口） | **当场修完，不许拆成两次、不许排期** —— 它比不做更糟（§7.0） |
| P0（会导致抄错） | 立即修，修完才允许继续业务 |
| P1（容易漏改） | 当次修或排进下一步，不允许无限期挂起 |
| P2（结构小问题） | 可延后，但必须登记在报告里 |
| 范本过时 | 先改范本，再改调用方 |

---

## 八、变更记录

已迁至 `docs/CHANGELOG.md`。新增条目追加到该文件表格末尾，格式不变（日期 / 变更 / 影响范围）。
