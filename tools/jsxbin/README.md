# tools/jsxbin —— jsxbin 解码器

把 Adobe ExtendScript 的编译格式 `@JSXBIN@ES@2.0@…` 还原成可读 `.jsx`。
`jsx/vendor.jsx` 就是它的产物；没有这个工具，那份 282KB 的源码无法重建（git 历史里只有 jsxbin）。

## 用法

```powershell
# 一条命令：抽 jsxbin → 解码 → 加文件头 → 写 jsx/vendor.jsx → 校验（语法 / 函数清单 / BOM+CRLF）
npm run vendor:decode -- "路径\to\maomao.jsxbin"

# 只编译解码器（改了 converter/*.cs 之后）
node tools/jsxbin/build.mjs
```

- 输入可以是 `.jsxbin` 明文，也可以是 base64 包着它的 `.svg` / `.js`（自动识别）。
- exe 不存在时 `decode.mjs` 会先自动编译。
- 产物**总是**覆盖 `jsx/vendor.jsx`，校验不过就 exit 1 且不落盘。

## 目录

| 文件 | 作用 |
|---|---|
| `decode.mjs` | 一条命令跑完解码 + 加头 + 校验，唯一入口 |
| `build.mjs` | 用 Windows 自带 `csc.exe` 编译 `converter/`（本机无 dotnet SDK） |
| `converter/` | 上游 `codecopy/jsxbin-to-jsx-converter` 的 C# 源码（MIT，`converter/LICENSE`），**含我们打的 7 条补丁** |

## 7 条补丁

前 4 条是早年攻「新格式」时打的（新格式最终没解出来，补丁保留），后 3 条是让产物能加载的关键。
逐条的现象 / 改法 / 副作用写在 `docs/JSXBIN-解码指南.md` §3.1~§3.7，这里只列结论：

| # | 补了什么 | 不打会怎样 |
|---|---|---|
| 1 | 删掉 `Beautifier` 调用 | .NET 4.x 栈溢出，输出只有 `Exception.ToString() 失败` |
| 2 | Unicode 码点用 `long` 并夹紧 | 4 字节码点崩溃 |
| 3 | `SymbolTable` 找不到时返回 key | `给定关键字不在字典中` |
| 4 | `DecodeBool` 宽容 | 新格式报 `unexpected bool value` |
| 5 | 按优先级补括号（操作数 / 基底两类判据） | **静默算错**：`(a + b).c` 写成 `a + b.c`、`(x ? y : z) + 1` 写成 `x ? y : z + 1` |
| 6 | 字符串按 ES3 转义（含对象键、`["…"]` 成员名） | json2 的 `meta` 表字符串断开，整个文件语法错误 |
| 7 | 从函数头槽位补回无初值的 `var` | 变量变隐式全局，递归函数串数据（json2 的 `str` 一坏，所有返回信封全废） |

## 不要做

- 不要美化 / 重排 `converter/` 的 C#：补丁点分散在 8 个文件里，重排会让下一次对照变难。
- 不要改 `decode.mjs` 的文件头常量以外的输出格式：`jsx/vendor.jsx` 是它的产物，改格式等于整份文件重写。
- 不要用「能解码」当验收：语法过 ≠ 语义对（补丁 5/7 就是能解码但算错的例子）。真机探针见 `jsx/vendor.README.md`。
