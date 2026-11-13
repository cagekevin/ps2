# vendor.jsx 说明

## 这是什么

官方「稿定设计助理」的 PS 侧脚本。上游只发布 `@JSXBIN@ES@2.0@…` 编译格式，**仓里这份是解码后的可读源码**，
由打过补丁的 `jsxbin_to_jsx.exe` 一次解出，**没有手工改动**（工具与踩坑见 `docs/JSXBIN-解码指南.md`）。

| 项 | 值 |
|---|---|
| 上游原件 | `@JSXBIN@ES@2.0@…`，338,105 字节（`com.local.psz.panel.v5\lib\all.decrypted.js`，MD5 `c6ca05a0…`） |
| 解码产物 | 282,089 字节，430 个顶层 `function` 声明 |
| 入库形态 | 解码产物 + 12 行文件头，282,839 字节，UTF-8 **带 BOM**、CRLF |
| 本文件 MD5 | `0189C07621C5AFFE18C2E558A4C16091`（`com.maomao.design\jsx\vendor.jsx`、色板装机包那份都是这一个哈希；对不上就是拷贝不全或被改过） |
| 解码时间 | 2026-11-03 |

上游 jsxbin 原件在 git 历史里（`git show 5930f0f:jsx/vendor.jsx`），回滚就是取回那一版覆盖本文件。

## 只读约定

这份是**官方的代码**，我们只是解码出来读：

- **不改名、不重排、不「美化」**：变量名是编译产物（`bYouZu` / `iChang` / `aMuBiao` / `e` / `t`），
  改了名就和官方对照不上，下一个 AI 再也查不到出处；重排会让 `docs/JSXBIN-解码指南.md` 里的片段对照全部失效。
- **不删「看起来没用到」的函数**：需要哪些由 `core/ps/init.ts` 的 `VENDOR_FUNCS` 决定，不在文件里删。
- **要改行为只能改调用点**（`core/ps/capabilities.ts` 与各域薄函数）。确实必须动这份文件时，
  改动要记进 `docs/CHANGELOG.md` 并写明理由 —— `npm run vendor:decode` 会整份覆盖它。
- 读它的目的只有两个：**参数怎么解**、**什么情况返回 `-1` / 弹窗**。读完回去改调用点。

对照：我们自己的 `jsx/main.jsx`（`mm_*` 前缀）是**完全可读可写**的，两份文件的差别见
`docs/JSX-通道与自写指南.md` §1.5。

## 为什么敢用解码版

1. **上游停更**：不会有人在我们不知道的时候换实现，这是一次性迁移，可读性是永久收益。
2. **解码器已修**：原始解码器会丢括号、丢无初值的 `var` 声明、把字符串转义实体化，产出的文件连语法都过不了，
   修好后一次解出即可加载（补丁清单见下）。
3. **两条独立验证**：
   - 结构：修好的解码器产物 vs 手工补 8 处的旧产物做 AST 比对，只剩两处差异 —— 都是**新解码更对**
     （`("第" + (n + 1)) + "行"`、`((n == 3) || (n == 4)) && …`，旧解码把括号丢了，语义是错的）。
   - 行为：真机（PS COM `DoJavaScript`）验过 73 个 `VENDOR_FUNCS` 全是 `function`；
     `JSON.stringify` 嵌套对象正确、`Sys_setSystemEnvInfo` 返回 `{"err":0,"data":true}`、`ps_onJsx` 调度返回 `1`。

## 必须保留的加载方式

加载必须是**顶层语句**（`core/ps/init.ts` 的 `loadJsx` → `$.evalFile`）：函数声明落在全局作用域。
包进 IIFE 会随函数返回销毁，`ys_*` / `zt_*` 全部变 undefined。明文 jsx 与 jsxbin 在这点上一模一样。

## 解码器补了什么（重解码时这些补丁必须在）

前 4 条是早年攻新格式时打的，后 3 条是 2026-11-03 为让产物能加载而打的，**都改在
`tools/jsxbin/converter` 的源码里**，改完用 `node tools/jsxbin/build.mjs` 重编译（`csc.exe`，命令见下）。

| # | 文件 | 补了什么 | 不打会怎样 |
|---|---|---|---|
| 1 | `Program.cs` | 删掉 `new Beautifier().Beautify()` | .NET 4.x 下栈溢出，输出只有 `Exception.ToString() 失败` |
| 2 | `AbstractNode.cs` | `ConvertToUnicodeString` 用 `long.Parse` 并夹紧到 `0x10FFFF` | 4 字节码点直接崩（`值对于 Int32 太大或太小`） |
| 3 | `SymbolTable.cs` | `Get` 找不到时返回 key 本身 | `给定关键字不在字典中` |
| 4 | `AbstractNode.cs` | `DecodeBool` / `IsBoolAhead` 宽容（为攻新格式，保留） | 新格式报 `unexpected bool value` |
| 5 | `AbstractNode.cs` / `BinaryExpr` / `LogicalExp` / `ConditionalExpr` / `MemberExpr` / `FunctionCallExpr` / `ArrayIndexingExpr` | 按优先级补括号：`NeedsParensAsOperand`（二元/逻辑的操作数）、`NeedsParensAsBase`（`.` / `[]` / `()` 的基底） | **静默算错**：`(a + b).c` 变成 `a + b.c`、`a && (b \|\| c)` 变成 `a && b \|\| c`、`(x ? y : z) + 1` 变成 `x ? y : z + 1`、`(function(){…})()` 变成语法错误的 `function(){…}()` |
| 6 | `AbstractNode.EscapeString` + `ObjectExpr` / `MemberExpr` | 字符串字面量按 ES3 转义（反斜杠、引号、全部控制字符） | 对象键里的 `"\n"` / `"\r"` / `"` 变成真实控制字符与裸引号，json2 的 `meta` 表当场断开字符串 |
| 7 | `FunctionDeclaration` | 把函数头槽位里**不在形参区间**（`536870000 ~ 540000000`）的名字补成 `var a, b;` | 无初值的 `var` 在语句体里没有痕迹，名字变隐式全局：递归函数被内层覆盖（json2 的 `str` 的 `partial` 一坏，所有 `ps_returnOk` 信封全废） |

副作用（正常，不要手改）：函数体开头会出现一行 `var i, k, v, length, mind, partial, value;`，与后面
`var mind = gap;` 之类的重复声明。这是解码器把函数头槽位补回来的结果，重复 `var` 在 ES3 里合法。

## 重新解码（上游真出更新时）

解码器源码已在仓内（`tools/jsxbin/converter`，含上表 7 条补丁），一条命令：

```powershell
npm run vendor:decode -- "路径\to\maomao.jsxbin"
```

它做四件事：抽 jsxbin（明文或 base64 外壳）→ 解码 → 加文件头 → 覆盖本文件，并校验
（语法 / `VENDOR_FUNCS` 覆盖 / UTF-8 BOM + CRLF）。校验不过 exit 1 且**不落盘**。
改了 `converter/*.cs` 之后 `node tools/jsxbin/build.mjs` 重编译（`decode.mjs` 发现 exe 缺失也会自动编译）。

## 验证方式（改完必跑）

```powershell
# 1. 语法：能编译就静默通过，报 SyntaxError 就是解码器补丁没打全
node -e "new Function(require('fs').readFileSync('jsx/vendor.jsx','utf8').replace(/^\uFEFF/,''))"

# 2. 清单：VENDOR_FUNCS 里每个名字都得有 function 声明
#    （`init.test.ts` 只管「表里的能力都在清单里」，管不到「清单里的函数在不在文件里」）

# 3. 真机：加载 + 注入 + 探测必须在同一次调用里
npm run probe:ps
```

真机上还可用 `/debug` 的「诊断官方能力」逐项看 `typeof`，缺哪个只禁用对应能力。

## 提供哪些函数

`core/ps/init.ts` 的 `VENDOR_FUNCS` 是唯一权威清单（缺一个只禁用对应能力，缺 `ps_onJsx` /
`Sys_setSystemEnvInfo` 才整门关闭）。这里只列实际在用的几组，**不要按这张表增删**：

| 函数 | 用途 | 调用方式 |
|---|---|---|
| `Sys_setSystemEnvInfo` | 注入环境变量（必须先调） | 直调 |
| `ps_onJsx` | 统一调度入口 `{ f, arr, n }` | 直调 |
| `ys_useStyleColor` | 应用颜色（**单选多选同一个调用**，遍历在它内部） | 经 `ps_onJsx` |
| `ys_useGradient` | 应用渐变 | 经 `ps_onJsx` |
| `ps_ysBtnUseStyle` | 应用图层样式 | 经 `ps_onJsx` |
| `ys_checkUseFont` / `ys_useFont` | 字体检查 / 应用（参数需 `encodeText`） | 直调 |
| `ztgl_initSystemList` / `ztgl_setFont` | 系统字体列表 / 应用（长超时 300s） | 直调 |
| `zt_*` / `layer_font_*` / `cy_*` / `dz_*` / `cmm_*` | 文本属性、常用页、动作页、重命名 | 逐个看原版调用点 |

**别抄色板面板那份明文 jsx**（`%APPDATA%\fz.FengZi3Hao\jsx\main.jsx`）：它 `iTuCengGeShu == 1` 才上色，
多选只设前景色 —— 抄过来就是「返回成功但图层没变」。

## 两条通道（调错必炸）

| 原版前端 | 实际发出 | 用在哪 |
|---|---|---|
| `jsxHistory(fn, args, label)` | `ps_onJsx('{"f":fn,"arr":args,"n":label}')` | 渐变、图层样式 |
| `jsx` / `jsxWrite` | `fn(args)` 直接调 | 字体 |

判断依据是原版 `cep/transport.ts` 的调用点，**不是函数名是否以 `ys_` 开头**。

- 直接调 `ys_useStyleColor` / `ps_ysBtnUseStyle` 会报「缺少必需值」（调度器上下文缺失）
- `n` 是前端日志标签，不传给 jsx 函数（`ps_onJsx` 拿它当撤销组名）
- 参数序列化：对象先 `JSON.stringify` 再包**单引号**，传过去是字符串不是对象（`core/cep/bridge.ts` 的 `toJsxArg`）

## 返回值（按通道分，两套语义别混）

| 通道 | 返回值 | 含义 | 能判成败吗 |
|---|---|---|---|
| **dispatch**（`ps_onJsx`） | `1` | 走完了 —— **失败也是 1** | **不能** |
| | `undefined` | `{"f":…}` 里没写函数名（我们发错格式） | 能 |
| **direct**（`fn(...)`） | `-1` | 宿主拒绝执行（多为没选中图层 / 用户取消） | 能 |
| | `undefined` / `""` / `0` / `1` | 各函数自己的约定，逐条登记在 `core/ps/raw.ts` 的 `lenientVoid` | 看函数 |
| | `{"err":0/1,…}` | 官方信封（`parseErrEnvelope`） | 能 |
| 两者都可能 | `error:<message>` | 我们包的 IIFE 捕获到的异常，不是 vendor 返回 | 能 |
| 仅自有 jsx | `no-doc` | `jsx/main.jsx` 的约定，vendor 不走这个 | 能 |

**dispatch 为什么判不了成败**（`jsx/vendor.jsx:8768` 的 `ps_onJsx`）：

```8800:8811:jsx/vendor.jsx
var funcStr = ((obj.f + "(") + params) + ")";
app.activeDocument.suspendHistory(name, funcStr);
} catch (error) {
error = error.message;
if (error.indexOf("用户取消了操作") == -1) {
_A("错误：" + error);
}
}
if (typeof doc != "undefined") {
doc.close(SaveOptions.DONOTSAVECHANGES);
}
return 1;
```

`suspendHistory(name, funcStr)` 是把**字符串**丢给宿主执行，内部函数的返回值直接丢弃；出错只走 `_A()`
弹一个「提醒」模态框（`jsx/vendor.jsx:8721`，`new Window("dialog")` + `d.show()`），然后照样 `return 1`。

实测（2026-11-03，同一函数两种通道）：

| 调用 | 返回 |
|---|---|
| `ps_toTwo(5)` 直调 | `"05"` |
| `ps_onJsx('{"f":"ps_toTwo","arr":[5],"n":"通道自检"}')` | `1` |

⇒ **调度能力（`channel: 'dispatch'`）的失败防线只有两条，都不是返回值**：

1. `require` 前置（`capabilities.ts` 的 `requireTwoLayers` / `requireTextLayer` 等，执行器第一步就判）；
2. 事后读回状态（例如导出后读目录）。

**失败对用户不是静默的**：这些函数每个 `return -1` 前一行都是 `_A(...)`，也就是 PS 自己弹一个模态框。
逐条条件（2026-11-03 读源码）：

| 能力 | 内部 `-1` 的触发条件 |
|---|---|
| `embedMultipleImage` | 文档未存盘 / 选中的是图层组 / 没检测到组 / 尺寸 < 1px |
| `importMultipleImage` | 文档未存盘 / 没找到可导入的组或形状图层 |
| `customBuildTransform` | 复制出的临时文档顶层图层数 ≠ 1 |
| `exportImage` / `exportSecondLevelLayers` | 文档没存盘，取不到所在目录 |

所以现场是「PS 弹窗说原因 + 我们 toast 说成功」两句打架 —— **以 PS 弹窗为准**。这是 `TD-01-32` 的剩余部分。

`core/ps/raw.ts` 里 `'-1': 'PS_REJECTED'` 只对直调通道有效，调度能力挂 `unwrapRaw` 也永远命中不到这一行。
调度失败的现场表现是「PS 卡一个模态框 + 我们这边提示成功」，排查时先看 PS 有没有弹窗。

## 已知依赖

**必须先注入环境变量**（`core/ps/env.ts`），否则内部拼路径报「undefined 不是对象」。最关键字段是 `VUE_APP_USER_DIR = '/SheJiZhuLi'`。

**这个版本的 ExtendScript 没有原生 `JSON`**（裸调报 `JSON 未定义`），vendor 自带的 json2 段是唯一实现 ——
它一坏，所有 `ps_returnOk` / `ps_returnErr` 信封全废。解码器补丁 #6 / #7 就是为了这个。

官方脚本还会自己读 `%APPDATA%\SheJiZhuLi\` 下的配置：

| 文件 | 影响 |
|---|---|
| `sj_set.json` | `cyAutoFillColor` 是**主面板前端**的分支开关（开才发 `ys_useStyleColor`），vendor 内部不读；我们直接发调度调用，不受它影响 |
| `sj_interfaceSet.ini` | `img_cya4 === false` 时跳过填充；**文件缺失按开启处理** |

用 `/debug` 的「诊断官方能力」可探明：函数是否定义、配置文件是否存在、开关实际值。

## 限制

- **仅本地自用**：这是第三方的代码，不得对外分发或用于商业发布
- 解码产物不是官方源码，与上游 jsxbin 的行为一致性靠真机探针验证，不靠代码审查
- 函数名硬编码在 `core/ps/*.ts` 里，官方改名会导致运行时报错（`VENDOR_FUNCS` 自检会先发现）
