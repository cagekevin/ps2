# PS 通道与数据契约（事实备忘）

> 这份文件只记**事实**，不记规矩。规矩在 `CONVENTIONS.md`，流程在 `GOVERNANCE.md`。
>
> 来源：2026-10-27 逐条真机验证 + 对照原版 `app.v4.js` / `cep-events.js` / `transport.ts` 与色板面板明文 jsx。
> 每条都写明「代码在哪」和「写错会怎样」，改代码前先看这里，别按直觉改。

---

## 一、三条通道，一张图

```
颜色 / 形状填充 / 线框色 / 前景色
  commands/style → core/ps/style → callJsx('mm_style_*')          ← 自有 jsx，移植版
                                  jsx/main.jsx 按图层类型分四路

渐变 / 图层样式
  commands/style → core/ps/style → callJsx('ps_onJsx', [{f, arr, n}])  ← vendor 调度

字体
  commands/style → core/ps/font  → callJsx('ys_checkUseFont' / 'ys_useFont')  ← vendor 直调
                                  ↑ 参数先 encodeText
```

判定方法：**看原版前端用的是 `jsxHistory` 还是 `jsx`，不看函数名是不是 `ys_` 开头。**

| 原版前端 | 实际发出 | 本项目用在 |
|---|---|---|
| `jsxHistory(fn, args, label)` | `ps_onJsx('{"f":fn,"arr":args,"n":label}')` | 渐变、图层样式 |
| `jsx` / `jsxWrite` | `fn(args)` 直接调 | 字体 |

代码：`core/ps/capability.ts` 的 `toWire`（调度 / 直调的唯一实现），逐条通道写在各能力的 `channel` 字段（`core/ps/capabilities.ts`）。

---

## 二、参数序列化：对象传过去是**字符串**

`src/core/cep/bridge.ts:107` 的 `toJsxArg`：

```ts
数字 / 布尔 → 裸传（String(value)）
字符串 / 对象 → 先转成文本，再用**单引号**包裹
对象 → JSON.stringify 之后当字符串发
```

实际发出的两种形态：

```js
mm_style_applyShapeFill('{"name":"未命名","color":{...}}')   // ✓ 字符串
mm_style_applyShapeFill({"name":"未命名","color":{...}})     // ✗ 对象字面量
```

**为什么不能传对象**：官方 jsx 内部按字符串处理（`.replace` / `JSON.parse`），拿到对象直接抛异常，表现就是 `EvalScript error.`。这条曾经绕了四轮才定位，不要「优化」成传对象。

配套三条：

1. 转义顺序不能反：先 `\\` 再 `\'`（`bridge.ts:111`）。
2. 参数里有 `undefined` 直接抛错并指出第几个（`bridge.ts:133`）。否则 `JSON.stringify(undefined)` 返回 `undefined`，接着 `.replace` 报 `TypeError`，把「参数漏传」伪装成编译器内部错误。
3. `$.evalFile` 必须**顶层**执行（`loadJsx` 就是单条语句）。但**函数调用可以包 IIFE**——`callJsx` 故意包了，为了用 `catch` 拿到真实异常信息（`bridge.ts:140`）。两者不矛盾，别混。

---

## 三、返回值约定

`callJsx` 返回全仓唯一的 `Result<string>`（见 `types/result.ts`）：

| 层 | 返回 | 含义 |
|---|---|---|
| 宿主层 | `failWithDetail('TIMEOUT'/'PS_ERROR', ...)` | 超时、脚本异常 |
| 宿主层 | `failWithDetail('PS_ERROR', <jsx 消息>)` | jsx 内部异常（`error:` 前缀，bridge 解析） |
| 宿主层 | `ok(raw)` | 拿到了返回值，约定值语义由 `unwrapRaw` 判 |

`raw` 的约定值，**唯一解析处在 `core/ps/raw.ts` 的 `RAW_FAILURES` 表**，能力函数不许手写字符串比较：

| raw | 折成 | 处理 |
|---|---|---|
| `'ok'` | 成功 | 继续用 raw |
| `'no-doc'` | `PS_NO_DOC` | 提示用户 |
| `'not-shape'` | `PS_WRONG_LAYER` | 提示用户 |
| `'skipped'` | `PS_SKIPPED` | 提示「自动填充已关闭」 |
| `'-1'` | `PS_REJECTED` | 提示「PS 拒绝执行」（原版判定 `r != -1` 为成功） |
| `'unknown:<kind>'` | 成功（不是失败码） | 图层类型白名单兜成 `unknown` |
| `'1'` | 成功 | 成功（原版判定 `r != -1`） |

代码：`bridge.ts`（callJsx）、`core/ps/raw.ts`（unwrapRaw）。

---

## 四、evalScript 是串行队列，且有超时

`bridge.ts:52-96`。

- ExtendScript 单线程，**并发发多条时返回顺序不保证**：快速连点 3 个色块，最后生效的可能不是最后点的那个。
- 实现是 Promise 链先进先出；某条失败不影响后续（`evalQueue` 永远 resolve）。
- 超时：默认 30s，写操作 60s，系统字体表 300s（`LONG_TIMEOUT`）。**超时后队列放行**，但 PS 侧可能仍在执行——日志会写「队列放行」，看到这句不要以为已经取消。
- 文本属性（§11.3）：写操作（`zt_*` / `layer_font_*` / `cy_distributedByPitch`）一律 60s，读操作（`zt_getFontSimpleInfo` / `zt_getCurrentFontInfo` / `zt_getCurrentText`）走默认 30s。`zt_setFontColor` 会拉起系统取色器、用户可能停留很久，超时只放行队列、不取消 PS 侧，所以失败提示后要允许用户重试。
- 轮询类调用传 `{ silent: true }`，不写 info 日志（`core/ps/layer.ts:40`）。

---

## 五、加载顺序与能力分级

`src/core/ps/init.ts`，顺序不能改：

```
1. $.evalFile jsx/main.jsx          → 探 mm_*（必需）
2. $.evalFile jsx/vendor.jsx        → 探 ys_*（可缺失）
3. Sys_setSystemEnvInfo 注入环境变量  ← 漏了第 3 步，ys_* 必炸
4. 全部成功才标记 vendor 可用
```

- 能力分两档：`core`（自有）失败 = 全部不可用；`vendor` 失败 = 只有应用类不可用，读图层照常。
- `VENDOR_FUNCS` 是**实际在用**的函数清单（2026-10-28 起 **62 项**，`core/ps/init.test.ts` 会校验「能力表里每个 vendor 能力都在清单里」；`CORE_FUNCS` 同理，7 项）：
  通道 1（`ps_onJsx`）+ 渐变 1（`ys_useGradient`）+ 图层样式 1（`ps_ysBtnUseStyle`）+ 环境 1（`Sys_setSystemEnvInfo`）
  + 系统字体 2（`ztgl_initSystemList` / `ztgl_setFont`）+ 字体检查/应用/复制 3（`ys_checkUseFont` / `ys_useFont` / `ys_getFontInfo`）
  + 工具切换 1（`Tool_set`，样式页快速吸色）
  + 文本属性 25（`src/core/ps/text.ts`，逐个列在 §11.3 表里；`zt_getTypeUnits` 已取消、`zt_changeTextBranchMerge` 已移除）
  + 常用页 25（`src/core/ps/common-use.ts` 的 26 条里 `cy_distributedByPitch` 与文本属性共用，已在上一行计过）。
- 删掉任何 jsx 函数，必须同步改 `VENDOR_FUNCS` / core 探测列表，否则会出现「函数没了 → 能力永远不可用」的假故障（已发生过一次）。
- **探测分两级，别再往「必需」里加**：`CORE_REQUIRED` 只有 `mm_layer_getState`、`VENDOR_REQUIRED` 只有 `ps_onJsx` + `Sys_setSystemEnvInfo`——缺了它们整门确实没意义。其余 60 多项缺了只记进 `PsCapability.missing`，由执行器按 `spec.fn` 报 `PS_UNREADY` + `detail: fn:<名字>`，**不会牵连其它页面**。以前「缺一个整门变红」的坑（`Tool_set` / `mm_diag_vendor` 那种）不会再出现。

---

## 六、环境变量：不注入就是「undefined 不是对象」

`src/core/ps/env.ts`，15 个字段，**字段名不能改**（jsx 按 key 取值）：

```ts
VUE_APP_USER_DIR: '/SheJiZhuLi'   // 最关键：jsx 用它拼数据路径
VUE_APP_BASE_SERVER: 'https://zhuli.gaoding.com'
VUE_APP_UMS: 'https://ums.gaoding.com'
VUE_APP_BASE_CEP: 'https://cepapp.pszhuli.com'
VUE_APP_BASE_SYNC_SERVER: 'https://syncserver.pszhuli.com'
VUE_APP_WEBSITE_HOST: 'https://www.pszhuli.com'
VUE_APP_CEP_VERSION / NAME / PUB_TIME / PUB_TIMESTAMP / CURRENTMODE / ENVNAME
NODE_ENV / BASE_URL
```

调用方式：`callJsx('Sys_setSystemEnvInfo', [PS_ENV])`。成功返回 `{"err":0,"data":true}`。

注意：注入的是**前端常量**，不是「读用户配置」。所以它和「不读旧目录」不冲突——`VUE_APP_USER_DIR` 只是告诉 jsx「数据在 `%APPDATA%\SheJiZhuLi`」。

---

## 七、文件 IO 只有一条路：Node fs

`src/core/cep/node.ts` + `src/core/storage/index.ts`。

| 做法 | 结果 |
|---|---|
| `nodeRequire('fs')`（`window.require` / `cep_node.require`） | ✓ 唯一可用 |
| `window.cep.fs.readFile` | ✗ CEP 12 里读不到普通文件路径 |
| `window.cep.fs.showOpenDialogEx` | ✓ 只用于文件对话框 |

`getSystemPath` 的返回值是 **URI**（`file:///C:/...`），Node fs 读不了，必须过 `toLocalPath`（`bridge.ts:175`：decodeURI → 转正斜杠 → 剥 `file://` → 去尾斜杠 → 补 macOS 前导斜杠）。

数据双根（`storage/index.ts:21`）：

| root | 路径 | 用途 |
|---|---|---|
| `data` | `%APPDATA%\Maomao` | 本工具自己的数据（prefs 等） |
| `legacy` | `%APPDATA%\SheJiZhuLi` | 官方已有数据（样式库），只读兼容 |

写操作只有 `writeTextAtomic`：`.bak` 备份 + 原子替换 + 按文件串行（`storage/index.ts:125`）。`removeFile` 对「本来就不存在」返回成功。

---

## 八、资源 URL：两个必踩的坑

`src/core/paths/index.ts`，规则已写进 `CONVENTIONS.md` §5.1，这里只记原因：

1. **Windows 也必须 `file:///`**。Chromium 把裸的 `C:/...` 当相对路径解析 → 整片破图。三段斜杠是因为后面接 `C:/`，盘符前没有斜杠。
2. **必须拼 `SheJiZhuLi` 这一层**。`getSystemPath('userData')` 只到 `AppData\Roaming`，官方数据在 `Roaming\SheJiZhuLi\`，少一层所有 `<img>` 都 404。

官方资源目录（实测）：

```
%APPDATA%\SheJiZhuLi\kuStyle\<itemId>.png      样式项缩略图
%APPDATA%\SheJiZhuLi\kuStyle\<groupId>.psd     样式分组 PSD（ps_ysBtnUseStyle 靠它取样式）
%APPDATA%\SheJiZhuLi\Gradient\<file>           渐变图（大写 G，注意不是 kuGradient）
```

---

## 九、图层类型：`layer.kind` 返回的是**枚举名字符串**

`jsx/main.jsx:36` 的 `mm_layer_kindOf`：

```js
String(layer.kind)  →  "LayerKind.SOLIDFILL" / "LayerKind.TEXT" / ...
用 indexOf 匹配，不要和数值比，也不要全等
```

判定顺序：`TEXT` → `SOLIDFILL`（形状）→ `SMARTOBJECT` → `GROUP` → `NORMAL` → 其它返回 `unknown:<原值>`。

前端 `VALID_KINDS` 白名单再兜一层（`core/ps/layer.ts:12`），认不出的一律 `unknown`，不抛错。

**选中数量是另一个 jsx**：`mm_layer_getSelection` 返回选中数（`'3'`），没有文档返回 `no-doc`。取数走 ActionManager 的 `targetLayers`（`list.count`），**不是** `app.activeDocument.activeLayers` —— 后者在部分 PS 版本上不存在（§10.2）。2026-10-30 真机已确认新实现返回 `'1'` 且不再抛「undefined 不是对象」。不并进 `mm_layer_getState` 的理由：后者被 `layer-watcher` 每 800ms 调用，改它的返回协议一旦新旧 jsx 混用就会静默解析错；独立函数缺失时探测能直接发现（`init.ts` 的 core 探针已含它）。

---

## 十、颜色应用：只有 vendor 一条路

`core/ps/style.ts` 的 `applyStyleColor` → `ps_onJsx('{"f":"ys_useStyleColor","arr":[色值],"n":"智能填充颜色"}')`。

**单选、多选是同一个调用**：遍历所有选中图层在 vendor（`jsx/vendor.jsx`，加密 jsxbin）内部完成。官方 `app.v4.js:17894-17900` 也只发一项交给它；「色板工具本地版」（工作区外，真机验证过）走的就是这条路。

**不能照抄色板面板的明文 jsx**（`%APPDATA%\fz.FengZi3Hao\jsx\main.jsx`）：它
`iTuCengGeShu = sb_DL_HuoQuDangQianTuCengShu(); if (iTuCengGeShu == 1)` 才上色（`main.jsx:32-33`），
多选只设前景色。抄过来就是「界面提示成功、图层没变」，而且前端拿不到「没生效」的信号。

参数形状：**扁平**色值 `{ hex, c, m, y, k }` + **顶层** `isFill: true`，不是库项
（`{ name, color: {...} }` 是库文件里的形状，`commands/style.toAppColor` 负责拍平）。
只给 hex 的调用方（`applyColorByHex`）用 `domain/image-color` 的 `hexToCmyk` 补齐 CMYK ——
与官方前端 `toCMYK()` 是同一份公式。

真机（2026-10-30）：对智能对象调用返回 `1`。**「返回 1 之后图层到底变了没有」没有截图证据**，仍按 UNVERIFIED 看待。

`cyAutoFillColor` 是**主面板前端**的分支开关
（`if (cyAutoFillColor) ys_useStyleColor(...) else ys_setForegroundColor(...)`），
vendor 内部不读它：我们直接发调度调用，不受它影响。

vendor 未加载时颜色应用不可用（`PS_UNREADY` + `detail: fn:ys_useStyleColor`），**不留本地降级实现**。

**适用图层（2026-10-28 真机确认）**：

| 能力 | 适用图层 | 前置 |
|---|---|---|
| `ys_useStyleColor`（点色块） | 任意（vendor 内部按图层类型处理） | 不判 |
| `mm_style_applyShapeFill`（ctrl+点）/ `mm_style_applyBorderColor`（shift+点） | **只对形状**，jsx 对其它返回 `not-shape` | `requireShapeLayer` |
| `ys_useGradient`（应用渐变） | 任意，**含文字图层** | 不判 |
| `ps_ysBtnUseStyle`（应用图层样式） | 任意，**含文字图层** | 不判 |

后两条如果加图层前置，会把正常操作挡住——所以表里明确不加，`capability.test.ts` 有用例钉住。

### 10.1 「多图层上色」到底是谁做的（2026-10-28 查清）

官方色板工具**能**同时给多个图层上色，但**不是色板面板自己的 jsx 做的**：

| 路 | 链路 | 作用 |
|---|---|---|
| ① | 色板面板点色块 → CEP 事件 `com.fengzi.event.seban`（`type:'setColor'`）→ 主面板 `app.v4.js` 的 `handleSeBanEvent` → 开关 `cyAutoFillColor` 开 → `ys_useStyleColor(item, isFill=true)` | **多图层上色在这里**（vendor.jsx，加密，读不到实现） |
| ② | 色板面板自己的 jsx `sb_cy_SheZhiQianJingSe`（`%APPDATA%\fz.FengZi3Hao\jsx\main.jsx:32-33`） | **只处理单选**：`iTuCengGeShu == 1` 才上色，多选只设前景色 |

所以上面第 2 条「多选不处理」说的是**色板面板 jsx**的行为；整条官方链路的「多选上色」能力来自主面板智能填充。
本仓走的是移植版（②路），要支持多选是**自己新增**，不是抄官方色板面板能抄到的。

官方色板面板 jsx 里唯一的多图层实现在形状动作上（`sb_SheZhiXingZhuang` → `sb_DL_HuoQuDangQianTuCengID` /
`sb_DL_GenJuXuHaoQuXiaoTuCeng` / `sb_DL_GenJuXuHaoDuoXuanTuCeng`，`main.jsx:526-609`）：
**用 itemIndex + `slct` 动作控制「当前只有一个图层被选中」，不把图层对象取出来**。要自己实现多图层，这是能抄的部分。

### 10.2 取选中图层：哪些 API 在本机 PS 上不可用

本机（PS 21.x，CMYK 文档）逐个试过：

| API | 结果 |
|---|---|
| `app.activeDocument.activeLayers.length` | **属性不存在**，读 `.length` 抛错（版本差异，不是通用写法）。2026-10-30 在诊断页「执行代码」里跑 `typeof app.activeDocument.activeLayers` 仍是 `undefined`，`mm_layer_getSelection` 据此改成下面这条 |
| `targetLayers`（`getd` + `Prpr/targetLayers`）→ `list.count` | ✅ 与实际选中数一致，`mm_layer_getSelection` 用的就是它 |
| 引用上 `getObjectValue(stringIDToTypeID('layer'))` | ❌ 取不到图层对象 |
| 引用上 `getIdentifier(charIDToTypeID('Lyr '))` | ❌ 取不到 id |
| 引用上 `getIndex(charIDToTypeID('Lyr '))` | ✅ 返回数字 |
| `slct` 动作直接带 targetLayers 引用（`putReference('null', ref)`） | ❌ 不生效，活动层不变 |

`getIndex('Lyr ')` 的语义：根层级选中时 = `itemIndex - 1`（官方 `+1` 公式成立）；
**组内选中时是全文档摊平序号**（实测 21 / 26 / 27，组内容不下 21 层）。官方那套
`putIndex('Lyr ', itemIndex + bgOffset)` 是「当前活动图层组内」的位置，组内选中是否成立**未验证**。

另：**图层名不能当标识**——实测 4 个选中层同名。

### 10.3 上色动作都作用于活动层；颜色对象按文档模式构造；颜色叠加盖住内容颜色

| 事实 | 说明 |
|---|---|
| 填充 `Fl  `、形状样式 `contentLayer`/`Trgt`、图层样式 `Lefx` | 全部作用于**活动层** ⇒ 批量上色的循环体必须保证「目标层 = 活动层」 |
| `SolidColor` 要按文档模式构造 | CMYK 文档只填 `cmyk.*`，否则只填 `rgb.hexValue`。rgb+cmyk 一起塞，在 CMYK 文档里会让赋值抛错（官方 `main.jsx:11-22`、本仓 `mm_style_parseColor` 都这么写） |
| 图层样式里的**颜色叠加**会盖住内容颜色 | 有它时改字色/填充色看不见变化；**投影不盖内容颜色**（只有投影的文字层改字色是看得见的）。渐变/图案叠加不能替换成纯色 |
| 批量写操作要包撤销组 | 不包就是每层一条历史记录，只能一层一层撤 |

完整理解文档（含逐条验证方法与判据）：`色板工具本地版/docs/上色逻辑.md`（工作区外，与该面板代码同目录）。

### 10.4 vendor 可以整份复制到别的面板里直接用（2026-10-28 真机通过）

`jsx/vendor.jsx`（= `com.local.psz.panel.v5/lib/all.decrypted.js`，MD5 `c6ca05a0…`）**读不了但能执行**：
头部是 `@JSXBIN@ES@2.0@…`，明文 grep `ys_` 前缀函数名命中 0；把它 `$.evalFile` 进任意面板后，
`typeof ps_onJsx` = `function`，`Sys_setSystemEnvInfo` 返回 `{"err":0,"data":true}`，
`ps_onJsx('{"f":"ys_useStyleColor","arr":[…],"n":"智能填充颜色"}')` 返回 `1` 且**所有选中图层都上色**。

⇒ **不需要主面板也能用官方能力**：自己转发同一个调度调用即可，不必等主面板收事件。
官方链路是「色板面板 → 事件 → 主面板 → `ps_onJsx` → `ys_useStyleColor`」，
没有主面板时把中间那一跳去掉（**不要补发事件**：主面板开着会再上一次同样的色）。

加载顺序不能改（与 `core/ps/init.ts` 一致）：`evalFile main.jsx` → `evalFile vendor.jsx`
→ `Sys_setSystemEnvInfo(PS_ENV)` → 探 `typeof ps_onJsx`。环境变量少一个就报「undefined 不是对象」。

参数形状：`ys_useStyleColor` 收**扁平颜色对象** `{hex,c,m,y,k}` + **顶层** `isFill:true`
（官方主面板 `app.v4.js:17894-17900` 就是这么传的）；线框色对应 `ys_setBorderColor`。

---

## 十一、字体：先检查，再应用，参数要编码

`src/core/ps/font.ts`。

```
1. encodeText(JSON.stringify(item))
2. ys_checkUseFont(payload)   → { err: 1 } 表示字体缺失，必须中止
3. ys_useFont(payload)        → { err: 1 } 表示不可用
```

`encodeText`（`src/core/cep/text-codec.ts`，原版 `Xv`）不是加密，是为了避开 evalScript 字符串里的引号和中文转义：

```
第 0 个字符：码点 + 字符串长度
第 i 个字符：码点 + 第 i-1 个字符的码点
最后 escape() 成 %XX
```

只给字体用，不要套到其它调用上。解码（原版 `qv`）目前没有调用方，需要时照 `app` 的 `domain/translate.ts:52-60` 抄，别自己推。

### 11.1 系统字体列表（字体管理页，另一条直调）

| 调用 | 通道 | 超时 | 参数 / 返回 |
|---|---|---|---|
| `ztgl_initSystemList` | 直调 `jsx()` | `LONG_TIMEOUT` 300s | 无参；返回字体数组，或 `"ok"` 哨兵（数据写 `SysFont2.json` 的 `{ arr: [...] }`） |
| `ztgl_setFont` | 直调 `jsx()` | `WRITE_TIMEOUT` 60s | `(hjm, mz, zz)` 三个**明文**字符串，**不要 `encodeText`**；`{err:1}` 不止字体缺失（没选中文字图层时宿主给 `msg:"请选择文字图层"`）。**写之前必须先判「当前是文字图层」**（`core/ps/layer.requireTextLayer`）：否则 PS 直接抛「命令"设置"当前不可用」，那句话会被当成失败原因 |

与 §十一 开头那条（`ys_checkUseFont` / `ys_useFont`）的区别：`ys_*` 服务**样式库字体项**，参数要编码；`ztgl_*` 服务**系统字体列表**。两条通道不要合并。

### 11.2 err 信封的判据（2026-10-27 收紧）

`parseErrEnvelope` 现在返回 `Result<number>`，**没有 `null` 通道**：

- 返回不是 JSON、或不是 `{ err: number }` → `CORRUPT`（detail 带原始值）
- 写操作（`ys_useFont` / `ztgl_setFont` / `ys_AddStyle`）遇到 `CORRUPT` 直接失败 —— 原来「解析不出来 = 当成功」是**假成功**，字体没换却提示成功
- 读操作（`ys_checkUseFont`）保留「信封不成立按可用处理」，因为它只是探测，不该阻断正常流程（UNVERIFIED）

真机必须确认这几个函数返回的就是 `{err:number}`；若 PS 返回别的形状，这里会从「假成功」变成「真失败」，属有意改动。

这两个函数在 `vendor.jsx` 里已经存在，**不写 `jsx/main.jsx` 镜像**——`GOVERNANCE.md` §二 #3 的例外，理由是能力来自官方副本而非自有实现。

### 11.3 文本属性（字体面板页，第三条直调通道）

清单共 **29 个在用 jsx 函数**：新增 26（3 读 + 23 写），复用 3（`ys_getFontInfo` / `ys_checkUseFont` / `ys_useFont`）。
`zt_getTypeUnits` 于 2026-10-27 取消（面板不显示单位后缀，读者不需要知道单位），表格保留该行并标注，便于追溯。
**全部 `UNVERIFIED`**：返回结构没有真机验证过。`core/ps/text.ts` 的读函数只把 raw 交给 `domain` 宽松归一，写函数只认 `{err:number}` 信封与 `raw.ts` 的约定值表——**不许在能力函数里写字符串比较，也不许声称「已验证」**。

| # | jsx | 参数 | 语义 |
|---|---|---|---|
| 1 | `zt_getFontSimpleInfo` | 无 | 当前文字图层属性快照；`err === 0` 才覆盖面板，否则保留旧值并提示。**前提：当前图层是文字图层**——非文字图层上 PS 不返回 `{err:1}`，而是直接抛「命令"获取"当前不可用」（`core/ps/text` 先判 `mm_layer_getState` 再调，返回码 `PS_WRONG_LAYER`，避免把这句报错当失败原因显示） |
| 2 | `zt_getCurrentFontInfo` | 无 | `{ family? }`；字体快选「加当前图层」用 |
| 3 | `zt_getCurrentText` | 无 | `TranslateItem[]`；总字数超 1000 拦截 |
| 4 | ~~`zt_getTypeUnits`~~ | 无 | **已取消（2026-10-27）**：读出来只用于显示单位后缀，而面板不需要显示单位；`VENDOR_FUNCS` 已移除 |
| 5 | `zt_setFontName` | `[hjm, mz, zz]` | 换字面；`err === 1` **不止字体缺失**——没选中文字图层时宿主给 `{err:1, msg:"请选择文字图层"}`，原因取 `msg`（见下方第 3 条） |
| 6 | `layer_font_setFontSize` | `[size]` | 面板输入的字号 |
| 7 | `zt_setFontSize` | `[size]` | 层级字号（层级面板点一下） |
| 8 | `layer_font_setLeading` | `[leading]` | 行距 |
| 9 | `zt_setFontWordSpacing` | `[tracking]` | 字距 |
| 10 | `zt_setFontColor` | 无 | 拉起系统取色器，返回 `{ rgb: { r, g, b } }` |
| 11 | `zt_setFontAllCaps` | `[boolean]` | 全部大写 |
| 12 | `zt_setFontVision` | `['manual' \| 'opticalKern']` | 文字视觉调整 |
| 13 | `zt_setFauxItali` | `[boolean]` | 倾斜。**拼写照抄，不要改成 Italic** |
| 14 | `zt_setFontAddBold` | `[boolean]` | 加粗 |
| 15 | `zt_setFontJustified` | `[index]` | 段落对齐（属性面板 Ctrl+点击） |
| 16 | `zt_setTextAlignment` | `[index]` 或 `[index, shift]` | 点文本对齐；**第二参数不传时不能补 `false`** |
| 17 | `zt_setHorizontalCenters` | `[4]` | 水平居中分布（底部组一第 4 个） |
| 18 | `zt_verticalCenter` | `[5]` | 垂直平均分布（底部组三第 4 个） |
| 19 | `zt_setUpDownAlign` | `[index]` | 顶 / 中 / 底对齐 |
| 20 | `zt_setBackrgoudAlign` | `[3]` / `[4]` | 与背景水平 / 垂直对齐。**拼写照抄（Backrgoud）** |
| 21 | `zt_alignHorizontal` | 无 | 水平垂直居中对齐；只服务第二入口，本页不放按钮 |
| 22 | `cy_distributedByPitch` | `[axis, value, 2, filter]` | 按间距分布；axis `1` 水平 / `2` 垂直，第 3 个参数固定 `2` |
| 23 | ~~`zt_changeTextBranchMerge`~~ | — | **已移除**：真机一调就抛「没有这种元素」，是派发表 key 不是函数（见本节第 7 条） |
| 24 | `zt_textBranchMerge` | `[mode]` | 拆分/合并真正执行；`1` 分行 / `2` 分为单个 / `3` 合并 / `4` 合并为段落 |
| 25 | `zt_createButton` | `[{ type, isLine, padding }]` | 生成按钮；`type` 1 圆角 / 2 直角 |
| 26 | `zt_switchFontDirection` | 无 | 切换文本方向 |
| 27 | `zt_setTranslateText` | `[data, replace]` | 写回译文；`replace` 为真 = 覆盖原文 |
| 28 | `ys_getFontInfo` | 无 | 复制文字属性，复用 `core/ps/font.getFontInfo` |
| 29 | `ys_checkUseFont` | `[payload]` | 参数先 `encodeText`，复用 `core/ps/font.checkFontUsable` |
| 30 | `ys_useFont` | `[payload]` | 参数先 `encodeText`，复用 `core/ps/font.applyFont` |

判定与坑：

1. **通道**：这 27 个新函数里 26 个直调 `jsx()`（原版 `jsx` / `jsxWrite`），不要包 `ps_onJsx`；包错的表现是 `error:缺少必需值`。
   **例外是 `cy_distributedByPitch`**：原版在文本属性面板用的是 `jsxHistory`（`:1441105`），
   即调度通道；`core/ps/text.ts` 现在按直调实现，属已登记 P1（与常用页的同一函数两种通道并存，
   待真机确认 `ps_onJsx` 能调 `cy_*` 后统一成调度）。参数形态两处不同，见 §11.4 第 1 条。
2. **参数**：全部**明文**。只有表里 29 / 30 两个 `ys_*` 要 `encodeText`；给 `zt_*` 编码会写出乱码字体名或直接失败。
3. **err 信封（本组比 §11.2 宽松，是刻意的）**：`-1` 等约定值由 `core/ps/raw.ts` 的 `unwrapRaw` 表判定，能力函数不许自己比较字符串；能解析成 `{ err: number }` 时 `1` = 不满足前提，折 `VALIDATION`，**原因取信封里的 `msg`**（`raw.envelopeMessage`），宿主没给才用兜底文案——同一个 `1` 既可能是「请选择文字图层」也可能是字体缺失，写成一句笼统的「字体不可用」会让用户去重装本来装着的字体（2026-10-28 真机日志：`{"err":1,"msg":"请选择文字图层","code":0}`）；**解析不出 `err` 时按成功处理**（这些函数可能返回裸 `1` / 空串，结构没验过）。§11.2 对 `ys_useFont` / `ztgl_setFont` 那条「信封不成立直接失败」仍然有效，两者不要互相套用。UNVERIFIED：真机确认返回形状后，这里必须收紧成只认信封。

   **2026-10-28 真机补充（推翻上面「按成功处理」的适用范围）**：非文字图层上这批写函数既不给 `{err:1}`、也不抛「命令不可用」，而是**返回 `undefined`、什么都不做**（日志 `raw:"undefined"`，`zt_setTextAlignment` / `zt_setBackrgoudAlign` / `zt_createButton` 三条实证）。`lenientVoid` 会把 `undefined` 当成功——界面提示成功、图层没变。返回值本身**区分不了成功与空转**（文字图层上大概率也返回 `undefined`），所以这批能力一律在表里声明 `require: requireTextLayer`，由执行器第一步拦掉。
4. **`hostCode === 1` 只有一条处理**：折成 `VALIDATION`「字体不可用」→ 页面只 toast。**任何版本都不做「前往下载」**，不给外链、不弹确认框。
5. **两处原版拼写错误照抄**：`zt_setFauxItali`、`zt_setBackrgoudAlign`。改成「正确拼写」等于函数不存在。
6. **`zt_setFontColor` 无参**：返回值是取色结果，不是成功标志；用户在取色器里停留久，60s 超时后队列放行、PS 侧可能仍在执行，页面要给重试。
7. **`zt_changeTextBranchMerge` 已确认不是函数（2026-10-28 真机）**：`typeof` 是 function（探测能过），但一调就抛「没有这种元素」——它只是原版派发表的 key（`case 94` 转发到 `zt_textBranchMerge`）。已从能力表、`text.ts`、`VENDOR_FUNCS` 移除；`commands/font-set.split` 改为只调一次 `zt_textBranchMerge`。原版「先探一次再执行」的那步没有了——不能执行时 PS 自己会返回错误，`lenientVoid` 会把它变成失败，不会假成功。
8. **撤销组**：这几条是官方实现，撤销组在 vendor 内部（未验）。不要在前端再包一层 `suspendHistory`。
9. **批量**：本页全是单图层语义，不循环调用；`cy_distributedByPitch` 的批量在 jsx 内部完成。

### 11.4 常用页按钮（第四条直调 + 调度混合通道）

清单共 **26 个**（`04-常用` 页面）：v1 覆盖 11 个（对应 12 条命令，`cy_guideFunction` 一函数两用）
+ 只登记 2 个，其余 13 条排 v2。
**通道不能一刀切**——原版调用点写的是 `jsxHistory*` 就走 `ps_onJsx`，写的是 `jsx` / `jsxNoCheck` 就直调
（判断方法同 `CONVENTIONS` §4.7）。实现在 `core/ps/capability.ts` 的 `toWire`，逐条写在各能力的 `channel` 字段。

| # | jsx | 通道 | 参数 | 语义 | v1 |
|---|---|---|---|---|---|
| 1 | `cy_zoom` | 直调 `jsx` | `[倍数]`（`105` / `95`） | 放大 / 缩小 | ✅ |
| 2 | `cy_transformPosition` | 调度 `jsxHistory` | `[方向文本]` | 翻转 6 向：`左右 / 上下 / 左 / 右 / 下 / 上` | ✅ |
| 3 | `cy_locationTrade` | 调度 | `[]` | 位置对换 | ✅ |
| 4 | `cy_LayerReplace` | 调度 | `[]` | 元素替换（**大写 L**） | ✅ |
| 5 | `cy_exchangeLayerColor` | 调度 | `[]` | 图层颜色互换 | ✅ |
| 6 | `cy_correctRectangleBlur` | 调度 | `[]` | 修正边缘模糊（派发 key 是拼错的 `cy_coorectBlur`） | ✅ |
| 7 | `cy_swapWireframeFill` | 调度 | `[]` | 填充线框互换（**既是 key 也是函数名**，`case 36`） | ✅ |
| 8 | `cy_distributedByPitch` | 调度 | `[axis, gap, sortMode]` | 按间距分布（见下方「两个形态」） | ✅ |
| 9 | `cy_createSafeAreaGuide` | 调度 `jsxHistoryNoCheck` | `[宽度]` | 参考线：生成安全区 | ✅ |
| 10 | `cy_guideFunction` | 直调 `jsxNoCheck` | `[1 清除 / 2 切片]` | 参考线：清除 / 切片 | ✅ |
| 11 | `cy_openDirectory` | 直调 `jsxNoCheck` | **无参** | 打开所在目录 | ✅ |
| 12 | `cy_getImagePath` | 直调 | `[]` | 选图片（返结构未测） | 只登记 |
| 13 | `cy_getPsdForFolder` | 直调 | `[]` | 扫文件夹 PSD（jsx 自己弹选目录） | 只登记 |
| 14 | `cy_insertionImage` | 直调 | `[{path, bLink2, bDelete}]` | 嵌入图片 | v2 |
| 15 | `Layer_placedLayerRelinkToFile` | 直调 | `[path]` | 转链接智能对象 | v2 |
| 16 | `cy_embedMultipleImage` | 直调 | `[]` | 嵌入多图片 | v2 |
| 17 | `cy_smartToLinkSmartObject` | 调度 | `[]` | 转链接智能对象 | v2 |
| 18 | `cy_linkSmartObjectToSmartObject` | 调度 | `[]` | 转智能对象 | v2 |
| 19 | `cy_importMultipleImage` | 直调 | `[{path, toLinkObject}]` | 导入多图片 | v2 |
| 20 | `cy_optimizeDoc` | 直调 | `[配置]` | 优化文档 | v2 |
| 21 | `cy_batchOptimizeDoc` | 直调 | `[配置, 文件]` | 批量优化（循环在命令层） | v2 |
| 22 | `cy_customBuildTransform` | 调度 | 7 个平铺参数 | 自定义变换 | v2 |
| 23 | `cy_ExportImage` | 调度 `jsxHistoryNoCheck` | `[配置对象]` | 导出图片（**大写 E**） | v2 |
| 24 | `cy_BatchExportLayer` | 调度 `jsxHistoryNoCheck` | `[配置对象]` | 批量导出一级图层 | v2 |
| 25 | `cy_BatchExportSecondLayer` | 同上 | `[配置对象]` | 批量导出二级图层 | v2 |
| 26 | `cy_BacthExportPsdToImage` | 调度 | `[file, option]` | 单个 PSD 导图（**Bacth 是官方拼错**） | v2 |

**派发 key → 真实 jsx 函数**（不核这张表就会去调不存在的函数）：

| 派发 key | 真实 jsx 函数 | 依据 |
|---|---|---|
| `cy_embedImage` | `cy_insertionImage` | `case 28` |
| `cy_coorectBlur` | `cy_correctRectangleBlur` | `case 34` |
| `cy_exportImage` | `cy_ExportImage`（大写 E） | `case 40` |
| `cy_layerReplace` | `cy_LayerReplace`（大写 L） | `case 66` |
| `cy_useGride` | `cy_createSafeAreaGuide` | `case 59` |
| `cy_clearCutGuide` | `cy_guideFunction` | `case 61` |
| `cy_bacthExportPsdToImage` | `cy_BacthExportPsdToImage`（Bacth） | `case 48` |
| `cy_swapWireframeFill` | **同名**（函数，不是 key） | `case 36` |

四条判定与坑：

1. **`cy_distributedByPitch` 有两个形态，别合并**：
   常用页间距面板是 `[axis, gap, sortMode]`（`app.v4.js:1262654`，三参、无 filter）；
   文本属性面板是 `[axis, value, 2, filter]`（`:1441105`）。第 3 个参数一个是排序模式（1 按图层 / 2 按坐标），
   一个是固定的 `2`——看着像同一个东西，含义不同。`core/ps/text.distributeByPitch` 只服务文本面板。**两个形态的前置相同**：至少 2 个选中图层（`requireSelection(2)`），不要求文字图层——分布的对象是多个图层。同一条前置也挂在「位置对换」「图层颜色互换」上（这三个都是成对才有意义，单选时 PS 只回一句笼统的 `-1`）。
   **通道也相同（两处都是 `jsxHistory`）**：常用页这边走调度，文本面板那边目前是直调，
   属已登记的 P1（`text.ts` 与 §11.3 第 1 条的例外说明），真机后统一成调度。
2. **`gap` 是字符串**：原版把输入框原文（经 `ft.b` 补单位，如 `10px`）直接传下去。
   我方**不补单位**——`appUnit` 属设置页的键，常用页 repo 只读 17 个 `cy*` 键；
   真机若分布不生效，先把值改成 `10px` 再验（UNVERIFIED）。
3. **`jsx` 与 `jsxNoCheck` 的差别是「先探选中图层」**：`jsx(fn,args)` 会先跑 `Layer_isSelectLayer()`，
   返回 `0` / `"false"` 就不执行。我方两条都直调，不做这次预探，
   没选中图层时的表现退化成一个普通的失败码（`-1` → `PS_REJECTED`），页面 toast 即可。UNVERIFIED
4. **返回结构全部未验证**：v1 写函数只认 `raw.ts` 的约定值表（`-1` 等）与 `{ err: 1 }` 信封，
   解析不出结构按成功处理；读函数（`cy_getImagePath` / `cy_getPsdForFolder`）把 raw 原样交出。
   真机确认后必须收紧，别让宽松解析变成永久契约。

> 这三处拼写**照抄不改**：`cy_BacthExportPsdToImage`、`cy_LayerReplace`、`cy_ExportImage`。

---

### 11.5 动作页（第五条：一调度 + 一直调，**参数是整个对象**）

| 函数 | 通道 | 参数 | 说明 |
|---|---|---|---|
| `dz_callAction` | **调度**（`ps_onJsx`，官方 `case 96 → jsxHistoryNoCheck`） | `[{ group, name, alias? }]` **整个 item** | 只传 `name` 会执行到别的组（官方 `:1823179`）；`alias` 只在显示用，执行仍靠 `group + name` |
| `dz_getActionList` | **直调**（`jsxNoCheck`） | 无参 | 返回**裸数组**（2026-10-30 真机）：`[{ name: <组名>, children: [{ name, isAdd }] }]`。`isAdd` 未用；`{ info: [...] }` 包装仍未见过，`mapPsActions` 继续兜着 |

两条要点：

1. **超时不同**：`dz_callAction` 是批处理式长任务，给 `LONG_TIMEOUT`(300s)——它是**调度通道唯一的超时例外**，
   白名单写在 `capability.test.ts`（`LONG_RUN_DISPATCH`）。给 30s 会「先报超时、PS 还在跑」。
2. **派发名不同**：官方 dispatch 的 `n` 是 `"动作-" + name`；我们静态写「动作」（`n` 只影响 PS 历史面板显示名）。
   若真机要求历史名带动作名，就得给 `CapabilitySpec` 加 `labelOf(args)`——那是新增形状，需先改约定。

登记与验证（2026-10-30 更新）：`05` 原要求先真机 `typeof` 探针再登记，无真机期间按用户指示照抄可运行的 Vue 版实践
（`ps/src/cep/jsx/action.ts`）。**现在已真机确认**：两个函数都是 `function`，`dz_getActionList` 的返回结构与
`domain/action-library.mapPsActions` 的解码一致。**只剩 `dz_callAction` 的实际执行没跑**（未跑不等于不成立）。

## 十二、库文件数据契约（抄错就丢用户数据）

### 12.1 索引 `sj_kuStoreInfo.ini`

```json
{ "index": 0, "list": [ { "name": "...", "color": "sj_kuColXXX.ini", "gradient": "...", "font": "...", "style": "...", "show": {...} } ] }
```

- 顶层是**对象**不是数组（早期 `readJson` 只接受数组，直接读失败）。
- `index` 可能越界 → 夹到 `[0, list.length-1]`。
- 索引登记了但文件不存在 → `NOT_FOUND`，**不是**「新用户」。

### 12.2 库文件三种形态（`domain/ku-format.ts`）

| 形态 | 文件 | 结构 |
|---|---|---|
| `groups` | `.kuc` / `.kuf` / 本机 `.ini` | `[{ name, show, list }]` 明文 |
| `flat` | `.kus` / `.kug` | `[{ name, data }]`，`data` 是 base64 |
| `container` | `.kux` / `.dzx` | `{ arrFileData: [{ name, data }], store }` |

base64 解出来是 **UTF-8 JSON**，必须用 Node `Buffer`（`atob` 直接转会乱码）。解码器由 repo 注入，不传时只支持 `groups`。

### 12.3 四类项的形状（实测）

```jsonc
// 颜色
{ "name": "未命名", "color": { "hex": "151515", "c": 86, "m": 0, "y": 0, "k": 0, "isFill": true } }

// 渐变：注意是双层 gradient，angle 在外层
{ "name": "未命名", "gradient": { "angle": 90, "type": ..., "reverse": ..., "align": ...,
    "gradient": { "colors": [ { "location": 0, "color": { "hexValue": "FFFFFF" } } ] } } }

// 字体
{ "name": "未命名", "fonts": [ { "family": "...", "weight": "...", "scriptFamily": "...",
    "size": "12", "color": { "rgb": { "r": 0, "g": 0, "b": 0 } } } ] }

// 样式
{ "name": "未命名", "id": "E48D4CF0BDA5EB8D", "layerId": 3 }
```

换算（`domain/style-library.ts`，全部来自实测，不能猜）：

- 渐变 `location` 是 **0–4096** 刻度 → `location / 4096 * 100` 才是百分比
- 渐变角度是 **`90 + angle`**
- 字体取 `fonts[0]`；`color` 可能为 `null` → 不给色点，不要补默认黑
- 样式缩略图 = `<id>.png`；没有 `id` 就不给 `thumb`
- 分组 id 格式：大写十六进制 `8-4-4-4-12` 带连字符（`kuGuid()` 生成）

### 12.4 应用时传什么

| 操作 | 传什么 |
|---|---|
| 颜色 | 磁盘**原始项**（含未知键），移植版只读 `.color` |
| 渐变 | `item.gradient`（不是整个项） |
| 图层样式 | `{ ...item, groupId }`（groupId 用来找 `kuStyle/<groupId>.psd`） |
| 字体 | 整个项（编码后） |

原始项必须每次从磁盘读（`repo.readKuItem`），不要缓存到视图模型里——用户改库后缓存就是旧数据。曾经有过「`KuItem.raw` + `readKuItem` 两条路」，已收敛成只剩 `readKuItem`。

---

## 十三、CEP 环境坑（会浪费半天的那些）

| 现象 | 原因 | 处理 |
|---|---|---|
| 改了 HTML/JS/CSS，面板没变 | CEP 进程内存缓存旧页面，关面板再开**不重新读盘** | 完全退出 Photoshop 再开（不是关面板） |
| jsx 改动没生效 | jsx 在面板加载时 `evalFile` 执行一次 | 关面板重开 |
| 部署后加载到旧 jsx | 复制成嵌套目录 `jsx\jsx\main.jsx` | `npm run deploy` 先删后复制，并检测嵌套 |
| `$.evalFile` 路径失效 | Windows 反斜杠被当转义 | `loadJsx` 统一转正斜杠 |
| `window.cep.fs` 读不到文件 | CEP 12 不支持 | 走 `nodeRequire('fs')` |
| 缩略图整片 404 | 少了 `file:///` 或 `SheJiZhuLi` 层 | 只用 `userAssetUrl` |

---

## 十四、日志

| 文件 | 写入方 | 内容 |
|---|---|---|
| `%TEMP%\maomao.log` | 前端 `core/logger` | 每次 jsx 调用的函数名、参数、原始返回值 |
| `%TEMP%\maomao-jsx.log` | jsx `mm_log` | `layer.kind` 真实值、异常 message + 行号 |

- 脱敏在 logger 内部：key 命中 `token|authorization|password|secret|cookie|key` 就置 `***`，`Bearer xxx` 也替换。调用方不用管。
- **相同消息 3 秒内折叠**（`level|message` 为 key），窗口过去补一句「(+N 条相同消息已折叠)」。`error` 不折叠。
- 轮询调用额外传 `silent`，双重保险。
- 目前**没有轮转**，会一直变大。计划超过 1 MB 改名 `maomao.log.1`，尚未实现。
- 排查时只 grep 三种：`ERROR`、`raw":"error:`、`已折叠`（最后一种直接忽略）。

---

## 十五、排障速查

| 现象 | 先看 | 常见结论 |
|---|---|---|
| 面板空白 / 旧界面 | 是否完全退出 PS | CEP 缓存 |
| `EvalScript error.` | 参数是不是传了对象；通道对不对 | 序列化错误 / 调错通道 |
| `error:缺少必需值` | 是不是直接调了 `ys_*` 而没过 `ps_onJsx` | 调度器上下文缺失 |
| `error:xxx is undefined` | 传的是视图模型还是磁盘原始项 | 项缺键 |
| 返回 `1` 但图层没变 | `img_cya4` 是否显式 false；是否多选 | 配置闸门 / 多选跳过 |
| 图层类型显示 `unknown` | `%TEMP%\maomao-jsx.log` 里 `layer.kind` 原值 | 枚举名没覆盖 |
| 样式库整片空 | 日志 `readText 失败` / `warehouses` 数量 | 路径或 Node fs 问题 |
| 缩略图全破 | `userAssetUrl` 生成的实际 URL | `file:///` 或 `SheJiZhuLi` |

---

## 十六、AI 自测：一条命令拿全部 jsx 返回形状

**`npm run probe:ps`**（`tools/probe-ps.mjs`）—— 用 Photoshop COM 的 `DoJavaScript` 批量问宿主「你到底返回什么」，AI 自己就能拿齐证据，**不用人反复点面板**。

### 什么时候必须跑

1. 新增/修改**解析器**（`core/ps/raw.ts`）之前：判据只能建立在真实返回上。
2. 新增一个 `zt_*` / `ys_*` / `dz_*` 能力时：先拿一次真实返回，再决定 `parse` 用哪个。
3. 真机报「假失败 / 假成功」时：先跑探针看宿主原文，别猜。

### 用法

```powershell
npm run deploy                       # 探针读部署目录，必须先部署
npm run probe:ps -- --ensure-text    # 文档没有文字图层时自动造一个
npm run probe:ps -- --skip-slow      # 跳过 ztgl_initSystemList（扫全机字体，慢）
npm run probe:ps -- --group=text     # 只跑某一组
npm run probe:ps -- --json           # 附机器可读的 JSON
```

### 三条硬约束（踩过）

1. **加载 + 注入 + 探测必须在同一次 `DoJavaScript` 里**。`jsx/vendor.jsx` 是 jsxbin，
   它定义的函数**活不过一次调用** —— 上一次调用 `$.evalFile` 完 `ps_onJsx` 是 `function`，
   下一次调用就 `Sys_setSystemEnvInfo 不是函数`。脚本已经按这个约束写成「一段脚本跑完」。
2. **只收集，不判定**。输出是「函数 → 原始返回字符串」，不做成功/失败分类；
   分类只在 `core/ps/raw.ts` 一处做，探针里再判一次就是第二套判据。
3. **会改文档**：`zt_set*` 是真写。用测试文档跑。

### 它不覆盖什么

| 类别 | 为什么 | 怎么测 |
|---|---|---|
| `ys_useFont` / `ys_checkUseFont` | 参数必须先 `encodeText`（原版 `Xv`），v1 探针没做编码 | 手工构造编码后的字体项，或补探针 |
| `zt_createButton` / `zt_setTranslateText` | 参数是对象，构造规则复杂 | 手工 |
| `cy_distributedByPitch` | 需要多选 + 参数组合 | 手工 |
| 文件对话框（导入/导出 `.kux`） | COM 会卡在系统弹窗 | 手工 |
| 拖图 / 粘贴事件 | 需要真实鼠标 | 手工 |

### 拿到证据之后

把 raw 贴进对应的区域日志（`daily/架构日志/<NN>-*.md` 的「真机证据」段），
再按「宿主明确说过的才认」定 `parse`：信封 `{"err":0}` / `{"code":"OK"}` / 无返回 / 裸 `0` 算成功，
`{"err":1,"msg":…}` 算宿主拒绝，其余一律报「返回数据无法识别」并带原文，**两个方向都不猜**。
