# JSX 通道与自写指南

> 回答两件事：**① 怎么调官方那个混淆过的 jsx，通道是怎么通的；② 哪些功能要自己写 jsx，具体怎么写。**
>
> 全篇结论一句话：**调官方函数 = 往能力表加一行（函数名是字符串，函数体看不见不影响调用）；自己写 jsx = 往 `jsx/main.jsx` 加一个 `mm_<域>_<动作>` 函数，然后同样往表里加一行。**

---

## 1. 全链路：一次 PS 调用是怎么通到 PS 的

```
features/template/TemplatePage.tsx           ← 页面（只调 commands）
   ↓
commands/template.ts                         ← 编排：先 vendor 写文件，再写索引
   ↓
core/ps/template.ts                          ← 薄函数（两行，只做语义命名）
   ↓  callCapability(CAP.templateAdd, [psdDir])
core/ps/capability.ts:137  callCapability()  ← 唯一执行器，固定四步
   ├─ 1 门：requireVendor() / requireCore()        → 未就绪 = PS_UNREADY
   ├─ 2 函数存在性：funcMissing(spec.fn)            → 缺这一个 = PS_UNREADY + detail:fn:xxx
   ├─ 3 前置：spec.require()（如 requireSelection）  → 图层不对 = PS_WRONG_LAYER
   └─ 4 调用：toWire(spec, args) → callJsx(...) → parse(raw)
   ↓
core/cep/bridge.ts:133  callJsx()            ← 拼成一段 ExtendScript 字符串
   ↓
core/cep/bridge.ts:101  evalScript()         ← CEP 桥，**串行队列**
   ↓
window.__adobe_cep__.evalScript(...)         ← 宿主
   ↓
Photoshop ExtendScript                      ← vendor.jsx（官方副本）/ main.jsx（我们自己写的）
```

四步都在 `core/ps/capability.ts` 里，**新增能力只往表里加一行，不许重写这四步**（文件头原话）。

> **另一条支路**：有 4 个调用不进表（理由见 §7.8），走 `callDirect` —— 同样过「门 + 函数存在性」，只是解析自己写。

---

## 2. 两个分叉路口：`gate`（谁的函数）与 `channel`（怎么发）

这两个是**正交的两件事**，别混。一个能力行里同时写着它们：

| 分叉 | 在哪一步 | 管什么 | 取值 | 决定 |
|---|---|---|---|---|
| **`gate`** | 执行器第 1 步（`capability.ts:141` `GATE[spec.gate].ready()`） | 这个函数**是谁写的** | `core` = `jsx/main.jsx`（我们自写）<br>`vendor` = `jsx/vendor.jsx`（官方混淆） | 探测哪个文件、缺了报哪扇门 |
| **`channel`** | 执行器第 4 步（`capability.ts:127` `toWire`） | 这个调用**怎么发出去** | `direct` = 直接 `fn(args)`<br>`dispatch` = `ps_onJsx({f,arr,n})` | 线上形态、要不要历史组 |

**顺序上先门后通道**：门在第一步就把「能不能用」定了，通道在第四步才决定「怎么发」。所以「谁的函数」永远先于「怎么发」。

**为什么 `core` 不许 `dispatch`** —— 这是硬约束，不是风格：

`ps_onJsx` 这个调度函数**本身就在 `VENDOR_FUNCS` 里**（`init.test.ts:32` 有断言：`VENDOR_FUNCS` 必须含 `ps_onJsx`）。我们自写的 `jsx/main.jsx` 里**没有**它。

而 `core` 门只看 `capability.core`，**完全不看 `capability.vendor`** —— 两扇门是分开探的（`init.ts:223` 起）。
vendor 侧可能因四种原因没开（见 §5.1），其中「环境变量注入失败」跟 `main.jsx` 加没加载毫无关系。

⇒ core 能力若走 dispatch，等于去调一个**可能不存在**的函数；而且 `funcMissing` 也拦不住它 ——
它查的是合并的 `missing` 清单，vendor 那次探测没跑完就不会把这些名字列进去。
所以类型层直接禁掉，让这种写法编译不过。

**怎么一眼分清自写和 vendor**：

1. **能力行的 `gate` 字段** —— 唯一权威，其它都只是辅助
2. **探测清单**：`CORE_FUNCS`（`init.ts:70`，探 `jsx/main.jsx`）/ `VENDOR_FUNCS`（`init.ts:97`，探 `jsx/vendor.jsx`）
3. **名字前缀**（辅助，**不完整**）：自写一律 `mm_*`；官方那批前缀很多 —— `ys_ / zt_ / ztgl_ / cy_ / cmm_ / dz_ / Fs_ / ps_mb* / mb_ / Layer_ / Tool_ / layer_ / ps_ys*`，
   而且以后还会遇到新的。**别拿前缀当判据**，只当"扫一眼大概是谁的"。

**可机器验的那一半**：`mm_` 开头的 fn **必须**是 `gate: 'core'`（`capability.test` 有断言）。
反过来不成立 —— 官方函数里也有 `layer_` / `Layer_` 这种，看着像自写其实是官方的，所以只能单向卡。

---

### 2.1 两条通道的线上形态

通道的**唯一实现**是 `toWire`（`capability.ts:127`）：

| 通道 | 线上形态 | 用在哪 |
|---|---|---|
| `direct` | 直接 `fn(参数…)` | 一次性调用：存模板、打开文件、开目录、读图层状态 |
| `dispatch` | `ps_onJsx({ f: 'fn名', arr: [参数…], n: '日志标签' })` | 需要**历史组**的写操作：应用模板、更新预览图 |

`dispatch` 的 `n` **只是日志标签**（会进 PS 日志面板），不传给 jsx 函数本身。原版里它叫 `jsxHistoryNoCheck`，`ps_onJsx` 调度器会自己把这次调用包成一个撤销组 —— **所以我们不在 jsx 里写 `suspendHistory`**（写了就是第二套撤销语义）。

`gate` 与 `channel` 是**判别联合**（`capability.ts:106`）：

```ts
export type CapabilitySpec<T> = SpecBase<T> &
  ( | { gate: 'vendor'; channel: Channel; label?: string }   // 官方副本：两条通道都能走
    | { gate: 'core';   channel: 'direct' } );               // 我们自己写的：只能直调
```

写成 `{ gate: 'core', channel: 'dispatch' }` **编译不过** —— 那种组合要到运行时才炸，所以用类型挡住。

---

## 3. 参数怎么过去（`toJsxArg`，`bridge.ts:119`）

| 前端传的值 | 到 jsx 侧是什么 |
|---|---|
| `number` / `boolean` | 裸字面量：`42`、`true` |
| `string` | **单引号包裹**（内部 `\` 与 `'` 已转义）：`'C:/a/b.psd'` |
| 对象 / 数组 | **先 `JSON.stringify` 成文本，再用单引号包裹** —— 到 jsx 侧是**字符串**，不是对象 |

第三条是最容易踩的：**jsx 侧永远收不到对象**，它收到的是字符串。官方每个函数按自己的格式处理
（有的 `JSON.parse`、有的当 query 串拼），**格式不对时要么抛异常、要么静默不生效** —— 后者更难查。
所以复杂参数要么照官方调用点原样（`encodeURIComponent(JSON.stringify(x))`），要么老老实实传字符串。

所以「把一整个条目传给 vendor」要自己序列化再编码：

```ts
// core/ps/template.ts
export function applyTemplate(payload: TemplateUsePayload): Promise<Result<void>> {
  return callCapability(CAP.templateUse, [encodeURIComponent(JSON.stringify(payload))]);
}
```

`encodeURIComponent` 是原版调用点就这么干的（`app.v4.js:30701`）—— 照抄，别"优化"。

另外 `callJsx` 会**主动拒绝 `undefined` 参数**（`bridge.ts:140`）：`jsx 参数第 N 个是 undefined`。空值要显式给 `''` 或 `null`。

---

## 4. 返回值怎么回来

`callJsx` 给 jsx 套了一层壳（`bridge.ts:133`）：

```js
(function(){
  try {
    var __r = fn(参数…);
    return (typeof __r === 'string') ? __r : JSON.stringify(__r);
  } catch(e) {
    return 'error:' + (e.message || String(e));
  }
})()
```

所以 jsx 侧**只要 `return`**，两种形状都行：

| jsx 里 `return` 的东西 | 前端拿到的 `raw` |
|---|---|
| 字符串 `'ok'` / `'1'` | 原样 `'ok'` / `'1'` |
| 对象 `{ err: 0, data: {...} }` | JSON 文本 `'{"err":0,"data":{…}}'` |
| 抛异常 | `'error:具体消息'` |

**不需要**在 jsx 里手动 `JSON.stringify`，也不需要在 jsx 里 try/catch 兜错（外层已经兜了；但见 §7.3 的 `mm_safe`，那是为了写日志）。

---

## 5. 失败有七种形状，各有各的码

| 现象 | 谁产生 | 前端得到的码 |
|---|---|---|
| 门未就绪（见下面「门关的四种原因」） | `capability.ts:142` | `PS_UNREADY` + `detail: core:false` / `vendor:false` |
| 门就绪但**这一个函数**不存在（旧 jsx） | `capability.ts:151` | `PS_UNREADY` + `detail: fn:ps_mbAddPsd` |
| 前置不满足（选中图层数不够） | `spec.require`（`requireSelection`，`layer.ts:101`） | `PS_WRONG_LAYER` + reason「当前选中 N 个图层，需要至少 M 个」 |
| 宿主明确拒绝（`{err:1}`） | 解析器的 `hostRejected` | `VALIDATION` + **句子优先宿主 `msg`**，没给才用调用方兜底 |
| 宿主返回 `EvalScript error.`（脚本根本没跑起来） | `bridge.ts:158` | `PS_ERROR` + `detail: raw:EvalScript error.` |
| jsx 内部抛错（`error:` 前缀） | `bridge.ts:162` | `PS_ERROR` + **reason 就是 jsx 抛的消息** |
| 超时 | `bridge.ts:80` | `TIMEOUT`（**队列放行，PS 侧可能还在跑**） |

关键点：**函数名写错不会静默**。`funcMissing` 会把名字放进 `detail`，只禁这一个能力，不会让整个面板变红。

### 5.1 门关的四种原因（`init.ts:210-290`）

「门未就绪」不是只有「jsx 没加载」一种，`PS_UNREADY` 背后有四种可能：

| # | 原因 | core 门 | vendor 门 |
|---|---|---|---|
| 1 | jsx 文件加载失败（`$.evalFile` 报错） | `jsx/main.jsx` | `jsx/vendor.jsx` |
| 2 | `probe()` 本身失败（`evalScript` 报错） | ✓ | ✓ |
| 3 | **必需清单**缺函数（`CORE_REQUIRED` / `VENDOR_REQUIRED`） | 整门关 | 整门关 |
| 4 | `injectEnv()` 失败（`Sys_setSystemEnvInfo`） | — | **✓ 只在 vendor** |

第 4 条最隐蔽：**不注入环境变量，`ys_*` 内部拼路径会抛异常**（`init.ts:273` 的调用与其注释）。所以 vendor 门 = 「jsx 加载成功」+「必需函数齐全」+「环境变量注入成功」三件都成立。

第 3 条与第 2 步（`funcMissing`）的分工要分清：

- **必需清单**缺一个 → 整门关，这个门下的**所有**能力都不能用
- **可选清单**（`VENDOR_FUNCS` / `CORE_FUNCS` 里除必需项外的）缺一个 → 门照常开，只有**那一个能力**报 `PS_UNREADY` + `detail: fn:xxx`

`probe` 的做法（`init.ts:210`）是**一次 `evalScript` 查全部**：拼 `typeof fn1,typeof fn2,…`，不是 `function` 的进 `missing`。这也解释了为什么**新函数必须先登记进清单**——没登记就永远不会被探到，`funcMissing` 也就永远说它"在"。

---

## 6. 调官方混淆函数：加一行表就完事

### 6.1 为什么函数体看不见也能调

`jsx/vendor.jsx` 是 **jsxbin 混淆**的，读不到函数体。但调用根本不看函数体 —— 我们发的是**字符串函数名**：

```ts
// core/ps/capabilities.ts
templateAdd: {
  fn: 'ps_mbAddPsd', gate: 'vendor', channel: 'direct', timeout: WRITE_TIMEOUT,
  require: () => requireSelection(1),
  parse: strictPayload({ whenFalse: MSG.template.noSelection, whenFailed: MSG.template.saveFailed, accept: addedTemplateOf })
}
```

`fn: 'ps_mbAddPsd'` 就是全部魔法。这跟仓里早就在用的 `cmm_batchName` / `cy_openDirectory` / `ys_useFont` **一模一样**。

### 6.2 五步清单（照做即可）

| # | 做什么 | 在哪 |
|---|---|---|
| 1 | 加一行能力 | `src/core/ps/capabilities.ts`（照邻居逐字段抄） |
| 2 | 名字登记进「在用清单」 | `src/core/ps/init.ts` 的 `VENDOR_FUNCS`（官方函数）或 `CORE_FUNCS`（自写函数） |
| 3 | 写薄函数（两行） | `src/core/ps/<域>.ts`：`return callCapability(CAP.xxx, [参数])` |
| 4 | 对账 | `init.test.ts:22` 会校验「`CAP` 里每个 `gate:'vendor'` 的 `fn` 都在 `VENDOR_FUNCS` 里」（差集必须为空），漏了即红；另外 `ps_onJsx` / `Sys_setSystemEnvInfo` 必须常驻清单 |
| 5 | 真机点一次 | 名字错了会报 `PS_UNREADY` + `detail: fn:xxx` |

### 6.3 参数形状从哪查

**只能从原版调用点查**（`docs/原版/app.v4.js`），不能猜：

```js
:66538  ps_mbAddPsd([this.path.psd])              → 入参就是一个目录
:27074  mb_amendPreview([r, name, ext])           → 目录 + 文件名主干 + 扩展名
:30701  mb_useTemplate([encodeURIComponent(...)]) → 一个编码后的 JSON 串
:66815  mb_openTemplatePsd([path])                → 完整文件路径
:66720  Fs_openFolder([path])                     → 目录
```

返回形状同理，看调用点后面怎么消费它（比如 `saveToMyTemp:66608` 里拿 `data.id / data.name / data.width / data.height`）。

### 6.4 一个 `dispatch` 例子

```ts
// 需要历史组 ⇒ dispatch，label 会成为 PS 日志标签
templateUse: {
  fn: 'mb_useTemplate', gate: 'vendor', channel: 'dispatch', label: '应用模板',
  timeout: READ_TIMEOUT,
  parse: lenientVoid(MSG.template.useFailed)
}
```

---

## 7. 自己写 jsx：什么时候写、怎么写

### 7.1 先问：官方有没有现成的

有 ⇒ 走 §6，**不要自己写**（同一个能力两条实现 = 下一个人一定抄错）。
只有这两种情况才自写：

1. 官方没有这个动作（如 `mm_layer_getState` 的 800ms 轮询、`mm_diag_vendor` 诊断）
2. 官方的形状不能直接用（如需要返回 `{err:0,data}` 之外的约定）

### 7.2 放哪、怎么命名

- 文件：`jsx/main.jsx`（**唯一**自写 jsx 文件）
- 命名：`mm_<域>_<动作>`，与 `src/core/ps/<域>.ts` 一一对应
- 门：自写函数走 `gate: 'core'`，且**只能 `channel: 'direct'`**

### 7.3 骨架：`mm_safe` 包一层

```js
/** 统一异常边界：任何异常都转成 error:xxx 并落日志（jsx/main.jsx:25） */
function mm_safe(name, fn) {
  try {
    return fn();
  } catch (e) {
    mm_log(name + " ERROR: " + e.message + " @line " + e.line);
    return "error:" + e.message;
  }
}

function mm_layer_getSelection() {
  return mm_safe("mm_layer_getSelection", function () {
    if (!app.documents.length) return "no-doc";        // 约定值，不抛错
    ...
    return String(desc.getList(mm_s("targetLayers")).count);   // 字符串也能直接 return
  });
}
```

三条约定：

1. **前置用约定值，不用抛错** —— `core/ps/raw.ts:25` 的 `RAW_FAILURES` 就是这张对照表（**新增约定值必须同时加进那张表**，否则会落到 `PS_BAD_PAYLOAD`）：

   | jsx 返回的裸串 | 前端折成 |
   |---|---|
   | `'no-doc'` | `PS_NO_DOC` |
   | `'not-shape'` | `PS_WRONG_LAYER` |
   | `'skipped'` | `PS_SKIPPED` |
   | `'-1'` | `PS_REJECTED` |

   这些是「前提不满足」，不是故障 —— 界面标红会让人以为面板坏了。
2. **真异常才抛**（`mm_safe` 会转成 `error:` 并写 `%TEMP%\maomao-jsx.log`）。
3. **日志尽力而为**：写不进去就吞掉（`mm_log` 里的空 catch 是故意的，唯一允许吞错的地方）。

### 7.4 返回什么

| 你想要的语义 | jsx 里 return | 前端配哪个解析器 |
|---|---|---|
| 只关心成没成 | `'ok'` / `{ err: 0 }` | `lenientVoid(失败文案)` |
| 返回一个业务值 | 对象 `{ err: 0, data: {...} }` | `strictPayload({ accept })` 或 `strictData` |
| 返回一个裸整数 | `'42'` | 写一个**本域私有**解析器（如 `layer.selectionCountRaw`），别加进 `raw.ts`；只要原样文本才用 `passthrough` |

`dataOf`（`raw.ts:187`）会自动拆 `{ data }` —— 所以 `accept` 收到的是 `data` 里面那层，不用自己拆。

### 7.5 历史组（撤销）

自写函数要能一次 `Ctrl+Z` 撤回，**只有一条路**：

```js
app.activeDocument.suspendHistory('动作名', 'fn()');
```

因为另一条路（走 `dispatch` 借调度器）对自写函数**不通**：`core` 门不允许 dispatch，类型层就挡住了（理由见 §2）。

**不要**在 `core/ps` 的 TS 侧写 `suspendHistory` —— 那是 jsx 侧的事，TS 里写它等于往 ExtendScript 字符串里塞代码。

### 7.6 文件 / 目录操作

ExtendScript 侧只用老 API（CEP 的 Node 版本跨版本不稳）：

```js
var f = new File(Folder.temp.fsName + "/x.json");  f.open("w"); f.write(text); f.close();
var d = new Folder(path); d.create();              // 建目录
```

**中文路径**：ExtendScript 里 `File`/`Folder` 直接吃中文没问题；出问题的是前端 `<img src>` 那条链（见 §9 的「中文 / 空格路径」那条）。

### 7.7 写完自查

- [ ] 函数名 `mm_<域>_<动作>`，已登记进 `CORE_FUNCS`
- [ ] 能力行 `gate: 'core'` + `channel: 'direct'`
- [ ] 前置用约定值（`no-doc` 等），不用抛错
- [ ] 真异常走 `mm_safe`（有日志）
- [ ] 返回值形状与 `spec.parse` 匹配
- [ ] 写操作自己包 `suspendHistory`
- [ ] 没有重复实现 vendor 已有的函数

---

### 7.8 不进能力表的 6 个直调（`callDirect` + 机器闸）

**两条判据，第二条更硬。**

**判据一：进表就得给公共解析器开一个只有它在用的口子。**

| 函数 | jsx | 那个「独有口子」是什么 |
|---|---|---|
| `font.checkFontUsable` | `ys_checkUseFont` | `err===1` 要带宿主 `msg`，且**信封认不出时按可用处理**（不折失败）—— 现有解析器都是「失败就失败」 |
| `style.saveLayerStyle` | `ys_AddStyle` | `err===1` 折 `PS_ERROR`，而 `hostRejected` 固定折 `VALIDATION` |
| `diag.diagVendor` | `mm_diag_vendor` | 门失败要区分「探测本身失败 / 门未就绪」，执行器的门失败只有一种形状，`parse` 拿不到 `probeFailure` |

**判据二：它是不是「对外动作」。**

| 函数 | jsx | 为什么不算对外动作 |
|---|---|---|
| `env.injectEnv` | `Sys_setSystemEnvInfo` | **是门的前置** —— 进表就是**死锁**：`callCapability` 要先 `ensurePsReady()`，而 `ensurePsReady` 的 `pending` 正是那个还在等 `injectEnv` 返回的 `load()` |
| `layer.getLayerState` | `mm_layer_getState` | **域内基础设施**：`requireLayerKind` 的输入，页面/命令从不直接触发它 |
| `layer.getSelectionCount` | `mm_layer_getSelection` | 同上：`requireSelection` 的输入 |

**为什么判据二更硬 —— 一个真踩过的教训（2026-10-31）**

那两个 `layer` 查询一度被我收进表（理由是「解析只是缺个具名解析器」）。结果立刻出现**运行时循环依赖**：

```
capabilities.ts → layer.ts      （表要 requireSelection 做 spec.require）
layer.ts        → capabilities.ts（要 CAP.layerState 才能 callCapability）
```

我先按「把 spec 挪进 layer.ts」解掉了环 —— 但那是**拆环不改职责**：`layer` 仍然是「能力 + 前置判断提供者」双角色，只是依赖方向被摆平了。

**真正的病**：它们是域内查询，不是对外动作。按职责退回 `callDirect` 之后，`layer` 不再 import 表，环自然消失，且**表里的每一项都真的是「用户能触发的动作」**。

> **判据提炼**：
> 1. 「解析形状特殊」不是不进表的理由 —— 加一个域内具名解析器就解决（`layer.layerStateRaw` / `layer.selectionCountRaw` 就是，它们**不进 `raw.ts` 的公共清单**）。
> 2. 「它在域内被别的函数消费」才是 —— 进表必然让那个域反向依赖表，**环是症状，职责错位才是病**。
>
> 环由 `npm run check:cycles` 硬卡（运行时环必须 0；仅类型环只报不拦，因为 `import type` 编译期擦除、类型互相引用是常态）。

它们**都走 `callDirect`**（`capability.ts:181`），只封「门 → 函数存在性 → 调用」三步，解析自己写：

```ts
export async function callDirect(
  fn: string,
  args: unknown[] = [],
  options: { gate: Gate; timeout?: number; silent?: boolean } = { gate: 'core' }
): Promise<Result<string>>
```

**为什么收这一段**：门 + `funcMissing` 这两步以前是各处手抄的，而且抄得不一样 —— 当时 4 处里有 3 处（`checkFontUsable` / `getLayerState` / `saveLayerStyle`）**漏了 `funcMissing`**，缺函数时报 `EvalScript error.`（`PS_ERROR`）而不是 `PS_UNREADY` + `detail: fn:xxx`，排查时会以为是脚本崩了。收进 `callDirect` 之后全部获得同一条失败语义；`getLayerState` 后来干脆进了表（§7.8 末尾）。

**闸在 `npm run check:jsx`**（`tools/check-jsx-entry.mjs`）：扫 `src/core/ps/*.ts` 里所有**以字面量名字**调 `callJsx` / `callDirect` 的地方，名字必须在上面的白名单里；**白名单多一个少一个都红**（多了 = 闸比现实宽，等于失效）。

想加第 5 个时只有两条路：写成能力表一行（首选），或者同时改脚本白名单 + `capability.ts` 文件头那张表。

---

## 8. 解析器怎么选（`core/ps/raw.ts`）

| 解析器 | 什么时候用 | 判据 |
|---|---|---|
| `lenientVoid(文案)` | 只关心成败的写操作 | `''` / `'undefined'` / `'0'` / `'1'` / `{err:0}` / `{code:'OK'}` 都算成功；`{err:N≠0}` 算宿主拒绝 |
| `strictPayload({ whenFalse, whenFailed, accept })` | 返回 `{err, data}` 且要校验字段 | `false` → `VALIDATION`（前提不满足）；`err===1` → `hostRejected`（`VALIDATION`，句子优先宿主 `msg`）；`accept(data)` 返 `null` → **`CORRUPT`**（`malformed`，detail 给字段路径 + 原文前 120 字） |
| `strictData(文案)` | 只要 `data`，不要字段校验 | `err≠0` 当失败，其余交 `data` |
| `passthrough` | 返回结构**未实测**，原样交出 | `(raw) => ok(raw)`。按 JSON 解析会把裸路径判成坏数据时用它；**结构一旦实测就换成具名解析器 —— 它是缺口，不是常态**（`raw.ts:201`） |
| `sentinelJson` | jsx 返回的是哨兵字符串（`'ok'` / `'no-doc'`） | 先折哨兵再解析 |

**这 5 个就是全部。** 表里配不上这 5 个的时候，**不要往 `raw.ts` 加第 6 个** —— 那会让每个后来者多认一个他一辈子用不上的名字。正确做法是**写在你自己的域模块里**（`Parser<T>` 是个类型，不挑位置）：

```ts
// core/ps/layer.ts 末尾 —— 只服务 CAP.layerState 一个能力
export function layerStateRaw(raw: string): Result<{ kind: string; name: string }> { … }
export function selectionCountRaw(raw: string): Result<number> { … }
```

判据：**`raw.ts` 只放「≥2 个能力会用」或「纯结构工具」；一个能力专用的，就近放在它的域模块。**
（反例：`parseFontFamily` / `parseSystemFontList` 也是**单消费者**，历史上混进了 `raw.ts` —— 属既有债，不是本指南推荐的写法。）

**字段校验写在 `accept` 里，不写在薄函数里** —— 否则同一件事有两个判据（薄函数判一次、parse 判一次）。

```ts
/** 照 fontsOf 的写法：只判结构、不判语义 */
function addedTemplateOf(data: unknown): AddedTemplate | null {
  if (!isRecord(data)) return null;
  const { id, name, ext, width, height } = data;
  if (typeof id !== 'string' || !id) return null;
  if (typeof name !== 'string' || !name) return null;
  if (typeof ext !== 'string' || !ext) return null;
  if (typeof width !== 'number' || !Number.isFinite(width)) return null;
  if (typeof height !== 'number' || !Number.isFinite(height)) return null;
  return { id, name, ext, width, height };
}
```

---

## 9. 十个坑（都是真踩过的）

1. **对象参数不会自动变对象** —— `toJsxArg` 会把它 `JSON.stringify` 成文本，jsx 侧收到的是**字符串**（§3）。官方函数按自己的格式解，格式对不上时**抛异常或静默不生效**。
2. **`undefined` 参数会被拒** —— `callJsx` 主动抛 `jsx 参数第 N 个是 undefined`，空值给 `''`。
3. **函数名写错不静默** —— `funcMissing` 查的是探测结果里的 `missing` 清单（`init.ts:317`），命中就报 `PS_UNREADY` + `detail: fn:xxx`。**忘了登记 `VENDOR_FUNCS`** 则 `init` 根本不探这个名字 ⇒ 它不在 `missing` 里 ⇒ 门是绿的、调用直接落到 `EvalScript error.`（`PS_ERROR`），排查方向会跑偏。这就是第 4 步对账存在的理由。
4. **`dispatch` 通道超时只有 30s** —— 例外要在能力行标 `longTask: true`（`capability.ts:93`），`capability.test` 断言「全仓只许一个，且必须是 `callAction`」。**例外跟着能力走，不在测试里维护名字清单**（以前是两份真相）。
5. **超时不代表 PS 没在执行** —— 超时只是队列放行（`bridge.ts:80`，定时器在 `:73`），大 PSD 应用可能还在跑。
6. **`evalScript` 是串行队列** —— 一次一条，别指望并发；两个写操作不会交错，但也别在循环里逐条发（几百次会慢，改成 jsx 内部循环）。
7. **`EvalScript error.` 拿不到真实异常** —— 所以 `callJsx` 才包了那层 `try/catch`（`bridge.ts:133` 的注释写明）。
8. **中文/空格路径**：jsx 侧 `File`/`Folder` 没问题；**前端 `<img src>` 那条链**必须逐段 `encodeURIComponent`（`core/paths.userAssetUrl` 已统一）。
9. **不要在薄函数里再判一次返回结构** —— 严格度归 `spec.parse`，写两处就是两套判据。
10. **不要建第三个通道文件** —— 旧的 `vendor.ts` 已删（它只是通道的薄封装 = 死代码）。通道只有 `direct` / `dispatch` 两种，实现在 `toWire` 一处。

---

## 10. 一页速查

```
想调官方函数？
  → capabilities.ts 加一行（fn: '官方函数名'，gate:'vendor'，channel 看要不要历史组）
  → init.ts 的 VENDOR_FUNCS 加这个名字
  → core/ps/<域>.ts 写两行薄函数
  → init.test 对账自动兜住
  → 真机点一次

想自己写？
  → jsx/main.jsx 加 mm_<域>_<动作>，用 mm_safe 包
  → 前置用 'no-doc' 这类约定值，真异常才抛
  → 写操作自己 suspendHistory
  → capabilities.ts 加一行（gate:'core'，channel 只能 direct）
  → init.ts 的 CORE_FUNCS 加名字

返回形状？
  只关心成败   → lenientVoid
  要字段校验   → strictPayload（校验写 accept）
  只要 data     → strictData
  结构未实测   → passthrough
  都对不上      → 写在你自己的域模块里（别加进 raw.ts）
```
