# 猫猫设计工具 · 工程约定（强制）

> 本文件是唯一标准。写代码前先读，评审时逐条对照。
> 与本文件冲突的写法一律视为错误，不允许「先这样，后面再改」。

---

## 0. 修改规则

- 新增约定：先改本文件，再写代码
- 约定冲突：以本文件为准，代码里不允许「局部例外」
- 唯一允许写原始色值和 px 的文件：`src/styles/tokens.css`
- 配套文件：`docs/GOVERNANCE.md`（边界升级条件、范本制度、底层优先原则、定期体检）
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
5. 在 GOVERNANCE.md 变更记录登记
```

**不允许**：

- 「新代码用新的，老代码保持旧的」
- 保留 deprecated 包装层「过渡期」
- 两套并存，等以后统一

「以后」不会到来，只会变成屎山。

### 判定表（每次新增能力必须填）

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

## 1. 命名总则

| 对象 | 规则 | 示例 |
|---|---|---|
| 品牌 | 一律 `maomao` / `Maomao`，不再出现 fengzi、psz、SheJiZhuLi | `com.maomao.design` |
| CEP Bundle | `com.maomao.<域>` | `com.maomao.design` |
| jsx 函数 | `mm_<域>_<动作>` | `mm_layer_getState` |
| CEP 事件 | `com.maomao.event.<域>` | `com.maomao.event.layer` |
| CSS 类 | `mm-<块>__<元素>--<状态>` | `mm-swatch__item--active` |
| CSS 变量 | `--mm-<类别>-<语义>` | `--mm-color-bg-panel` |
| localStorage | `maomao.<域>.<键>` | `maomao.user.token` |
| 数据目录 | `%APPDATA%\Maomao` | 不读旧目录 |
| 组件文件 | PascalCase | `SwatchGrid.tsx` |
| 非组件文件 | camelCase | `useSwatches.ts` |
| 类型 | PascalCase，无 `I` 前缀 | `LayerKind`、`StyleWarehouseIndex` |
| 常量 | UPPER_SNAKE | `MAX_RECENT` |

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
| 测试 | Vitest + Testing Library | `core` 必须有单测 |

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
│  ├─ ps/         PS 原子能力（init/layer/style/font/env/diag）
│  ├─ env/        版本、设备、环境
│  └─ logger/     日志
├─ domain/        纯业务模型与归一化（零 IO、零 UI、可单测）
├─ repo/          数据访问：读文件 → Result，不做业务判断
├─ commands/      业务命令：组合原子能力 + 写库，无 UI
├─ store/         状态切片
├─ hooks/         可复用交互原语（点外关闭、浮层定位、拖拽、持久化）
├─ components/    纯 UI
├─ features/      页面与交互
├─ assets/        静态资源（SVG sprite）
├─ styles/        tokens.css、global.css
├─ types/         全局类型
└─ app/           router、layout、providers、layer-watcher
```

### 依赖方向（只允许向下）

```
features → commands → store → core
    ↓          ↓         ↓
components ──────────→ core
```

| 层 | 允许 import | 禁止 import |
|---|---|---|
| `core` | `types`、`core` 内部其他模块 | `commands`、`store`、`components`、`features`、`app` |
| `store` | `core`、`types` | `commands`、`features`、`components` |
| `components` | `core/logger`、`types` | `commands`、`features`、`store` |
| `domain` | `types` | 其他所有层 |
| `repo` | `core/storage`、`domain`、`types` | `commands`、`store`、`features`、`components`、`app` |
| `hooks` | `core`、`domain`、`types` | `commands`、`store`、`features`、`components`、`app` |
| `commands` | `core`、`domain`、`repo`、`store`、`types` | `features`、`components`、`app` |
| `features` | 所有下层 | 其他 `features` |
| `app` | 全部 | - |

跨 feature 复用的逻辑必须上移到 `core` 或 `components`，不允许 feature 互相 import。

### ESLint 锁死边界

```js
// .eslintrc.cjs
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['**/features/*'], message: 'core/store/components 不能依赖 features' }
      ]
    }]
  },
  overrides: [
    { files: ['src/features/**'], rules: { 'no-restricted-imports': 'off' } }
  ]
};
```

---

## 4. 类型契约

```ts
// src/types/result.ts —— 全仓唯一结果形状
export type ErrorCode =
  | 'NOT_FOUND' | 'CORRUPT' | 'IO_ERROR'
  | 'PS_NO_DOC' | 'PS_NOT_SHAPE' | 'PS_SKIPPED'
  | 'PS_UNREADY' | 'PS_REJECTED' | 'PS_ERROR'
  | 'NETWORK' | 'TIMEOUT' | 'AUTH' | 'FORBIDDEN'
  | 'VALIDATION' | 'UNKNOWN';

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

### 4.4 失败只有一种形状

「缺文件」「读坏了」「IO 失败」由 `code` 区分（`NOT_FOUND` / `CORRUPT` / `IO_ERROR`），
**不是**三种类型。语义信息在码里，形状全仓只有一个——不存在转换层，失败原样透传。

历史教训：曾有两套失败类型（`ReadOutcome` + `Result`）加一个 `toResult` 转换层，
结果是每个消费点都要学两种形状、转换点还要决定「丢哪些字段」。已全部收掉。

### 4.5 写操作约定（三条硬规则）

1. **先读成功再写**：读不到就不写。读不到时既不知道旧内容、也写不出 `.bak`，继续写等于把用户数据换成默认值。
2. **每次写都备份**：用 `writeTextAtomic`，它会先把原文件复制成 `<文件>.bak` 再替换。
3. **同一文件串行写**：`writeTextAtomic` 内部按文件名排队，并发调用不会互相覆盖。

回滚方式：把 `<文件>.bak` 复制回 `<文件>`。

**不允许**：
- 直接 `writeText` 覆盖用户数据文件（只允许写自己新建的配置文件）
- 写失败后静默返回，不记日志
- 读到 `NOT_FOUND` 就当「首次使用」直接初始化写回

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
| `jsxHistory(fn, args, label)` | `ps_onJsx('{"f":fn,"arr":args,"n":label}')` | 渐变、图层样式 |
| `jsx(fn, args)` | `fn(args)` 直接调 | 字体（`ys_checkUseFont` / `ys_useFont`） |

判断方法：看 app 的 `cep/transport.ts` 里调用点用的是 `jsxHistory` 还是 `jsx`，**不要凭 `ys_` 前缀推断**。

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
| `addEventListener` | `hooks/*`（如 `useDismiss`） | 调 hook |
| `getBoundingClientRect` | `hooks/useFloatingPosition` | 调 hook |
| `localStorage` | `core/prefs` | `hooks/usePersisted` |
| `JSON.parse` | `types/json.ts` | 调 `parseJson`（label 必填） |
| `evalScript` / `callJsx` | `core/ps/*` | 调 `commands` |

**判断标准：两处以上就抽。**

| 复用次数 | 放哪 |
|---|---|
| 1 次 | 留在页面 |
| 2 次 | 抽到 `hooks/` 或 `components/` |
| 3 次以上 | 抽到 `hooks/` 并配单测（边界条件开始变多） |

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
| 网络 | `core/http` | `request<T>(path, opts): Promise<Result<T>>` | feature 里写 `fetch` |
| 鉴权 | `core/auth` | `getToken()`、`onUnauthorized(cb)` | 业务层手动拼 Authorization |
| 存储 | `core/storage` | `readTextResult/readJson/writeTextAtomic/writeJson` | 组件里直接用 `cep.fs` |
| CEP | `core/cep` | `callJsx(fn, args)`、`emitAppEvent(type, data)` | 组件里 `evalScript` |
| 环境 | `core/env` | `APP_TITLE`、`APP_VERSION`、`extensionId` | 各处重复取版本 |
| 主题 | `styles/tokens.css` | CSS 变量 | 组件里写死色值 |

---

### 5.1 唯一入口

| 能力 | 唯一入口 | 不要做的 |
|---|---|---|
| UI 控件 | `components/ui`（Button/Input/Select/Field） | 页面自己写按钮、输入框样式 |
| 请求 | `request('endpointKey')`，类型自动推导 | 手写泛型、自己拼 URL |
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

## 6. UI 横切（3 项）

| 横切 | 入口 | 禁止 |
|---|---|---|
| 提示 | `useToast()` | `alert()` |
| 确认 | `useConfirm()` | `confirm()` |
| 加载 | `useLoading()` | 各组件自己维护 loading 文案 |

统一由 `app/providers.tsx` 挂载，页面内只调 hook。

---

## 7. 视觉规范（Design Token）

```css
/* src/styles/tokens.css —— 唯一允许写原始值的地方 */
:root {
  /* 原始值 */
  --mm-gray-900: #2b2b2b;
  --mm-gray-800: #3f3f3f;
  --mm-gray-700: #535353;
  --mm-blue-500: #0f7df2;

  /* 语义色 */
  --mm-color-bg-panel: var(--mm-gray-700);
  --mm-color-bg-elevated: var(--mm-gray-800);
  --mm-color-bg-hover: rgba(255, 255, 255, 0.08);
  --mm-color-text: #d6d6d6;
  --mm-color-text-dim: #9a9a9a;
  --mm-color-border: rgba(0, 0, 0, 0.5);
  --mm-color-accent: var(--mm-blue-500);

  /* 形状 */
  --mm-radius-sm: 2px;
  --mm-radius-md: 4px;
  --mm-radius-pill: 999px;
  --mm-border-w: 1px;
  --mm-shadow-pop: 0 4px 12px rgba(0, 0, 0, 0.4);

  /* 尺寸（4 的倍数） */
  --mm-space-1: 4px;
  --mm-space-2: 8px;
  --mm-space-3: 12px;
  --mm-space-4: 16px;
  --mm-control-h: 24px;
  --mm-control-h-sm: 20px;
  --mm-icon-sm: 14px;
  --mm-icon-md: 16px;
  --mm-font-xs: 11px;
  --mm-font-sm: 12px;
  --mm-font-md: 13px;
}
```

### 组件形状

| 组件 | 圆角 | 高度 | 内边距 | 边框 |
|---|---|---|---|---|
| Button | `--mm-radius-md` | 24 | `0 var(--mm-space-2)` | 无 |
| IconButton | `--mm-radius-md` | 24 × 24 | 0 | 无 |
| Input | `--mm-radius-md` | 24 | `0 6px` | `1px` |
| Card | `--mm-radius-md` | 自适应 | `var(--mm-space-2)` | `1px` |
| Tag | `--mm-radius-sm` | 18 | `0 6px` | `1px` |
| 色块 | `--mm-radius-pill` | 20 × 20 | 0 | `1px` 透明 |

### 状态

| 状态 | 表现 |
|---|---|
| hover | 叠 `--mm-color-bg-hover` |
| active | 背景再深一档 |
| disabled | `opacity: .4`，`cursor: not-allowed` |
| focus | `outline: 1px solid var(--mm-color-accent)` |
| selected | 边框 `--mm-color-accent` |

### 硬规则

1. 组件里不出现 `px` 字面量（`0` 除外）
2. 不出现色值，只能用语义变量
3. 间距只用 `--mm-space-*`
4. 面板宽度 280–360，控件高度 24，字号 12–13，圆角不超过 4

---

## 8. PS 能力层

```
core/ps/
├─ init.ts      jsx 加载 + 能力探测
├─ layer.ts     选择、类型、名称
├─ style.ts     颜色 / 渐变 / 图层样式应用
├─ font.ts      字体应用（先检查再应用）
├─ document.ts  文档信息
├─ env.ts       环境变量注入
└─ diag.ts      能力诊断
```

约定：

- 一个动作一个函数，动词在前：`getLayerState`、`applyStyleColor`
- jsx 侧同名镜像：`mm_layer_getState`、`mm_style_applyColor`
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

---

## 13. 性能

- 页面级 `React.lazy` 动态导入
- 禁止 barrel 文件（`index.ts` 聚合导出），直接引具体文件
- 列表超过 100 项启用虚拟滚动；分组列表默认折叠，只展开前几组
- 长列表（如样式库 108 组 508 项）不一次性渲染，先折叠再看
- 大计算用 `useMemo`，事件处理用 `useCallback`，但不要无脑包
- 单个组件文件不超过 300 行，超出就拆

---

## 14. 样式

- 组件样式与组件同目录：`SwatchGrid.tsx` + `SwatchGrid.css`
- 类名 `mm-` 前缀，BEM 风格
- 不使用内联 style，动态值用 CSS 变量注入：

```tsx
<div style={{ '--mm-swatch-color': color } as React.CSSProperties} />
```

---

## 15. 测试

- `core` 层纯函数：必须有单测
- 组件：Testing Library，只测交互结果，不测实现细节
- CEP 交互：mock `core/cep`，不在测试里真的调 PS

---

## 16. 新增一个 feature 的流程

1. 建目录 `features/<name>/`
2. 文件：`<Name>Page.tsx`、`components/`、`hooks/`、`api.ts`、`types.ts`
3. 在 `app/router.tsx` 注册路由（懒加载）
4. 需要全局状态时在 `store/` 加切片，不要塞进别人的切片
5. 需要复用的逻辑上移到 `core`，不要复制

---

## 17. 禁止清单

- 组件内 `fetch`
- 组件内 `evalScript`
- 组件内直接读写文件
- 硬编码颜色、px、间距
- 新增 `any`（桥接层除外）
- barrel 导出
- feature 互相 import
- 巨型组件（> 300 行）
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
- [ ] 组件 < 300 行，样式用变量
- [ ] 命名符合第 1 节
