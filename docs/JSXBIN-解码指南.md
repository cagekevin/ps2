# JSXBIN 解码指南（给下一位 AI 的交接文档）

> 目标：把 Adobe ExtendScript 的编译格式 `@JSXBIN@ES@2.0@...` 还原成可读 `.jsx`。
> 本文档基于「瓣公宇宙 PS 插件」逆向实战写成，含**可直接复现的命令**和**我踩过的弯路**。
> 结论先行：**旧格式能解，补完 §3.5~3.7 后产物可直接加载（已验证 338KB→282KB）；新格式解不了（现有工具硬限制）**。

---

## 0. TL;DR（30 秒看懂）

| 问题 | 答案 |
|---|---|
| 用什么解码器 | `codecopy/jsxbin-to-jsx-converter`（C#/.NET Framework 4.5） |
| 本机没 dotnet SDK 怎么编译 | 用 Windows 自带 `csc.exe`（见 §2） |
| 最关键的坑 | **必须删掉 `Program.cs` 里的 Beautifier 调用**，否则栈溢出（见 §3.1） |
| 旧格式能解吗 | ✅ 能。`vendor.jsx`/`all.decrypted.js` 338KB → 282KB，**补完 §3.5~3.7 可直接加载** |
| 新格式能解吗 | ❌ 不能。报 `No decoder found for marker ?`（见 §5） |
| 补丁不打全会怎样 | 语法过不了（丢括号 / 转义实体化）或能加载但静默算错（丢 `var` → 隐式全局） |
| 现成工具在哪 | **本仓** `tools/jsxbin/`（源码 + `npm run vendor:decode`，含 §3.1~3.7 全部补丁；用法见该目录 `README.md`） |

---

## 1. 先判断：这个文件是不是 JSXBIN

JSXBIN 文件有两种外壳：

1. **明文**：文件以 `@JSXBIN@ES@2.0@` 开头（ASCII）。
2. **base64 包裹**：文件是 `QEpTWEJJTkBFU0AyLjBA...`（`@JSXBIN@ES@2.0@` 的 base64），常见于 `.svg`/`.js` 文件里。

判断命令（Node）：
```js
const b = fs.readFileSync(f, 'latin1').trim();
const isJsxbin = b.startsWith('@JSXBIN@') || b.startsWith('QEpT');
```

---

## 2. 编译解码器（本机无 dotnet SDK 的做法）

> 本仓已有一份打全补丁的源码：`tools/jsxbin/converter/`，编译直接 `node tools/jsxbin/build.mjs`。
> 下面是「从零 clone 上游再打补丁」的做法，换机器或源码丢失时才用。

```powershell
git clone --depth 1 https://github.com/codecopy/jsxbin-to-jsx-converter
cd jsxbin-to-jsx-converter
Copy-Item libs\Jsbeautifier.dll . -Force

$files = Get-ChildItem -Path "jsxbin_to_jsx" -Recurse -Filter *.cs | ForEach-Object { $_.FullName }
& "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" `
  /nologo /target:exe /out:jsxbin_to_jsx.exe `
  /r:libs\Jsbeautifier.dll /r:System.Xml.Linq.dll /r:System.Core.dll `
  /r:System.dll /r:Microsoft.CSharp.dll $files
```

> 说明：项目是 .NET Framework 4.5 老式工程，`dotnet build` 用不了（本机只有运行时没 SDK）。
> 但 Windows 自带 `csc.exe`（v4.0.30319）可以直接编译，`Jsbeautifier.dll` 在 `libs/` 里。

运行：
```powershell
.\jsxbin_to_jsx.exe input.jsxbin output.jsx
```

---

## 3. 必须打的补丁（源码改动）

### 3.1 【最关键】删掉 Beautifier（否则栈溢出）

**现象**：程序连自带 testfiles 都崩，输出只有 `由于 Exception.ToString() 失败，因此无法打印异常字符串。`，退出码 `-532462766`（`0xE0434352`）。

**原因**：`Jsbeautifier.dll` 在 .NET Framework 4.x 下 `new Beautifier().Beautify(jsx)` 会栈溢出（异常无法打印）。

**改法**：`jsxbin_to_jsx/Program.cs` 的 `Decode()` 里删掉这一行：
```csharp
// 删掉：
jsx = new Beautifier().Beautify(jsx);
```
删后输出**未美化的 JSX**（仍是合法、可读的代码，只是缩进一般）。

> ⚠️ 这是头号坑：一开始以为是输入文件错，实际是美化器。**删掉后旧格式立刻能解**。

### 3.2 Unicode 码点溢出（4 字节字面量会崩）

**现象**：`值对于 Int32 太大或太小`，栈在 `ConvertToUnicodeString`。

**改法**：`JsxbinDecoding/AbstractNode.cs`
```csharp
public string ConvertToUnicodeString(string codePoint)
{
    long code = long.Parse(codePoint);          // 原为 int.Parse
    if (code < 0 || code > 0x10FFFF) return "\uFFFD";
    return char.ConvertFromUtf32((int)code).ToString();
}
```

### 3.3 bool 标记宽容（仅对「新格式」尝试，未成功）

**现象**：`unexpected bool value Z` / `unexpected bool value ?`。

**改法**：`AbstractNode.DecodeBool()` 改成「始终消费 1 字符 + 宽松解释」：
```csharp
public bool DecodeBool()
{
    var str = GetCurrentAndAdvanceCore(scanState);
    return str == Constants.BOOL_TRUE || str == 0x5A; // 't' 或 'Z'
}
```
配套：`INode` 加 `bool IsBoolAhead();`，`AbstractNode` 实现 `IsBoolAhead()`，`ReferenceDecoderVersion2.cs` 和 `IdNodeVersion2.cs` 改成 `IsBoolAhead() ? DecodeBool() : false`。

> ⚠️ 这些补丁是**为了攻新格式**做的，最终**没成功**（见 §5），保留记录以免下一位重复踩。

### 3.4 SymbolTable 不抛异常

**现象**：`给定关键字不在字典中`（`KeyNotFoundException`）。

**改法**：`JsxbinDecoding/SymbolTable.cs`
```csharp
public string Get(string key)
{
    string value;
    return table.TryGetValue(key, out value) ? value : key; // 找不到返回 key 本身
}
```

### 3.5 按优先级补括号（否则静默算错）

**现象**：产物能读，但语义是错的 —— 解码器只输出语法树，不按优先级重建括号：
`(a + b).c` → `a + b.c`；`a && (b || c)` → `a && b || c`；`(x ? y : z) + 1` → `x ? y : z + 1`；
`(function () {…})()` → `function () {…}()`（直接语法错误）。

**改法**：`AbstractNode` 加两个判据 + 两个打印helper，然后**所有**打印子表达式的地方改用它：

```csharp
/* 当二元/逻辑运算的操作数时必须加括号 */
public static bool NeedsParensAsOperand(INode node) // BinaryExpr / LogicalExp / ConditionalExpr
                                                    // AssignmentExpr / MemberAssignmentExpr
                                                    // XMLAssignmentExpr / FunctionExpr
/* 当 `.` / `[]` / `()` 的基底时必须加括号 */
public static bool NeedsParensAsBase(INode node)    // 上面那些 + UnaryExpr / IncrementExpr
public string PrintOperand(INode node);             // 需要就包 ()
public string PrintBase(INode node);
```

改动点：`BinaryExpr.CreateExpr`、`LogicalExp.PrettyPrint`、`ConditionalExpr.PrettyPrint`（连条件一起）、
`MemberExpr`、`FunctionCallExpr`（被调用者）、`ArrayIndexingExpr`（基底要留 `INode`，别提前转字符串）。

> 宁可多包一层括号，也不能漏：多余的括号无害，漏一个就是算错。

### 3.6 字符串按 ES3 转义（否则字符串断开）

**现象**：对象键里的 `"\n"` / `"\r"` / `"` / `\` 被输出成**真实控制字符**与裸引号，json2 的 `meta` 表
当场断成两行，整个文件语法错误。旧代码只处理了 `\n` / `\t` / `\r`，且没覆盖对象键与 `["…"]` 成员名。

**改法**：`AbstractNode.EscapeString(string)` 统一转义（`\` `"` `\n` `\r` `\t` `\f` `\b` `\v` 与其余控制字符
走 `\uXXXX`），`DecodeVariantCore` case 4、`ObjectExpr` 的键、`MemberExpr` 的 `["…"]` 全部改用它。

### 3.7 补回无初值的 `var` 声明（否则隐式全局）

**现象**：`var i, k, v, partial;` 这种没有初值的声明在语句体里**没有痕迹**，解出来只剩带初值的那些。
后果不是报错，是**变量变全局**：json2 的 `str()` 里 `partial` 成全局后，递归时被内层覆盖，
嵌套对象/数组的 `JSON.stringify` 直接串数据（这个版本的 ExtendScript 没有原生 `JSON`，vendor 全靠这段 shim）。

**关键**：这些名字没丢，藏在函数头的槽位里。`DecodeSignature()` 的 `Parameter` 同时装着形参和局部变量，
靠第二个元素的数值区间区分 —— `536870000 ~ 540000000` 是真正的形参，**区间外的是局部变量**。

**改法**：`FunctionDeclaration.PrettyPrint` 把区间外的名字补成一行 `var a, b, c;` 放在函数体最前面。

> 副作用：与后面带初值的同名声明重复（`var i, k, partial;` 之后又有 `var mind = gap;`），ES3 里合法，不用手改。

---

## 4. 输入准备：把 base64/`.svg` 抽成 `.jsxbin`

很多场景下 JSXBIN 被 base64 包在 `.svg`/`.js` 里。抽出脚本（Node，见 `_extract.cjs`）：

```js
const fs = require('fs');
const [,, src, dst] = process.argv;
let s = fs.readFileSync(src, 'utf8').replace(/^\uFEFF/, '').trim();
if (s[0] === '"' || s[0] === "'") s = s.slice(1, -1);
s = s.replace(/^\uFEFF/, '');
let buf;
if (s.startsWith('@JSXBIN@')) buf = Buffer.from(s, 'latin1');
else buf = Buffer.from(s.replace(/[^A-Za-z0-9+/=]/g, ''), 'base64');
fs.writeFileSync(dst, buf);
```
用法：`node _extract.cjs input.svg output.jsxbin`

---

## 5. 核心结论：旧格式能解，新格式解不了

### ✅ 旧格式（已验证可解）

| 文件 | 大小 | 结果 |
|---|---|---|
| `com.local.psz.panel.v5\lib\all.decrypted.js` | 338KB | ✅ 282KB 可读（补 §3.5~3.7 后） |
| `com.maomao.design\jsx\vendor.jsx` | 338KB | ✅ 282KB（同一库） |
| `com.local.psz.seban\jsx\vendor.jsx` | 338KB | ✅ 282KB（同一库） |
| 瓣公宇宙管理器 `pages\m-ayifn9*.jsx` | 55KB | ✅ 53KB（pasteSmartObject） |
| 瓣公宇宙管理器 `pages\a-c6tf*.jsx` | 3.5KB | ✅ 2.6KB（layer_remove_bg） |
| 瓣公宇宙管理器 `pages\t-ygrew*.jsx` | 3.8KB | ✅ 3KB（doesIdExists） |

> 表中「大小」是**解码前**的输入大小。后两行那两处路径现在放的已是解码产物（282,839 字节，
> MD5 `0189C076…`）；唯一保留的 jsxbin 原件在 `docs/参考/vendor.jsxbin`（338,105 字节）。

> **补丁不打全，产物就是废的**：只删 Beautifier（§3.1）能解出「看起来像代码」的东西，但会丢括号、
> 丢无初值的 `var`、把转义实体化 —— 轻则语法过不了（`$.evalFile` 抛错、整扇 vendor 门关闭），
> 重则能加载但**静默算错**。§3.5~3.7 三条必须一起打，打完的产物可以直接用，不需要手工修。
> 现成可用的一份是 `源码工程\maomao-design-tools\jsx\vendor.jsx`，来历见同目录 `vendor.README.md`。

产物在 `逆向专用\_vendor_decoded\` 和 `逆向专用\_jsxbin_decoded\`。

### ❌ 新格式（解不了）

瓣公宇宙从服务器下载的依赖模块（`psoo_*`）：

| 文件 | 报错 |
|---|---|
| `psoo_oo_v2.3`（48KB） | `No decoder found for marker ?` |
| `psoo_ty_v1.0`（103KB） | `No decoder found for marker ?` |
| `psoo_layer_v1.5`（98KB） | 同上 |

**原因**：这批是新版 ExtendScript 编译的，节点/字符串编码与 2015 解码器不兼容。已修 §3.2~3.4 四个 bug，仍过不去。
**替代方案**：换更现代的 `Jsxer`（C++，需编译环境），或从零逆向新格式（工作量大）。

> 字符串表提取（`真字符 = 编码字符 - 1`，字符与恒定分隔符交替）**只对旧格式有效**；新格式提取出来是 `NCHA/PSTRIN/TTPS` 之类碎片，不可用。

---

## 6. 常见报错 → 原因 → 处置

| 报错 | 原因 | 处置 |
|---|---|---|
| `Exception.ToString() 失败` / 退出码 `0xE0434352` | Beautifier 栈溢出 | 删 `new Beautifier().Beautify()`（§3.1） |
| `值对于 Int32 太大或太小` | Unicode 码点溢出 | `long.Parse`（§3.2） |
| `unexpected bool value Z/?` | 新格式 bool 标记不同 | 宽容 `DecodeBool`（§3.3，治标） |
| `给定关键字不在字典中` | SymbolTable 抛异常 | `TryGetValue` 兜底（§3.4） |
| `No decoder found for marker ?` | **新格式节点类型不支持** | 无解，需换解码器（§5） |

---

## 7. 瓣公宇宙特有：JSX 到底从哪来（重要）

瓣公宇宙的 ExtendScript **不全是本地文件**，很多是运行时从服务器下载的：

1. 工具栏 `adds/f/0_0.js` 的 `loadDependence()`（约第 410 行）：
   - 从 `http://file.bangong.art/ps_appstore/app/app_dependence/ps/art.bangong.psoo_<模块>_<版本>.svg` 下载
   - 这些 `.svg` **其实是 base64 的 JSXBIN**
   - 缓存到 `%APPDATA%\APPBOXUSER\appicon\<btoa(名称)>.svg`
2. 运行时 `getAtob(content, 9)` 解码 → `evalScript` 执行。
3. 所以：**要找的 JSX 若不在扩展目录，先看 `%APPDATA%\APPBOXUSER\appicon\` 缓存**。

模块清单（`adds/f/0_0.js` 第 461-467 行）：
`oo|v2.3, font|v1.1, layer|v1.5, fn|v1.0, ty|v1.0`

> `app_tool_ps`（含 `randomColor`）就在这批 `psoo_*` 新格式模块里（最可能 `psoo_ty_v1.0` 或 `psoo_oo_v2.3`），**目前未解出**。

---

## 8. 现有产物清单

| 目录/文件 | 内容 |
|---|---|
| `tools/jsxbin/`（**本仓**） | 解码器源码（含 §3.1~3.7 补丁）+ `build.mjs` + `decode.mjs`；`npm run vendor:decode` 一条命令重解 vendor |
| `逆向专用\_tools\jsxbin-to-jsx-converter\jsxbin_to_jsx.exe` | 逆向现场那份已编译解码器（同上，作为来源留档） |
| `逆向专用\_extract.cjs` | base64/明文 → `.jsxbin` 抽取脚本 |
| `逆向专用\deobfuscate.cjs` | 前端 JS 反混淆（jsjiami / javascript-obfuscator） |
| `逆向专用\_vendor_decoded\*.jsx` | vendor 解码产物（补 §3.5~3.7 后 282KB） |
| `逆向专用\_jsxbin_decoded\*.jsx` | 管理器自带 JSX 解码（3 个） |
| `逆向专用\readable\` | 前端 JS 反混淆（59 文件 / 3.52MB） |
| `逆向专用\_dep_in\` | 18 个**未解出**的新格式 JSXBIN 候选 |
| `逆向专用\_jsxbin_in\` | 管理器 pages 抽出的 JSXBIN 输入 |

---

## 9. 弯路复盘（别重复踩）

1. **以为是输入错，其实是美化器崩**：`Exception.ToString() 失败` 是 CLR 栈溢出的典型表现，不是文件问题。先删 Beautifier。
2. **`dotnet build` 不行不代表不能编**：项目是老式 .NET Framework，用系统 `csc.exe` 直接编。
3. **base64 里带 BOM**：`"﻿QEpT..."` 开头有个 `\uFEFF`，先 `.replace(/^\uFEFF/,'')` 再 base64，否则解出来是空/乱码。
4. **别用 `Get-Content` 读含中文的 JS**：Windows 下可能按 GBK 解码乱码，用 Node `fs.readFileSync(f,'utf8')`。
5. **`findstr` 搜不到 ≠ 不存在**：JSXBIN 里字符串是编码的，`app_tool_ps`/`randomColor` 在源码里还常被拆成 `'app_tool_p' + 's.randomCo' + 'lor()'`，整词搜必然漏。
6. **前端 JS ≠ ExtendScript**：`adds/*.js` 是 CEP 前端（浏览器侧），`psoo_*` 才是 PS 宿主侧 ExtendScript，别混。
7. **解码器补丁不是万能的**：bool/symboltable 补丁让新格式往前推进了几步，但最终卡在「节点类型不支持」，属格式代差，别再逐条打地鼠。

---

## 10. 下一步建议（按性价比）

1. **只读旧格式** → 本仓 `npm run vendor:decode -- <jsxbin>`，产物直接落 `jsx/vendor.jsx`。
2. **要解新格式（`psoo_*`）** → 换更现代的解码器 `Jsxer`（C++，搜 "jsxer jsxbin" 找仓库，带 Python 绑定），不要再用 2015 版死磕。
3. **要随机色算法** → 先解 `psoo_ty_v1.0` / `psoo_oo_v2.3`；或从官方拿到未编译 `.jsx`（最快）。
