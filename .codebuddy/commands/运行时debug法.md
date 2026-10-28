# 运行时 debug 法（PS 面板链路调试地图）

> **适用场景**：`npm run check` 已绿（类型 / lint / 边界 / 断言 / 单测全过），但**跑起来有 bug** —— 问题出在"接线与运行时"：命令链、事件上下行、数据落盘、依赖方向、渲染外壳。
> **核心思路**：debug 的本质是**先画出链路全景，再标清每一跳的契约（数据结构）与边界**；链路清楚了，断点自然一眼可定位。本文件的地图来自**真实代码与 ADR 取证**（标注 `文件` 或 ADR 编号）。
> **通用思考底座**：步进式、防绕圈、无日志不推演见 `排查5步法.md`（管"怎么想"）；本文件管"这个项目**链路长什么样、契约是什么**"。
> **不在本文件范围**：原版（官方面板）自身的 bug —— 那是官方资产，见 `线上 PS 应用缺陷（非本仓文档）`；我们要做的是"我方与原版的差异"。
> **最高优先铁律**：改 bug **第一步先拿证据**（日志 / 断言 / 页面规格 / 原版源码），禁止没证据就翻代码猜根因改逻辑。**查不到的真机行为标 `UNVERIFIED`，不许要求用户去 PS 里点。**

---

## 〇、第一步：拿证据（所有 bug 都先这步）

本项目的取证手段（按代价从低到高）：

| 手段 | 命令 / 位置 | 拿到什么 |
| --- | --- | --- |
| **应用级错误边界** | `src/components/ErrorBoundary.tsx` · `src/components/ToastHost.tsx` · `src/components/ConfirmHost.tsx` | 渲染是否被边界捕获（**没白屏** = 边界在起作用，不是没 bug） |
| **日志** | `src/core/logger.ts`（统一入口，禁散写 `console.log`） | 运行时轨迹；调试埋点默认安静、可开关 |
| **白屏体检** | 无（`render:check` 已不存在） | 只能 `npm test` 的组件用例；真实渲染进 PS 看，算 `UNVERIFIED` |
| **单测 / 组件测** | `npm test`（vitest，`测试工具（maomao 为 React；AGENTS 禁止 @testing-library，UI 行为靠真机验证，逻辑走 src/domain 单测）`） | 逻辑 / 事件 / DOM 输出；**不启浏览器、不点 PS、不 fetch** |
| **机器守卫** | `npm run lint` · `npm run lint:css` · `npm run typecheck` | 空 catch / 断言禁令 / 页面层越界 / 转型。样式与公共件分发**无守卫** |
| **类型闸** | `npm run typecheck`（`src/**` 与 `tests/**` 两套 tsconfig） | 类型漂移、漏改引用 |
| **原版结构** | `（本仓不维护原版页面规格；结构对照以线上 PS 应用为准，标 UNVERIFIED）`（结构树 + 全量 class + CSS 实测值） | 我方该长什么样 |
| **原版事件** | `线上 PS 应用源码（非本仓文档）` 的 render（看 `on:`） | 某个 class 有没有绑事件 |
| **原版一手源码** | `线上 PS 应用源码（非本仓文档；jsx 签名以真机验证为准，标 UNVERIFIED）`（派发表行号随版本漂移，以真机核对为准） | 官方怎么调 / 什么参数 / 什么返回结构 |
| **引用面** | `grep -rn "<名>" src/ tests/ docs/ scripts/` + `npm run typecheck` | 谁引用它 + 字符串残留引用（改名/搬运后必跑） |
| **真机行为** | 只能靠 PS：PS 是否回某事件、jsx 返回值取值 | **查不到就标 `UNVERIFIED` 并写进该页清单**，不猜、不外推 |

> ⚠️ **禁 e2e / 浏览器自动化 / 截图回归**：不装 Playwright / Cypress / Puppeteer，不写自动点面板 / 跑浏览器流程 / 像素 diff 的脚本。
> ⚠️ **本仓没有集中的 debug 开关** —— 所以**临时 `console.log` 一律不留**（`系统治理5步法` Step 7 会扫）。要留可观测，就先在 `src/core/logger.ts` 落一个**统一入口**。

---

## 一、链路地图 ①：启动链（产物 → 宿主 → 页面）

```
[1] 入口
    src/main.ts  → 挂载 App.tsx（React + store）
    【断】模块级单例：**不要**在渲染里再 new 一份 store / transport（会建第二份状态）
        ↓
[2] 路由与外壳
    src/router/ → src/App.tsx → src/layouts/ → src/features/<页>
    【断】🔴 产物是 IIFE 单包 + defer、**放弃路由懒加载**（`file://` 下 origin 为 null，chunk 按需加载不可靠）
        ⇒ 页面级代码分割 = 运行时白屏风险，不是性能优化
        ↓
[3] PS 出口装配
    src/core/cep/bridge.ts（**唯一 evalScript 出口**）· src/core/ps/（只读初始化）
    src/core/ps/env.ts（PS_ENV：注入给 jsx 的环境契约，**字段名不能改**）
    【断】🔴 页面直连 `evalScript` / `__adobe_cep__` ⇒ `npm run lint` 红
        `src/core/ps/env.ts` 的字段被改 ⇒ jsx 拿到错契约（不报错，静默走偏）
        ↓
[4] 产物落位
    vite build → 直接输出到 CEP 扩展目录（build 即部署）；`public/lib/all.decrypted.js` 来自 `public/`
    【断】产物里缺 `lib/all.decrypted.js` ⇒ 面板起来但所有 PS 能力失联
```

**真相源契约（红线，整条链路守此）**：**`src/core/**` 是唯一 PS 出口**（ADR）；页面只经 `useCommand` 拿数据；命令入口是 `src/commands/registry.ts` 的 `execute`（ADR）；**stores 只读投影，不写状态**。

---

## 二、链路地图 ②：命令下行链（页面 → PS，最高频）

```
[1] 页面发起
    src/features/** → src/components/command/useCommand.ts → 命令 id + payload
    【断】🔴 页面 import `@/core/**`（连 `import type` 也不行）⇒ `npm run lint` 红
        页面 import `@/commands/**` 的**值** ⇒ 同上（只许 `import type` 拿 payload 类型）
        ↓
[2] 命令注册与执行
    src/commands/registry.ts：defineCommand 注册；`execute` 是**唯一执行入口**
    payload 形状在 src/commands/payloads.ts（id 必须在表内）
    【断】🔴 有第二个执行入口（页面自己 new 了一个 service）⇒ 两条路 = 第二份真相
        payload 与表里不一致 ⇒ 漏登记在 typecheck 期暴露不了，靠 `npm run lint`
        ↓
[3] PS 能力调用
    src/core/ps/<域>.ts（按域分文件）→ src/core/cep/bridge.ts（队列 + 超时 + `ERR:` 协议）
    【断】🔴 业务层自己再开一条裸 `setTimeout` / `Date.now()` 计时 ⇒ 超时不可控
        异常被包成 `ERR:<message>` 后**原样透传**；改写成"操作失败" ⇒ 根因消失
        ↓
[4] 结果回传
    结果统一为判别联合（`Result<T>`，`src/types/result.ts`）→ store 只读投影 → 视图刷新
    【断】🔴 结果被 catch 后吞掉（空 catch）⇒ **静默失败 = 债**（登记进 `daily/架构日志/债务.md`）
```

**debug 落点口诀**：**点了没反应** → 查 [1] 页面是否绕过了命令层 / [2] 命令 id 是否注册 / [3] bridge 是否超时；**失败无提示** → 查 [4] 是否被吞；**数据没落盘** → 查数据链（见下）。

---

## 三、链路地图 ③：事件上行链（PS → 页面）

```
[1] 宿主事件到达
    src/core/cep/：EVENT_IDS（语义名 → stringID；这两个 id 已在表里，不能再以新名字加一遍）
    【断】🔴 直接拿 stringID 当语义名用 ⇒ 与原版对不上，且绕过 EVENT_IDS 这张表
        ↓
[2] 转命令
    事件 → 命令层（ADR：下行只走 commands→core/ps→core/cep，上行只走 core/cep 事件出口）
    【断】🔴 页面直接 subscribe 宿主事件 ⇒ 绕过命令层，"事件来了没有对应命令"没人管
        ↓
[3] 状态投影
    命令结果 → src/store/（**只读投影**）→ 视图
    【断】页面直接 mutate store ⇒ 状态写成两份
```

**"拖入 / 粘贴 / 剪贴蒙色 / 智能填色"这类 PS 事件**：契约说"由适配层转命令、页面不挂监听"；**页面不接事件**不是缺陷，是设计。

---

## 四、链路地图 ④：数据链（读 / 写 / 落盘）

```
[1] 读
    src/repo/<域>-repo.ts（每文件一个 Repo<T>：串行队列 + 原子写 + .bak + onChange 订阅）
    → 语义映射放数据层（ADR）
    【断】🔴 读必须返回 `Result` 的 error 分支让坏可见（ADR）
        读失败返回 [] / {} 与"真的没有"混为一谈 ⇒ 用户以为没数据（典型：sys-font 读不到返回 []）
        ↓
[2] 写
    写不可降级：必须抛，必须备份到 .bak（ADR · ADR）
    【断】🔴 写失败被 catch 后兜默认值 ⇒ 数据静默丢（丢数据 = P0）
        字段类型不统一（星级写数字还是字符串）⇒ 跨版本读不回
        ↓
[3] 落盘形态
    数据文件四种形态全部收口在 src/repo/（ADR）；库文件格式 .kux/.kuc/.kug/.kuf/.kus（见 src/repo/（库文件格式契约收口在 repo 层，详见 docs/CONVENTIONS.md））
    【断】字段散在多个文件 ⇒ 真相分裂；写前没备份 ⇒ 一次手滑就不可恢复
```

**debug 落点口诀**：**"没有数据"** → 先分清"读失败"还是"真的没有"（看返回的是 `Result` 的 error 分支还是空值）；**"改了没生效"** → 查 [2] 写是否抛错 / [3] 是否写了别的键名（字体两套键名并存是既定裁定，ADR，靠 `normalizeFont()` 转换）。

---

## 五、链路地图 ⑤：云同步链与选区链

```
云同步：（本仓暂无独立云同步模块；如后续引入，出口统一走 src/core/cep/bridge.ts，落点在 src/core/ 下）
  事件驱动 + 启动补偿，**去掉定时器**（ADR）：触发点只 markDirty 入队，请求由队列统一发
  【断】🔴 有人加了 setInterval 轮询 ⇒ 与 ADR 冲突
选区：（本仓无独立 src/selection/；选区操作经 src/core/ps 与 PS 实际图层对齐）
  【断】选区快照与 PS 实际状态不同步 ⇒ 后续命令作用在旧对象上
```

---

## 六、层间方向与越权断点（表格版）

| 层 | 唯一职责 | 严禁 | 机器守卫 |
| --- | --- | --- | --- |
| `src/features/**` | 视图 | import `@/core/**`；值导入 `@/commands/**`；直调宿主 | `npm run lint` |
| `src/components/**` | 跨页 UI 基础件（`G` 前缀） | 塞业务规则；页面私有结构混进公共件 | 无守卫，靠 `mv-sync-refs.mjs refs` |
| `src/store/**` | **只读投影** + 少量 UI 状态 | 写状态；算业务规则 | 人工 + `npm run lint` |
| `src/hooks/**` | 组合式 | 造第二套订阅总线 | 人工 |
| `src/commands/**` | 命令注册与执行（`execute` 唯一入口） | 直接调宿主；页面绕过它 | `npm run lint` |
| `src/domain/**` | 纯函数与类型（零 IO、零 Vue） | `window` / `document` / `Date.now()` / `Math.random()` / `localStorage` | `npm run typecheck` + `npm run lint` |
| `src/core/**` | **唯一 PS 出口** | 解释业务语义 | `npm run lint` |

**断点**：把"能算出来的值"塞进 store；`src/features` 里建新的全局单例；`src/core` 里混进业务判断。

---

## 七、对账武器（确认断在链路哪一跳）

| 武器 | 命令 | 断在哪 |
| --- | --- | --- |
| 白屏 | 无守卫 —— `npm test` 组件用例 + 启动链 [1]~[4] | 启动链断点 |
| 逻辑 / 事件 / DOM | `npm test`（vitest） | 命令链 / 事件链 |
| 层间方向 | `npm run lint` | 页面层越权 |
| 公共件分发 | 无守卫（`dispatch:check` 已删） | 第二份实现 |
| 样式基线 | 无守卫（`style:guard` 已删） | 裸色值 / 裸字号靠 `src/styles/tokens.css` |
| 断言禁令 | `npm run lint` | 断言缺失或过期 |
| 引用面 | `grep -rn "<名>" src/ tests/ docs/ scripts/` + `npm run typecheck` | 改名 / 搬运后的引用漏改 |
| 原版对照 | `（本仓不维护原版页面规格；结构对照以线上 PS 应用为准，标 UNVERIFIED）` · `线上 PS 应用源码（非本仓文档）` 的 render · `线上 PS 应用源码（非本仓文档）`（jsx 签名以真机验证为准，标 UNVERIFIED） | 结构 / 事件 / jsx 签名 |
| 判据 | `node scripts/adr.mjs search <关键词>` · `node scripts/adr.mjs refs --check` | 判据打架 / 断链 |

---

## 八、与通用排查5步法的衔接

- **State 1（现象对齐）**：走通用引擎，复述痛点（"没数据" ≠ "保存失败" ≠ "没生效"，先分清）。
- **State 2（提取证据）**：先按〇取证据；疑原版行为查 `线上 PS 应用源码（非本仓文档）` 与页面规格；疑事件绑定查 `线上 PS 应用源码（非本仓文档）` render 里的 `on:`。
- **State 3（物理断点）**：**对照第一~六节链路地图，指"第几跳、哪个契约没守"**。
- **State 4（靶向修复）**：守红线（`src/core` 唯一出口 / 命令唯一入口 / 写不可降级 / 错误原样透传 / domain 纯函数），最小改动。
- **State 5（闭环验证）**：呼应 State 1 —— 跑 `npm run check`（六道关：typecheck→lint→lint:css→check:templates→check:nav→test）；真机相关写进该页清单并标 `UNVERIFIED`。
