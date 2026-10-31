# 猫猫设计工具 · 工程约定（强制）

> 本文件是唯一标准。写代码前先读，评审时逐条对照。
> 与本文件冲突的写法一律视为错误，不允许「先这样，后面再改」。

---

## 0. 修改规则

- 新增约定：先改本文件，再写代码
- 约定冲突：以本文件为准，代码里不允许「局部例外」
- 唯一允许写原始色值和 px 的文件：`src/styles/tokens.css`
- 配套文件：`docs/GOVERNANCE.md`（边界升级条件、范本制度、底层优先原则、定期体检）
- 界面规范（用哪个件 + 长什么样）：`docs/STYLE.md`（原 §6 / §7 / §14 整块迁出，**章节号与规则号不变**；改 css / token / 组件表面 / 图标档位 / 间距前读它）
- PS 通道与数据契约的事实备忘：`docs/PS-CHANNEL-NOTES.md`（调 jsx / 改数据层前先看）
- 体检规则：完成功能、改动底层、两周未体检时必须体检（GOVERNANCE 第七节），AI 要主动询问，不能等用户提
- 范本清单与标记规则见 `GOVERNANCE.md` 第四节；带 `【范本】` 注释的文件是唯一正确写法

---

## 0.5 设计原则（统摄所有具体约定）

### 原则一：让正确写法成为最省事的写法

新增任何能力时，先自问三句：

1. 正确写法是不是**比错误写法更短**（字符数 / 行数）？
2. 正确写法是不是**不需要查文档**（IDE 补全就能写完）？
3. 错误写法是不是**立刻失败**（编译或运行时报错）？

三项都是「是」，这个入口才算合格。

**如果某个能力必须靠 lint 禁止才没人用错，说明入口设计不合格——要改入口，不是加规则。**

反例（不要这样设计）：

| 反例 | 为什么没人用 |
|---|---|
| `useToast()` 要传 5 个参数才生效 | 别人宁可直接 `alert` |
| 请求要先 `new Client()` 再配置再发 | 别人宁可直接 `fetch` |
| 组件库要手动引 3 个 CSS 文件 | 别人宁愿自己写样式 |

### 原则二：唯一入口必须「结构上不可能走错」

一个入口同时满足以下 4 条，才算唯一入口：

| # | 标准 | 验证方式 |
|---|---|---|
| 1 | **类型闭合**：参数类型覆盖所有合法用法 | 故意写错，必须编译失败 |
| 2 | **没有第二条路**：全项目只有一个导出点 | 全局搜索同类实现，结果只有一处 |
| 3 | **默认即正确**：不传参数时行为正确 | 零配置直接调用能跑通 |
| 4 | **失败可见**：用错立刻报错，不静默降级 | 传错值必须抛错或返回 `fail` |

四条缺一条，就不叫唯一入口，只是「推荐入口」。

### 原则三：出现两套写法，必须收敛成一套

发现两套实现的处理顺序（不可跳步）：

```
1. 选一套作为唯一实现（选更省事的那套）
2. 删除另一套，不留注释、不留兼容层、不留 deprecated
3. 旧调用方一次性迁移
4. 更新范本
5. 在 `docs/CHANGELOG.md` 登记
```

**不允许**：

- 「新代码用新的，老代码保持旧的」
- 保留 deprecated 包装层「过渡期」
- 两套并存，等以后统一

「以后」不会到来，只会变成屎山。

### 判定表（每次新增能力必须填）

> 要把它做成「公共模块」之前，先答 `docs/adr/ADR-0002` 的四问（少知道什么 / 旧写法能不能删净 / 需要几个概念 / 是不是壳）。
> 任一条答不出 ⇒ **不做**；做一半留在仓里 = 半收口，比不做糟十倍（`ADR-0001`）。

| 检查项 | 通过标准 |
|---|---|
| 唯一入口 | 全项目只有一个 import 来源 |
| 更省事 | 正确写法的字符数 ≤ 错误写法 |
| 类型闭合 | 写错参数编译失败 |
| 默认正确 | 零配置可用 |
| 失败可见 | 用错立即报错 |
| 无第二套 | 全局搜索不到同类实现 |

### 本项目的入口对照

| 能力 | 唯一入口 | 为什么更省事 | 用错会怎样 |
|---|---|---|---|
| UI 控件 | `components/ui` | `<Button>` 比手写 className 短 | 样式不一致，肉眼可见 |
| 请求 | `request('key')` | 不写泛型、不拼 URL | key 写错编译失败 |
| PS 动作 | `core/ps/action.ts` | 动作页两条 jsx（一调度一直调），参数形状照抄可运行的 Vue 版 | 直接 `callJsx` 要自己转结果 |
| PS 能力 | `core/ps/*` | 不记 jsx 函数名、自动处理 Result | 直接 `callJsx` 要自己转结果 |
| 部署 | `npm run deploy` | 一条命令 | 手工复制漏文件（已发生过） |
| 日志 | `log.*` | 自动脱敏 | 自己拼串会泄漏 token |

### 收敛检查（评审时手动跑，不设 lint 闸）

```bash
# 是否出现第二套请求写法
rg "fetch\(" src --glob '!src/core/http/**'

# 是否出现第二套 PS 调用
rg "evalScript|callJsx" src --glob '!src/core/**'

# 是否出现第二套日志
rg "console\." src --glob '!src/core/logger/**'

# 是否出现硬编码样式
rg "#[0-9a-fA-F]{6}|\d+px" src --glob '!src/styles/tokens.css'
```

这些是**检查手段**，不是禁止规则。lint 不拦，但评审必须过——因为拦不住的错误，应该靠入口设计让它不可能发生。

**只跑与本轮改动相关的行**：改了请求就查第一条，没碰日志就不必跑第四条。全仓四行只在改动 `core` 公共出口或 `types` 契约时跑一遍。

## 1. 命名总则

| 对象 | 规则 | 示例 |
|---|---|---|
| 品牌 | 一律 `maomao` / `Maomao`，不再出现 fengzi、psz、SheJiZhuLi | `com.maomao.design` |
| CEP Bundle | `com.maomao.<域>` | `com.maomao.design` |
| jsx 函数 | `mm_<域>_<动作>` | `mm_layer_getState` |
| CEP 事件 | `com.maomao.event.<域>` | `com.maomao.event.layer` |
| CSS 类 | `mm-<块>__<元素>--<状态>` | `mm-swatch__item--active` |
| CSS 工具类 | `mm-u-<名>`（布局原语；`u-` 前缀让「工具」与「组件」一眼可分） | `mm-u-row`、`mm-u-col`、`mm-u-grow` |
| CSS 变量 | `--mm-<类别>-<语义>` | `--mm-color-bg-panel` |
| localStorage | `maomao.<域>.<键>` | `maomao.user.token` |
| 数据目录 | `%APPDATA%\Maomao` | 不读旧目录 |
| 组件文件 | PascalCase | `SwatchGrid.tsx` |
| 非组件文件 | camelCase | `useSwatches.ts` |
| 类型 | PascalCase，无 `I` 前缀 | `LayerKind`、`StyleWarehouseIndex` |
| 常量 | UPPER_SNAKE | `MAX_RECENT` |

### 1.1 三个前缀只按「入参类型 + 出参形状」分，不看感觉

写「把一个不可信的值变成可信的值」时只有这三种，别自创第四种：

| 前缀 | 入参 | 出参 | 含义 | 例子 |
|---|---|---|---|---|
| `parse*` | **`string`**（原文） | `Result<T>` | 文本 → 值（JSON / jsx raw / 库文件文本） | `parseJson`、`parseJsxRaw`、`parseKuContainer` |
| `decode*` | **`unknown`**（不可信） | `Result<T>` | 判据 + 收窄，**失败可见** | `decodeList`、`decodeFontList`、`decodeStyleIndex` |
| `decode*` | **`string`**（编码过的文本） | 解码后的值 | 纯 codec，不做判据 | `decodeBase64`、`decodeImage`、`decodeText` |
| `normalize*` | **已可信的值** | `T`（**不返回 `Result`**） | 纯投影 / 补默认，失败给默认值 | `normalizeTextColor`、`normalizeFontSetSettings`、`normalizeStyleIndex` |

判据一句话：**返回 `Result` 的，入参是 `string` 就叫 `parse`，入参是 `unknown` 就叫 `decode`；不返回 `Result` 的才叫 `normalize`。**

2026-10-28 修过一次：`normalizeTranslateItems` / `normalizeTextInfo` / `normalizeQuickFontFile` / `normalizeFontItem` / `normalizeFontList` 五个都返回 `Result` 却叫 `normalize`，`parseTranslateResponse` 入参是 `unknown` 却叫 `parse` —— 六处全部改名，否则下一个写解码的人从仓里能抄到三种写法。

### 1.2 `decodeList` 的两种策略怎么选（别按「哪个库更重要」判）

| 情况 | 策略 | 例 |
|---|---|---|
| **结构**坏：顶层不是数组 / 某一项不是对象 | `reject`（`decodeList` 内建，`filter` 也糊不过去） | 所有列表 |
| **项**坏 + 位置**不敏感**（少一项不影响其余） | `filter` + `dropped` 记账，页面显示「N 项无法识别，已跳过」 | `common-use` 的 14 个按钮、动作库的组与动作、字体标签/星级 |
| **项**坏 + 位置**敏感**（按下标逐项对应，跳一项就错位） | `reject` | `decodeTranslateItems`（译文按段回写，少一段就写错图层） |

判据一句话：**跳过这一项，剩下的还能不能各就各位？** 能 → `filter`；不能 → `reject`。

**「怕用户以为数据没了」不是选 `reject` 的理由**——`filter` 本来就会显示「N 项无法识别」，而 `reject` 的后果是「一项坏 → 整页不可用」。数据安全由**写路径读原始记录**保证（坏项原样留在文件里），不由 `reject` 保证。

---

## 2. 技术栈（版本锁定）

| 项 | 选择 | 约束 |
|---|---|---|
| 语言 | TypeScript 5.6+ | `strict: true`；`any` 只允许出现在 `core/cep` 桥接层 |
| 框架 | React 18 | 只用函数组件 + Hooks |
| 构建 | Vite 5 | `target: chrome103`（CEP 12），`base: './'` |
| 路由 | react-router-dom v6 | 必须 `HashRouter`（CEP 是 `file://`） |
| 状态 | Zustand | 按 feature 切片 |
| 请求 | 原生 `fetch` | 禁止 axios |
| 样式 | 原生 CSS + 变量 | 禁止 CSS-in-JS、禁止 UI 框架 |
| 测试 | Vitest（node 环境） | 只测纯逻辑；TSX / UI 不写测试 |

新增依赖需说明：体积、能否用原生替代、是否影响 CEP。单个 > 30 KB 需单独确认。

### 2.1 运行时 API 兼容（Chromium 103）

构建只降语法，不 polyfill 运行时 API。目标环境最低 Chrome 版本是 103，以下不可用：

| API | 最低 Chrome | 替代写法 |
|---|---|---|
| `:has()` CSS | 105 | 用 class 控制 |
| `Promise.withResolvers` | 119 | 手动 `new Promise` |
| `Array.prototype.group` / `Object.groupBy` | 117 | 手动 `reduce` |
| `Array.prototype.toSorted` / `toReversed` | 110 | `slice().sort()` |
| `findLast` / `findLastIndex` | 97 ✓ | 可用 |
| `structuredClone` | 98 ✓ | 可用 |
| `Array.prototype.at` | 92 ✓ | 可用 |
| `Object.hasOwn` | 93 ✓ | 可用 |

规则：引入任何新写法前，确认其最低 Chrome 版本 ≤ 103。

---

## 3. 目录与依赖边界

```
src/
├─ core/          技术横切：零业务、零 UI
│  ├─ cep/        PS 通道
│  ├─ http/       请求与 endpoint
│  ├─ auth/       token
│  ├─ storage/    本地文件（双根：Maomao / SheJiZhuLi）
│  ├─ paths/      路径拼接与资源 URL
│  ├─ prefs/      界面偏好（本地 JSON，非业务数据）
│  ├─ clipboard/  剪贴板（自动降级）
│  ├─ dialog/     文件对话框（CEP fs API）
│  ├─ feedback/   提示条 / 全屏加载的**状态 + 通道原语**（`channel.ts`：订阅 / 通知 / 挂载门；零 React，components 只渲染）
│  ├─ image/      图片解码（FileReader / canvas）
│  ├─ ps/         PS 原子能力（init/capability/capabilities/layer/style/font/text/common-use/rename/env/diag/raw）
│  ├─ env/        版本、设备、环境
│  ├─ serial/     按 key 串行（读改写队列）
│  └─ logger/     日志
├─ domain/        纯业务模型与归一化（零 IO、零 UI、可单测）
├─ repo/          数据访问：读文件 → Result，不做业务判断
├─ commands/      业务命令：组合原子能力 + 写库，无 UI
├─ store/         状态切片
├─ hooks/         可复用交互原语（点外关闭、浮层定位、焦点陷阱、受控草稿、拖拽、输入法回车、分页）
├─ components/    纯 UI
├─ features/      页面与交互
├─ assets/        静态资源（SVG sprite）
├─ styles/        tokens.css、global.css
├─ types/         全局类型
├─ dev/           仅开发用的假数据（`preview.ts`，`import.meta.env.DEV` 守卫，生产不加载）
├─ main.tsx       入口（挂 root）
├─ App.tsx        应用装配（Providers + Router + Layout，无业务）
└─ app/           router、layout、providers、layer-watcher、common-use-watcher
```

`src/` 之外：`tools/` 是本项目脚本（build-icons / check-* / deploy / new-feature / probe-ps）；`scripts/` 是通用辅助脚本集合（含 `mv-sync-refs.mjs`），不全是本项目在用，**以 `package.json` 实际命令为准**。

### 依赖方向（只允许向下；**静态方向只写这一份**）

> 本节只写 **import 方向**（编译期）。运行期链路见 §3.1.2，不要在别处再画一份方向图。

```
features → commands → store → repo → core
    ↓          ↓         ↓
components → hooks ──────→ core
任意层 → types
```

| 层 | 允许 import | 禁止 import |
|---|---|---|
| `core` | `types`、`core` 内部其他模块 | `commands`、`store`、`components`、`features`、`app` |
| `store` | `core`、`domain`、`repo`、`types` | `commands`、`features`、`components` |
| `components` | `hooks`、`core/logger`、`core/feedback`（状态与通道原语）、`types`、`components` 内部 | `commands`、`features`、`store`、`core/ps`、`core/storage`、`core/cep` |
| `domain` | `types`、`domain` 内部 | `core`、`repo`、`commands`、`store`、`components`、`features`、`app` |
| `repo` | `core/storage`、`core/logger`、`core/cep/node`、`core/cep/bridge`、`core/paths`、`domain`、`types` | `commands`、`store`、`features`、`components`、`app` |
| `hooks` | `core`、`domain`、`types` | `commands`、`store`、`features`、`components`、`app` |
| `commands` | `core`、`domain`、`repo`、`store`、`types` | `features`、`components`、`app` |
| `features` | 所有下层 | 其他 `features` |
| `app` | 全部 | - |

`repo` 允许用 core 的 IO/路径原语（`nodeRequire('fs'/'buffer')`、`getUserDataPath`），但**不许**绕过 `core/storage` 去写库文件；导入导出这种「整份归档」是唯一需要外部路径的场景。

跨 feature 复用的逻辑必须上移到 `core` 或 `components`，不允许 feature 互相 import。

### ESLint 锁死边界（`eslint.config.js` 扁平配置）

`no-restricted-imports` 逐层分组，**每层一条**，命中即 `error`。它禁止什么**不在本文件重复**——
逐条对应上表的「禁止 import」列；要核对直接读 `eslint.config.js` 或跑 `npm run lint`。
（同一份规则写两遍，改一处漏一处必漂。）

**未加机器规则的两层（已知缺口，别以为锁了）**：

- `src/features/**` 的「不许互相 import」：`**/features/**` 会连自己目录里的相对 import 一起命中，
  静态 pattern 表达不了「除了我自己」，故未加，靠评审时 grep。
- `src/app/**`：装配层允许全部，无需规则。

> **2026-10-28 修**：本节原先贴的是一段**不存在的** `.eslintrc.cjs`（本仓用扁平配置），且只写了
> 1 条 `**/features/*`；实际是 6 条分层规则，**`hooks` 层漏了**。漏的直接后果：
> `useRunCommand` 长期反向 import `components/Toast` 与 `components/Loading`，
> 而这条越界又逼出了「13 处手写 `toast.error`」（不想转圈的调用方只能绕过 hook）。
> 现已补到 7 条，并把提示条 / 遮罩的状态从 `components/*` 下沉到 `core/feedback/*`。

---

### 3.1 数据流全景（2026-10-28 快照）

> 本节只写**现状**（链路图 + 关键边），不放灯、不放进度。
> **分工**：谁能 import 谁 = §3 的「依赖方向」表（唯一一份）；本节只写**运行期**谁经过谁。
>
> **哪部分是硬的、哪部分会漂**：
>
> - **硬的**（改代码也不该变）：§3.1.5 的 3 条跨层边、§3.1.8 的 5 条**不变量**——哪条边不能多、哪个出口唯一。
> - **会漂的**：一切**计数**（import 方几个、边几条、切片几个）。它们只给「量级」，**不是判据**；
>   照着它们做判断会踩空，所以本节**不再写具体条数**，只写「在哪几个文件里」。
> - 要当前的条数，跑 §3.1.8 的命令自己数。

#### 3.1.1 唯一出口（真身只有两处）

| 出口 | 文件 | import 方 | 说明 |
|---|---|---|---|
| **PS 出口** | `core/cep/bridge.ts` 的 `evalScript` | 调用方多在 `core/ps/*` 与 `core/cep/*` 内；另有 `commands/style.ts:65` 直连 `emitAppEvent`（广播不是 PS 调用，见 §3.1.5 第 4 条） | `callJsx` 是它的封装（串行 + 超时 + `EvalScript error.` 折算）。**唯一真正发起 PS 调用的地方**；`core/ps/init.ts` 的探针也用它（问「这个 jsx 函数在不在」） |
| **落盘出口** | `core/storage/index.ts` 的 `writeTextAtomic` | `repo/json-file.ts`（库文件）、`repo/style-repo.ts` / `repo/ku-archive.ts`（`.ini` 索引与解包内层文件，非 JSON，`json-file` 不适用）、`repo/action-repo.ts`（仓库文件与索引原文整包写回）、`core/prefs/index.ts`（`prefs.json`，独立文件）、`commands/font.ts`（**§3 授权例外**：用户选路径的整份归档） | 所有写入最终都经过它 |

#### 3.1.2 六条链

```
① 读   features ─→ store ─→ repo ─→ json-file ─→ core/storage ─→ fs
② 写   features ─→ commands ─→ repo ─→ json-file ─→ core/storage ─→ fs
③ PS   features ─→ commands ─→ core/ps ─→ capability ─→ core/cep/bridge ─→ evalScript ─→ jsx
④ 反馈 commands(结果) ─→ hooks/useRunCommand ─→ core/feedback(状态) ─→ components(渲染)
⑤ 轮询 app/layer-watcher ─→ core/ps/layer ─→ store/app
⑥ 云   features ─→ commands/cloud ─→ core/http.postText ─→ GAS 网关
                                 ↘ repo/cloud-repo ─→ style-repo / action-repo（原文收集 / 整包写回）
```

- ②的写入按**文件名**串行：`json-file` 的队列 key = `mutate:<root>:<name>`，同文件 = 同一条队列。
- ④的失败留痕在 `useRunCommand`（`log.warn(code, detail)` + toast）；读路径另有 `useReportFailure`。
- ⑤每 800ms 一次，`document.hidden` 跳过、上一轮没回来就跳过这一轮（`inFlight`）。
- ⑥只在设置页人工点按钮时走；上传前 pull 只为拿云端 `rev`，下载整包覆盖本地（`.bak` 兜底）。

#### 3.1.3 真身清单（谁能读「真的那份」）

| 真身 | 唯一读入口 | 谁在用 |
|---|---|---|
| 用户文件（`sj_*`） | `repo/*` | `commands/*`（读改写）+ `store/*`（只读投影） |
| PS 状态 | `core/ps/*` | `commands/*` + **`store/text.ts`（唯一一处 store 直读 PS）** |
| 界面偏好 | `core/prefs`（`prefs.json`，**与库文件不同目录不同文件**） | **读**：各 `store/*` 用 `getPref` + 归一函数（`normalizeColumns` / `normalizeMode` / `normalizeExpandedGroups`）**一处判**；**写**：`commands/*` 的偏好命令（`setListColumns` / `setMode` / `setColorSignOpen` / `setExpandedGroups`）统一 `savePref`。页面不碰 `core/prefs` |
| 字节 | `core/storage` | 见 3.1.1 |

#### 3.1.4 投影层（只读，不改真身）

| 层 | 允许 | 实测 |
|---|---|---|
| `store/*` | 读 `repo` / `core/prefs` / `core/ps`，写自己的 state | 只用 `core/logger`（日志）、`core/prefs`（偏好）、`core/ps/text`（读 PS 载荷）；**不碰 `core/storage`**；**不解码文件**（`types/decode-list` 只 `import type`）。**唯一的解码例外**：`store/text.ts` 解 PS 载荷（`domain/text-info.decodeTextInfo`）——它读的不是文件是 PS 状态，解码跟着载荷走 |
| `domain/*` | 纯函数，零 IO | 只 import `types` |

`store/text.ts` 是「读 PS」的范本：`getTextInfoRaw()` 拿原始载荷 → `domain/text-info.decodeTextInfo()` 解码 → 投影；
失败保留旧值 + `failure` + `stale` + `log.warn`（**读可降级但必须标记**）。

**读失败的两种姿态，按「数据源有没有换」选，不许一刀切**：

| 情形 | 姿态 | 例 |
|---|---|---|
| **同一数据源**刷新失败（没切仓库、没换文档） | 保留旧值 + 存 `Result` + `log.warn` | `store/text`（PS 文档没变）、`store/font`（同一份标签文件）、`store/common-use` |
| **换了数据源**后读失败（切仓库 / 切文档） | **清空** + 存 `Result` + `log.warn`；不许显示上一个源的投影 | `store/style-library`（索引失败必须重置 `warehouses` / `libraries`，否则显示的是另一个仓库） |

判据：**留着旧值会不会让用户看到别处的数据？** 会 ⇒ 清空；不会 ⇒ 保留。

#### 3.1.5 跨层边（5 条，全部已裁定）

| # | 边 | 为什么合法 |
|---|---|---|
| 1 | `commands/font.ts → core/storage`（`readTextAt` / `writeTextAtAtomic`） | 用户主动选路径的**整份归档**导入导出，§3 明文授权。库文件不适用 |
| 2 | `core/ps/style.ts` / `core/ps/env.ts → core/storage` | 只借 `ROOTS`（路径常量），**不读写** |
| 3 | `store/text.ts → core/ps/text` | 见 3.1.4，读 PS 的唯一一处，形状合规 |
| 4 | `commands/style.ts → core/cep/bridge`（`emitAppEvent`，`:65` / `:219`） | 色板写成功后的**广播**，不是 PS 调用；`emitAppEvent` 返回 `Result`，命令层消费结果并 `log.warn` 留痕，写盘成功不因广播失败而降级 |
| 5 | `commands/style.ts → core/cep/ps-events`（`startHostEventWait`，`:58`） | 吸色是**一次性等待**：订阅几个语义、谁先到、超时怎么算、什么时候退订，全封在 `ps-events`，命令层只递判据（`isForegroundSetd` + `cancelOn: ['selection']`）。命令层**不再直接** `subscribeHostEvent`；失败走外层 `Result` |

> **已收**：2026-10-28 之前 `features/style/useStyleActions.ts` 直连 `repo/style-repo` 的 7 个函数
> （含 `renameKu*` / `deleteKu*` / `moveKuItemTo` 三个写）——绕过编排层。
> 现已由 `commands/style.ts` 转发，页面只走 commands。

#### 3.1.6 同文件多写入者 / 多读取入口

**多写入者**：`sj_set.json` 由两个 repo 分别读改写：`repo/common-use-repo`（常用页那组键）、`repo/font-set-repo`（`zt*` 那组键）。
不丢更新靠两件事：①`json-file` 的队列 key 是文件名 → 同一条队列；②§5 的「按 key 分工」（各写各的键）。
**文件名常量只有一份**：`repo/settings-object.ts` 的 `SETTINGS_FILE`，两个 repo 都 import，不许各写一份字面量（见 §5「一个官方文件只能有一个持有者」）。

**多读取入口**：同一份文件有两个读法——`store/*` 读**投影**（自己 `load`），`commands/*` 读**原始记录**（写回要原样）。
以 `sj_set.json` 为例：`store/font-set.ts` 与 `commands/font-set.ts` 各读一次。
改文件结构要改两处——这是结构性温床，不是错误：`decodeSettingsObject` 保证「原样返回、保留未知键」，
所以**改键名不会丢用户数据**，但代码要同步两处。新增文件时优先「只在一处读、另一处从那处拿」。

#### 3.1.7 平台原语的接线在页面层（现状记录）

`features/style/StylePage.tsx` 自己 import `core/image` 的三个原语（`createCanvas` / `decodeImage` / `readFileAsDataUrl`）
注入给 `domain/image-color`。**domain 提供算法、core 提供平台原语、页面负责接线** —— 依赖注入，形状可接受。
代价：第二个页面要取色就得再抄一遍接线。将来收口的方向是让 `domain/image-color` 提供「默认注入」入口，
而不是让每个页面自己 import `core`。目前只有样式页一处接线，**不急**。

#### 3.1.8 不变量（**人工复核口径，不是机器闸**）

> 这里只列「怎么查」，**不挂进 `npm run check`** —— 数据流是全局结构，一两条边变动就红会逼人绕开闸。
> 复核的人（人或 AI）按下面的命令自己跑；跑了就把结果贴出来。
> **范围 = 本轮改动涉及的那条边**，没改的边不必每次重跑（全跑一遍只在用户要求或改动跨层公共出口时）。

| 不变量 | 复核命令 | 2026-10-28 实测 |
|---|---|---|
| 页面不直连 repo | `grep -rn "from '\.\./\.\./repo/" src/features` | **0** |
| PS 只经 bridge | `grep -rn "evalScript" src/ \| grep -v "^\s*[*//]"` | 只在 `core/cep/bridge.ts`（+ `core/ps/init.ts` 探针，同一出口） |
| 落盘只经 storage | `grep -rn "writeText" src/` | `core/storage` + `core/prefs` + `repo/*` + `commands/font.ts`（例外 1） |
| store 不解码**文件** | `grep -rn "decode" src/store` | ① 只有 `import type { Dropped }`（`types/decode-list`）；② `store/text.ts` 调 `domain/text-info.decodeTextInfo` 解**PS 载荷**（不是文件），见 §3.1.4 |
| 层边界 | 见 §3 的 ESLint 分层规则 | 越界 0 |

#### 3.1.9 三处「看起来该改、但按本仓分层不能改」（2026-10-28 推演结论）

留在这里是为了**不让下一个人重复推演**——这三处都有明确的阻塞点，不是「懒得改」。

| # | 看起来该改 | 为什么不能改 |
|---|---|---|
| 1 | `core/ps/text` 返回解码后的 `TextInfo`，让 `store/text` 变纯投影（照 `core/ps/layer` 的先例） | `core/ps/layer` 能这么做，是因为 `LayerState` 是**图层身份**（`types/layer.ts` 里就是纯类型）。`TextInfo` 是**面板显示什么**（业务形状），归一化也是业务规则（缺字段用面板默认值补）。要让 `core` 返回它，就得把业务搬进 `core`（违反「core 零业务」）或把解码搬进 `types`（违反「types 只放类型」）。**两条都违规 → 这条路在本仓分层下走不通**。现状（`store/text` 调 `domain/text-info.decodeTextInfo`）是合规的：`store → domain` 允许 |
| 2 | `core/image` 的平台原语由 `domain/image-color` 提供默认注入，页面不再自己接线 | `domain` 不能 import `core`（依赖方向）。要默认注入，就得把量化算法搬出 `domain`（那它就不是纯逻辑、没法单测）或把平台原语搬进 `domain`（那 domain 就不纯了）。**两条都违规**。现状（页面注入、domain 只出算法）是唯一能让算法保持可单测的形状 |
| 3 | `sj_set.json` 的两个读入口（store 读投影 + commands 读原始）收成一个 | 收成「commands 不自己读」→ store 得额外存原始记录（投影变重）；收成「拆两个文件」→ **改用户文件布局**（原版可能就是这样的，风险最大）。现状靠 `decodeSettingsObject`「原样返回 + 保留未知键」保证**改键名不丢用户数据**，代价只是代码改两处。**文件名常量已收口**（`repo/settings-object.ts` 的 `SETTINGS_FILE`），剩下收不成的是两个读入口 |

#### 3.1.10 图层监听：官方怎么做的，我们现在是什么样

**逐个位置的现状**（文件 / 行号 / 判据 / 常量值）写在 **`docs/plan/12-事件驱动的图层监听-2026-10-28.md`**；
官方代码片段原样录在 `docs/原版/官方行为摘录.md`（官方原版源码已入仓 `docs/原版/app.v4.js`）。

**官方的做法**（`app.v4.js:42472` 起，4 个事件 ID 全挂同一个 `selectLayer`）：

- **事件驱动**：事件一到就 `zt_getFontSimpleInfo` 读一次，**不比任何 key**；
- **`err === 0` 才覆盖面板**（读失败保留旧值）—— 我们 `store/text` 的行为与之一致；
- **事件载荷里带 `layerID`（数组）与 `null._name`**（`app.v4.js:69408` 的 `switch (s)`），
  **PS 图层 id 全局唯一、跨文档不撞**；
- **官方不用 id 判身份**：`selectLayer` 无参，id 只进了 `E.layer.id`（`app.v4.js:17910` 另一组件）；
- **官方改名时也重读**：`slct` 的 `layerID` 分支里 `cyUpdataLayerName` 与 `ztSelectLayer` 并列。

**我们现在**：

| 环节 | 现状 |
|---|---|
| 图层身份 | **类型 + 名字**（`useFontPanel.ts:90`、`layer-watcher.tsx:83`）—— 不含 id |
| 触发 | 800ms 轮询（`layer-watcher.tsx:29`）+ 事件快路径（订阅 `layerChanged` / `documentChanged` 两个语义）。`layerChanged` 含 4 个事件 ID：`slct`（单图层）/ `1416785510`（无条件）/ `1298866208`（文字图层引用）/ **`setd` 且 `to._obj === 'textStyle'`**（官方 `app.v4.js:69417`，PS 里改字号 / 字体后重读） |
| 事件注册与分发 | 全在 CEP 层（`core/cep/ps-events.ts`），**不需要 jsx**；4 个语义 / 7 个事件 ID / 按 ID 去重注册 / 16 条测试 |
| 读失败 | watcher 保持上次状态 + 一次性 `log.warn(code, detail)`；`store/text` 保留旧值 + `failure` + `stale` |
| jsx 协议 | `mm_layer_getState` 返回**类型 + 名字**（无 id）；`mm_layer_getSelection` 返回选中数 |
| 探针 | `mm_layer_getState` 是 `CORE_REQUIRED` 唯一项（缺了整门不可用）；`mm_layer_getSelection` 缺失只影响 4 个多选能力 |

**未决问题**（含各自的取舍与「回答它需要什么」）在 plan 12 的 §7。

> **别再写「事件需要 jsx 侧 registerNotification」**——那是旧判断。官方走的是 CEP 的
> `PhotoshopRegisterEvent` + `PhotoshopJSONCallback`，**全在 CEP 层**，`core/cep/ps-events.ts`
> 已经实现（`ps-events.ts` 文件头 + plan 12）。
## 4. 类型契约

```ts
// src/types/result.ts —— 全仓唯一结果形状
export type ErrorCode =
  | 'NOT_FOUND' | 'CORRUPT' | 'IO_ERROR'
  | 'PS_NO_DOC' | 'PS_WRONG_LAYER' | 'PS_SKIPPED'
  | 'PS_UNREADY' | 'PS_REJECTED' | 'PS_ERROR'
  | 'NETWORK' | 'TIMEOUT' | 'AUTH' | 'FORBIDDEN'
  | 'VALIDATION' | 'CANCELLED' | 'UNKNOWN';

export type Result<T> =
  | { status: 'ok'; value: T }
  | { status: 'error'; code: ErrorCode; reason: string; detail: string };
```

- 成功 / 失败只有这一个形状；**不存在第二种结果类型**（没有 ReadOutcome、没有 boolean 失败、没有 null 通道）
- 构造只经 `ok()` / `fail()` / `failWithDetail()`，业务代码不许写 `{ status: ... }` 字面量
- `reason` 是给人看的一句话；`detail` 是给机器查的底层原文（原始返回值等），必填，无观测时为空串
- 失败原样透传：上层给什么码就上抛什么码，**不许换一种失败说法重包**

```ts
// src/types/layer.ts
export type LayerKind = 'normal' | 'shape' | 'text' | 'smartObject' | 'group' | 'unknown';
```

规则：

- 业务函数一律返回 `Result<T>`，不抛异常
- 跨层传参禁止裸 JSON 字符串，必须用类型
- 颜色换算只在 jsx（CMYK/RGB 由 PS 给），前端不再有 `Color` 类型与 `core/color` 模块

### 4.1 编译期严格选项（已开启）

| 选项 | 防住什么 |
|---|---|
| `strict` | 空值、隐式 any、函数参数逆变等基础安全 |
| `noUncheckedIndexedAccess` | 数组索引、`Record` 取值返回 `T \| undefined`，强制判空 |
| `noImplicitReturns` | 有的分支 return、有的不 return 直接报错 |
| `verbatimModuleSyntax` | 类型导入必须 `import type`，避免运行时副作用 |
| `forceConsistentCasingInFileNames` | Windows 大小写不敏感导致的跨平台问题 |
| `noUnusedLocals` / `noUnusedParameters` | 死代码 |
| `noFallthroughCasesInSwitch` | switch 漏 `break` |

**不开** `exactOptionalPropertyTypes`：与 React props 默认值冲突过多，属于负优化。

### 4.2 读取失败由码承载（区分环境问题与数据问题）

文件读取返回同一个 `Result<T>`，三种失败各占一个码：

| 码 | 含义 | 页面表现 |
|---|---|---|
| `NOT_FOUND` | 索引登记了，但文件不存在 | 如实显示「文件缺失」，不假装空库 |
| `CORRUPT` | 文件在，但内容不是预期结构 | 显示具体原因，**不提供重试** |
| `IO_ERROR` | IO 失败：占用、权限 | 显示原因 + **重试按钮** |
| 抛出异常 | 代码 bug | **不捕获**，冒泡到错误边界 |

判定原则：

- **诚实优先**：登记了但没文件、有条目认不出，都要如实说出来，不许静默丢弃
- **代码问题直接报错**：`TypeError` 之类的编程错误不能被包装成「读取失败，请重试」，那是把 bug 伪装成环境问题
- **只有环境问题才给重试**：`CORRUPT` 重试一百次还是 `CORRUPT`

### 4.3 严格模式的边界

TypeScript 类型在运行时被擦除，`as` 断言不做任何校验。因此：

- 接口响应、文件内容、jsx 返回值一律视为**不可信输入**
- 使用前校验关键字段，校验失败返回 `fail('VALIDATION', ...)`
- 禁止 `as SomeType` 后直接当已知结构用
- 分隔符解析（`split('|')`）后必须判空，解构元素类型是 `T | undefined`

**比断言更隐蔽的是签名被放宽**：断言一眼看得见，放宽看不见 —— 编译永远过，调用方一行行变松。

| 放宽 | 谁在付代价 |
|---|---|
| `Result<T>` → `Result<T \| null>` | 每个调用点多一个「`null` 表示什么」要猜 |
| 必填参数 → 可选 | 少传也能编译，运行时才炸 |
| `unknown` 往外扩散 | 消费者开始自己收窄，而收窄本来就该在生产者 |
| `as T` / `as unknown as T` | 断言不做校验，等价于「我知道它对」 |

判据：**改签名时问一句「放宽之后，调用方要多知道什么？」** 多知道一条 ⇒ 放宽没换来简化，只是把复杂度推给了调用方。

### 4.4 失败只有一种形状

「缺文件」「读坏了」「IO 失败」由 `code` 区分（`NOT_FOUND` / `CORRUPT` / `IO_ERROR`），
**不是**三种类型。语义信息在码里，形状全仓只有一个——不存在转换层，失败原样透传。

历史教训：曾有两套失败类型（`ReadOutcome` + `Result`）加一个 `toResult` 转换层，
结果是每个消费点都要学两种形状、转换点还要决定「丢哪些字段」。已全部收掉。

**失败由生产者给，消费者只转发**（`ADR-0003`）：判「空 / 缺失 / 坏」在生产者那一层做完并给 `Result` + `code`；
`commands` / `store` / `hooks` / `components` / `features` 不许判空、改码、换文案、补默认值。
渲染层可以按 `code` 决定「怎么说」（显示什么、给不给重试），但那是呈现，不是改数据。

### 4.5 写操作约定（三条硬规则）

1. **先读成功再写**：读不到就不写。读不到时既不知道旧内容、也写不出 `.bak`，继续写等于把用户数据换成默认值。
2. **每次写都备份**：用 `writeTextAtomic`，它会先把原文件复制成 `<文件>.bak` 再替换。
3. **同一文件串行写**：`writeTextAtomic` 内部按文件名排队，并发调用不会互相覆盖。

回滚方式：把 `<文件>.bak` 复制回 `<文件>`；代码入口是 `core/storage.restoreBackup`（它不会轮换 `.bak`，回滚本身不毁退路）。

**`.bak` 的三条事实（别写成「有备份就安全」）**：

1. **只保留上一版**：连续写两次后，`.bak` 里是上一次的内容，更早的版本没了。
2. **首次创建没有 `.bak`**：没有原文就没有可备份的东西。
3. **错误提示必须带路径**：读写失败的 `reason` 里要能看到文件绝对路径，否则用户不知道自己数据在哪、备份在哪。

**不允许**：
- 直接 `writeText` 覆盖用户数据文件（只允许写自己新建的配置文件）
- 写失败后静默返回，不记日志
- 读到 `NOT_FOUND` 就当「首次使用」直接初始化写回
- 提示用户「已备份为 .bak」却不给回滚方法（要么给路径，要么给命令）

**首次创建文件（唯一例外）**：

用户主动「新增」而目标文件**确实不存在**时，允许走显式 `create` 分支：

1. 先 `exists()` 确认真不存在；存在则必须走读改写（禁止覆盖）
2. 无原文 ⇒ 不写 `.bak`（没有可备份的东西）
3. 只在用户动作的路径上调用（新建标签 / 第一次评分），不允许在读链路里顺手创建
4. 禁止把 `NOT_FOUND` 当空数组塞进 mutate——两种意图必须分开写

### 4.6 写操作只有一个入口：mutate

库文件的修改**只能**通过 repo 的 `mutateRawGroups`，不允许自己「读 → 改 → 写」：

```ts
mutateRawGroups(warehouse, kind, (groups) => {
  groups.push(newGroup);
  return groups;        // 返回 null 表示不需要写
});
```

它内部保证：

1. 读失败直接返回，**不执行修改函数**（避免把默认值写回用户文件）
2. 写入走 `writeTextAtomic`（备份 `.bak` + 按文件串行）
3. 写失败返回 `IO_ERROR`，不静默成功

写完之后由调用方重新 `load()` 刷新列表——不做自动通知，避免多一套事件机制。

### 4.7 官方 jsx 有两条通道，按原版前端选择

`jsx/vendor.jsx`（官方 jsxbin）里的函数有**两条**调用通道，**不能按函数名前缀猜**：

| 原版前端 | 实际发出 | 用在哪 |
|---|---|---|
| `jsxHistory(fn, args, label)` | `ps_onJsx('{"f":fn,"arr":args,"n":label}')` | 渐变、图层样式；常用页里走调度那批（见 `PS-CHANNEL-NOTES` §11.4） |
| `jsx(fn, args)` | `fn(args)` 直接调 | 字体（`ys_checkUseFont` / `ys_useFont` / `ztgl_initSystemList` / `ztgl_setFont`）、文本属性（`zt_*` / `layer_font_*`） |

判断方法：看 app 的 `cep/transport.ts` 里调用点用的是 `jsxHistory` 还是 `jsx`，**不要凭 `ys_` 前缀推断**。

**同一个函数在不同面板可能用不同通道，也可能用同一通道但参数不同**，两种情况都别混：
- 参数不同、通道相同：`cy_distributedByPitch` 在常用页是 `[axis, gap, sortMode]`（`:1262654`）、
  在文本属性面板是 `[axis, value, 2, filter]`（`:1441105`），**两处都是 `jsxHistory`**。
  `core/ps/text.ts` 目前仍按直调实现，属已登记 P1（待真机确认 `ps_onJsx` 能调 `cy_*` 后统一）
- 通道不同、函数同族：`cy_zoom` 直调、`cy_transformPosition` 走调度（§11.4 表第 3 列）

调错通道的表现：`EvalScript error.`（脚本层面就炸）或「缺少必需值」（调度器上下文缺失）。

以下是**调度通道**的格式（`cep-events.js:156-165`）：

```js
var r = { f: 'ys_useStyleColor', arr: [item], n: '智能填充颜色' };
evalScript("ps_onJsx('" + JSON.stringify(r) + "')")
```

| 字段 | 含义 |
|---|---|
| `f` | 官方函数名 |
| `arr` | 参数数组（项本身，不是 `[项]` 嵌套） |
| `n` | 日志标签，可选 |

返回值：`-1` = 宿主拒绝（多为没选中图层），其余视为成功。

直接 `ys_useStyleColor(item)` 会报 **「缺少必需值」**——它期望被调度器调用。

### 4.8 公共能力不进页面

`features/` 只做**组装和展示**。下面这些调用只能出现在公共层，页面里出现任何一个，都说明能力被写进了页面：

| 调用 | 唯一位置 | 页面通过什么用 |
|---|---|---|
| `setInterval` / `setTimeout` 轮询 | `app/*-watcher.tsx` | 读 `store` |
| `addEventListener` / `window.addEventListener('keydown')` | `hooks/useDismiss`（Esc 关浮层）/ `hooks/useShortcut`（字母快捷键）/ `hooks/useNoContextMenu`（禁浏览器右键菜单，只 `preventDefault`） | 调 hook；全站只这三个全局监听入口，别在组件里再挂一个 |
| `getBoundingClientRect` | `hooks/useFloatingPosition` | 调 hook（要锚点宽度就用 `update()` 的返回值） |
| `createPortal(…, document.body)` | `components/Portal` | 用 `<Portal>` 包住浮层 |
| `localStorage` | `core/prefs`（界面偏好）/ `core/auth`（登录 token——凭证不进偏好文件，否则清偏好就掉登录） | 业务层一律经 `store/*` 读、`commands/*` 写 |
| `JSON.parse` | `types/json.ts` | 调 `parseJson`（label 必填） |
| `evalScript` / `callJsx` | `core/ps/*` | 调 `commands` |

**判断标准：两处以上就抽。**

| 复用次数 | 放哪 |
|---|---|
| 1 次 | 留在页面 |
| 2 次 | 抽到 `hooks/` 或 `components/` |
| 3 次以上 | 抽到 `hooks/` 并配单测（边界条件开始变多） |

两条解释，避免把「按需抽象」执行成「按次数机械搬运」：

- **与业务无关的通用交互原语**（分页、触底、浮层定位、点外关闭）即使当前只有 1 个调用方，也放 `hooks/`；「1 次留在页面」约束的是**业务逻辑**。
- **纯数据常量**（SVG path、固定文案表）不算抽象，可以留在组件目录或 feature 根，不必为了「1 次」塞回组件文件。

反例（真实发生过）：`HomePage` 里自己 `setInterval` 轮询图层类型，第二个页面出现时必然复制一份。已收敛到 `app/layer-watcher.tsx`，页面只读 `store`。

检查命令（体检时跑，期望输出为空）：

```powershell
Get-ChildItem src/features -Recurse -Include *.ts,*.tsx |
  Select-String "setInterval|setTimeout|addEventListener|getBoundingClientRect|localStorage|JSON\.parse|evalScript|callJsx"
```

---

## 5. 技术横切（7 项）

| 横切 | 模块 | 对外签名 | 禁止 |
|---|---|---|---|
| 日志 | `core/logger` | `log.info/warn/error(msg, ctx?)` | 组件里 `console.*` |
| 网络 | `core/http` | `request<T>(path, opts): Promise<Result<T>>`；`jsonpGet(url, params, timeoutMs)` 只服务不支持 CORS 的第三方接口（百度翻译）；`postText(url, body, opts)` 只服务 GAS 网关（云同步，地址即账号），只回状态码 + 正文，错误码映射由 `commands` 按协议做。三种业务代码都经 `commands` 调 | feature 里写 `fetch` / 注入 `<script>` |
| 鉴权 | `core/auth` | `getToken()`、`onUnauthorized(cb)` | 业务层手动拼 Authorization |
| 存储 | `core/storage` | `readTextResult/writeTextAtomic`；导入导出用 `readTextAt/writeTextAtAtomic/copyFileAt` | 组件里直接用 `cep.fs` |
| 官方设置文件 | `repo/*`（内部走 `repo/json-file` + `core/storage`） | `readXxx()` / `updateXxx()`，只改自己那几个键，未知键原样保留（`sj_commonFunction.json` 的根是**裸数组**，不是 `{ index, list }`） | 页面、命令、组件直接读写 `sj_*.json`；用 `core/prefs` 代管官方设置文件 |
| CEP | `core/cep` | `callJsx(fn, args)`、`emitAppEvent(type, data): Result<void>` | 组件里 `evalScript` |
| 环境 | `core/env` | `APP_TITLE`、`APP_VERSION`、`extensionId` | 各处重复取版本 |
| 主题 | `styles/tokens.css` | CSS 变量 | 组件里写死色值 |

**一个官方文件只能有一个「持有者」模块**（2026-10-28 立，起因见下）：

- 文件名常量、读写入口、形状校验都写在那个模块里；别的模块要用就 import，**不许自己写一份文件名或 `readTextResult`**。
- 一个文件要是真有两拨人写，就**按 key 分工**：`sj_set.json` 的 `zt*` 归 `repo/font-set-repo`、
  `cy*` 归 `repo/common-use-repo`，各写各的键、都走 `mutateJsonFile`（未知键保留）。
  不需要并发保护——不存在两个进程同时写同一个文件。
  **分工只到「读写入口」这一层**：文件名常量与顶层形状仍只有一个出处——`repo/settings-object.ts`
  （`SETTINGS_FILE` / `decodeSettingsObject`），两个 repo 都 import，**不许各写一份文件名或解码**。
- 反例（已修）：`sj_kuStoreInfo.ini` 曾在 `repo/style-repo` 只读、`repo/ku-archive` 私有写，
  于是云同步要做「整包替换索引」时无处可调 —— 写入口现已归 `style-repo.writeIndexRaw`。
- 推论：**「读原文」与「解析后重建」是两件事**。要上传/搬运给外部时读原文（`readIndexText`），
  别 `parse` 再 `stringify`——那会洗掉我们不认识的字段，且不可逆。

---

### 5.1 唯一入口

| 能力 | 唯一入口 | 不要做的 |
|---|---|---|
| UI 控件 | `components/ui`（Button/Input/Select/Field） | 页面自己写按钮、输入框样式 |
| 请求 | `request('endpointKey')`，类型自动推导 | 手写泛型、自己拼 URL |
| PS 动作 | `core/ps/action.ts` | 动作页两条 jsx（一调度一直调），参数形状照抄可运行的 Vue 版；直接 `callJsx` 要自己转结果 |
| PS 能力 | `core/ps/*` | 直接 `callJsx` |
| 路径 / 资源 URL | `core/paths`（`userAssetUrl` / `userSubPath`） | 手拼 `file://`、反斜杠、自己接 `SheJiZhuLi` |
| 日志 | `log.info/warn/error`（内部已脱敏） | 传 token 前自己处理 |
| 部署 | `npm run deploy`（内置清理与校验） | 手工复制文件 |

原则：唯一入口要比自己写更省事，靠便利性收敛，不靠禁止。

**资源 URL 必须经 `userAssetUrl`**。它内部做两件事，少一件就是整片破图：

1. 加 `file:///` 前缀 —— Windows 也要；Chromium 不认裸的 `C:/...`，会当相对路径解析
2. 拼 `SheJiZhuLi` 根 —— `getSystemPath('userData')` 只到 `AppData\Roaming`，
   官方数据在 `Roaming\SheJiZhuLi\`，少这一段所有 `<img>` 都是 404

```ts
userAssetUrl('kuStyle', item.thumb)                    // ✓
`${getUserDataPath()}/kuStyle/${item.thumb}`           // ✗ 少 SheJiZhuLi 且没有 file:///
```

官方资源目录：缩略图 `kuStyle/<id>.png`、渐变图 `Gradient/<file>`（大写 G）。

## 6. UI 横切（7 项）

> **已迁出：`docs/STYLE.md`**（2026-10-30 拆分）。入口与表面本来就绑在一起（「用这个件，别自己画」），
> 所以整节随样式规则一起走，**编号不变** —— 注释里的「§6」「§6.1」仍指该文件。

---

## 7. 视觉规范（Design Token）

> **已迁出：`docs/STYLE.md`**（2026-10-30 拆分）。组件形状 / 状态两张表与硬规则 1–18 全部随迁，
> **章节号与规则号不变** —— 代码注释、评审报告、`CHANGELOG` 里的「§7 规则 12」「§7 规则 14」
> 仍按原编号指向该文件。本文件只留这一行指针：样式规则**不在两份文件里并存**，改规则去改 `docs/STYLE.md`。

---

## 8. PS 能力层

```
core/ps/
├─ init.ts      jsx 加载 + 能力探测
├─ capability.ts 能力执行器：门 → 前置 → 调用 → 解析（唯一入口）
├─ capabilities.ts 能力表：一行一个能力，是「唯一事实」
├─ layer.ts     选择、类型、名称
├─ style.ts     颜色 / 渐变 / 图层样式应用
├─ font.ts      字体应用（ys_* 先检查再应用；ztgl_* 系统字体列表/应用）
├─ text.ts      文本属性（zt_* 直调；读返回 raw、写返回 Result<void>）
├─ common-use.ts 常用页按钮（cy_*，两条通道各占一半，逐个看原版调用点）
├─ rename.ts    重命名（cmm_batchName / cmm_setLayerColor，直调 + 只发不读）
├─ env.ts       环境变量注入
└─ diag.ts      能力诊断
```

约定：

- 一个动作一个函数，动词在前：`getLayerState`、`applyStyleColor`
- jsx 侧同名镜像：`mm_layer_getState`、`mm_style_applyShapeFill`（应用颜色走 vendor 的 `ys_useStyleColor`，没有本地镜像）
- **字体有两条通道，不要合并**：样式库字体项走 `ys_checkUseFont` / `ys_useFont`（参数 `encodeText`）；系统字体列表走 `ztgl_initSystemList` / `ztgl_setFont`（直调、明文参数）
- **文本属性是第三条通道**：`zt_*` / `layer_font_*` / `cy_distributedByPitch` 全部直调 `jsx()`、明文参数、写操作 60s 超时，参数与返回见 `PS-CHANNEL-NOTES.md` §11.3。这些函数在 `vendor.jsx` 里已存在，**不写 `jsx/main.jsx` 镜像**（同 `ztgl_*` 的例外理由）
- **常用页按钮是第四条，但不能一刀切**：`cy_*` 里一半走 `ps_onJsx`（原版 `jsxHistory*`）、一半直调（原版 `jsx` / `jsxNoCheck`），**逐个看原版调用点**，同一族也可能不同（`cy_zoom` 直调、`cy_transformPosition` 走调度）。两条通道的实现只有一份：`core/ps/capability.ts` 的 `DISPATCH` + `toWire`，逐条通道写在 `core/ps/capabilities.ts` 的 `channel` 字段里。清单与逐条通道见 `PS-CHANNEL-NOTES.md` §11.4
- **`core/ps` 不 import `domain`**：读函数只返回原始 raw，归一化在 `domain`，编排在 `commands`
- **形状改色不要另起一套**：`mm_style_setShapeColor` 已覆盖填充/描边/开关，旧的 `mm_shape_*` 已删除
- **批量操作必须在 jsx 内循环**，一次 `evalScript` 完成，禁止前端循环调用
- **写操作统一包撤销组**：jsx 内用 `app.activeDocument.suspendHistory(名称, "fn()")`
- 先读状态再改，失败不留半成品

---

## 9. 命令层（commands）

命令层是业务动作层，夹在页面和 PS 原子能力之间。

| 判定 | 放哪 |
|---|---|
| 一次 `evalScript`，无业务分支 | `core/ps/<域>.ts` |
| 多次原子调用 + 业务判断 | `commands/<域>.ts` |
| 需要读写库文件 | `commands/<域>.ts` |
| 只管交互和渲染 | `features/<域>/` |

三条硬规则：

1. 不碰 DOM，不弹 toast，只返回 `Result<T>`
2. 不直接 `evalScript`，一律走 `core/ps`
3. 不维护 UI 状态，loading / 提示由页面决定

命名：文件按业务域（`swatch.ts`、`style.ts`），函数动词开头（`applyColor`、`deleteGroup`）。

**禁止建命令注册表**（`id: 'style.applyColor'` 那种）。直接 `import` 是编译期检查，注册表是运行时报错。

完整范本见 `src/commands/README.md`。

## 10. 状态管理

- 每个 feature 一个切片：`store/user.ts`、`store/library.ts`
- 组件只通过选择器订阅需要的字段：

```ts
const palette = useStore((s) => s.palette);   // 只订阅这一个字段
```

- 禁止 `useStore()` 不带选择器（会导致全量重渲染）
- 异步动作放在 store 内，组件只调用，不自己串请求
- 不允许直接改 `state.xxx`，只能走 action

---

## 11. 网络与鉴权

- 所有路径写在 `core/http/endpoints.ts`
- `request()` 负责：加 token、超时、错误码归一、401 触发 `onUnauthorized`
- 业务层拿到的永远是 `Result<T>`
- 重试只允许用于幂等 GET，最多 1 次
- 禁止在组件里写完整 URL

---

## 12. 错误与日志

- 用户可见错误：`useToast().error(message)`
- 技术错误：`log.error(msg, ctx)`，不弹给用户
- 禁止 `try/catch` 吞掉错误不留日志
- 错误文案统一中文，不带技术细节（堆栈只进日志）
- **消息只有一个入口：`src/types/messages.ts` 的 `MSG`。**（放 `types` 是因为它是唯一所有层都能 import 的层；`core` 也要用它说人话）
  **判据（一条）：这句话是「系统告诉用户发生了什么」吗？**
  - **是**（失败 / 成功 / 进度 / 空态 / 确认正文与确认按钮 / 输入校验）⇒ 进 `MSG`；`fail` / `toast` 里不许再写中文。
  - **不是**（按钮 label 与 `title`、字段 label 与 `placeholder`、菜单项、选项名、分区标题）⇒ **就地写在组件或调用点**，不禁止中文；**也不许反过来建一张「页面文字表」**——那只是把 `MSG` 换个名字，读者与判据都没变（2026-10-31 曾这么写过一版，删了）。
  - **边界**：同一句话两种用途时，按「用户看到那一刻它在说什么」判——`InputDialog` 的标题「请输入组名」是**提示**（进 `MSG`），按钮叫「确定」是**界面**（就地）。
  - 存量：`MSG.home` 里那批按钮名与分区标题属遗留（`TD-04-2`），改到哪页顺手退回该页，不追溯。
  - `core/` **不许 import `domain`**，所以 `core` 里也不许出现中文文案：那里只说错误码 + 英文技术 `detail`，中文由消费方用 `MSG` 或码映射给出（现存 72 处属存量债 `TD-04-1`，按文件清，不新写）。
  - 唯一的非文案例外：传给 jsx 的**参数值**（如翻转方向 `'左右'`）必须与官方逐字一致，留在调用点，不算文案。

---

## 13. 性能

- 页面级 `React.lazy` 动态导入
- 禁止 barrel 文件（`index.ts` 聚合导出），直接引具体文件
- 列表超过 100 项必须分片渲染：优先虚拟滚动；整页长列表允许「每页 30 + 触底加载」（禁止一次性渲染全部）；分组列表默认折叠，只展开前几组
- 长列表（如样式库 108 组 508 项）不一次性渲染，先折叠再看
- 大计算用 `useMemo`，事件处理用 `useCallback`，但不要无脑包

---

## 14. 样式

> **已迁出：`docs/STYLE.md`**（含 §14.1「JS 不许改视觉样式」与机器闸说明）。编号不变，
> 代码注释里的「§14.1」仍指该文件。

---

## 15. 测试

- 只写 `src/**/*.test.ts`，只测纯逻辑（`core` 纯函数、`domain`、`repo`、`types`）
- **TSX 一律不写测试**：页面、组件、hook 的渲染与交互都不测；禁止 `.test.tsx` / `.spec.tsx`
- 禁止安装 `@testing-library/*`、`jsdom`、`happy-dom`；`vitest.config.ts` 保持 `environment: 'node'`、`include: ['src/**/*.test.ts']`
- UI 里值得测的算法先迁到 `domain/` 或 `core/` 再测
- CEP 交互：mock `core/cep`，不在测试里真的调 PS

---

## 16. 新增一个 feature 的流程

1. 建目录 `features/<name>/`
2. 必须：`<Name>Page.tsx`；动作多时同目录 `use<Name>.ts`；有子组件时 `components/`
3. `api.ts`、`types.ts`、`hooks/` **按需**，不要为了对齐结构造空目录
4. 在 `app/router.tsx` 注册路由（懒加载）；`app/nav-config.ts` 里 `shortcut` 开工时就登记（单字母小写），`implemented` 只在页面能跑通、`npm run check:nav` 双向一致之后才改 `true`——提前置 true 会让导航点到白屏
5. 需要全局状态时在 `store/` 加切片，不要塞进别人的切片
6. 需要复用的逻辑上移到 `core` / `hooks` / `components`，不要复制；跨 feature 复用禁止互相 import

---

## 17. 禁止清单

- 组件内 `fetch`
- 组件内 `evalScript`
- 组件内直接读写文件
- 硬编码颜色、px、间距
- 新增 `any`（桥接层除外）
- barrel 导出
- feature 互相 import
- 未经说明新增依赖
- 使用 fengzi / psz / SheJiZhuLi 等旧命名

---

## 18. React 规则（来自 react-best-practices）

| 规则 | 要求 |
|---|---|
| `bundle-dynamic-imports` | 页面和重组件一律 `React.lazy` |
| `bundle-barrel-imports` | 禁止 barrel 导出，直接引具体文件 |
| `rerender-derived-state-no-effect` | 派生值渲染期算，不用 state + effect 同步 |
| `rerender-memo` | 只有传给 `memo` 子组件的回调才用 `useCallback` |
| `rerender-lazy-state-init` | 昂贵初始值用 `useState(() => ...)` |
| `client-localstorage-schema` | key 带版本：`maomao.v1.<域>.<键>` |
| 竞态 | effect 内异步必须带取消标志，卸载后不 `setState` |

## 19. 评审清单

- [ ] 依赖方向正确，没有反向 import
- [ ] 没有 `any`、没有硬编码色值/px
- [ ] 返回值是 `Result<T>`
- [ ] PS 操作走 `core/ps`，批量只发一次 `evalScript`
- [ ] 写操作有撤销组
- [ ] 异步状态有 loading / error 处理
- [ ] 组件按职责拆分（不按行数），样式用变量
- [ ] 命名符合第 1 节
