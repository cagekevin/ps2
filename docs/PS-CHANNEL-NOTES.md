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

代码：`src/core/ps/style.ts:25`（`runVendor`）、`src/core/ps/font.ts:42`。

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
mm_style_applyColor('{"name":"未命名","color":{...}}')   // ✓ 字符串
mm_style_applyColor({"name":"未命名","color":{...}})     // ✗ 对象字面量
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
| `'not-shape'` | `PS_NOT_SHAPE` | 提示用户 |
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
- 超时：默认 30s，字体写操作 60s。**超时后队列放行**，但 PS 侧可能仍在执行——日志会写「队列放行」，看到这句不要以为已经取消。
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
- `VENDOR_FUNCS` 是**实际在用**的函数清单：`ps_onJsx`、`ys_useGradient`、`ps_ysBtnUseStyle`、`ys_checkUseFont`、`ys_useFont`、`Sys_setSystemEnvInfo`。
- 删掉任何 jsx 函数，必须同步改 `VENDOR_FUNCS` / core 探测列表，否则会出现「函数没了 → 能力永远不可用」的假故障（已发生过一次）。

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

---

## 十、颜色应用：移植版，不是 vendor

`jsx/main.jsx:222` 的 `mm_style_applyColor`，移植自色板面板明文 jsx（`%APPDATA%\fz.FengZi3Hao\jsx\main.jsx`，819 行，未加密）。

**为什么不用 `ys_useStyleColor`**：它在「自动填充」关闭时只改前景色、不碰图层，返回 `1` 但图层没变。这个现象排查了两轮才定位。

分支行为：

| 图层 | 做法 |
|---|---|
| `NORMAL` | 锁定透明度 → 填充前景色 → 解锁（`finally` 保证解锁） |
| `SOLIDFILL` | 有填充改填充色；只有描边时改描边色（`mm_style_setShapeColor`） |
| `SMARTOBJECT` | 图层样式颜色叠加（`mm_style_overlayColor`） |
| `TEXT` | `textItem.color = color` |

三个隐含行为，改之前必须知道：

1. **同色规避**：目标色 == 当前前景色时，先把前景色设成 `f0ebe2`，再设目标色。否则「填充前景色」不触发。
2. **多选不处理**：`mm_style_countTargets() !== 1` 直接返回 `'ok'`（原版行为）。想支持多选是**新功能**，不是修 bug。
3. **配置闸门只认显式 false**：`sj_interfaceSet.ini` 里 `img_cya4 === false` 才返回 `skipped`；文件缺失 / 解析失败都按「开启」处理。色板面板原注释：`if (lsObj.img_cya4 === false) return -1;`

`isFill` 字段：移植版**只读 `item.color`**，不认 `isFill`。vendor 那条链路要求 `isFill` 在顶层，两条通道的项形状不同，别互相抄。

`cyAutoFillColor`：是**主面板前端**的开关（`if (cyAutoFillColor) ys_useStyleColor(...) else ys_setForegroundColor(...)`），不是 jsx 内部读的。所以它不影响我们这条移植版。

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

---

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
