# vendor.jsx 说明

## 这是什么

官方「稿定设计助理」的 PS 侧脚本，原文件是 `@JSXBIN@` 加密格式（ExtendScript 编译产物）。
**原样复制**，未做任何修改。

| 项 | 值 |
|---|---|
| 来源 | `D:\稿定设计助理-存档\app\public\lib\all.decrypted.js`（该工程已验证可用） |
| 大小 | 338,105 字节 |
| 格式 | `@JSXBIN@ES@2.0@...`（加密，不可读） |
| 复制时间 | 2026-10-27 |

jsxbin 加密但**能直接 `$.evalFile` 执行**，不需要解密。加载必须是**顶层语句**，不能包在 IIFE 里——包进去后 jsxbin 定义的函数会落在局部作用域，函数返回即销毁。

## 为什么用这份，不用另外两份

| 文件 | 大小 | 内容 |
|---|---:|---|
| `com.sf.设计助理2.7\jsx\main.jsx` | 97 KB | **只有色板函数 `sb_*`，没有 `ys_*`**，用了必然 `EvalScript error.` |
| `com.local.psz.panel.v4\panel\js\all.js` | 146 KB | 主面板 jsx，未验证 |
| `app\public\lib\all.decrypted.js` | **338 KB** | 完整版，`app` 项目用它跑通了渐变与图层样式 |

## 提供哪些函数（实际在用）

`core/ps/init.ts` 的 `VENDOR_FUNCS` 就是这张表，缺一个就把 vendor 标记为不可用：

| 函数 | 用途 | 调用方式 |
|---|---|---|
| `Sys_setSystemEnvInfo` | 注入环境变量（必须先调） | 直调 |
| `ps_onJsx` | 统一调度入口 `{ f, arr, n }` | 直调 |
| `ys_useStyleColor` | 应用颜色（**单选多选同一个调用**，遍历在它内部） | 经 `ps_onJsx` |
| `ys_useGradient` | 应用渐变 | 经 `ps_onJsx` |
| `ps_ysBtnUseStyle` | 应用图层样式 | 经 `ps_onJsx` |
| `ys_checkUseFont` | 字体可用性检查 | 直调（参数需 `encodeText`） |
| `ys_useFont` | 应用字体 | 直调（参数需 `encodeText`） |
| `ztgl_initSystemList` | 读系统字体列表（字体管理页） | 直调（长超时 300s） |
| `ztgl_setFont` | 应用系统字体（字体管理页） | 直调（三个明文参数） |

**`ys_useStyleColor` 是颜色应用的唯一实现**（`core/ps/style.ts` 的 `applyStyleColor`，经 `ps_onJsx` 调度）。单选、多选同一个调用，遍历选中图层在它内部完成。

**别抄色板面板那份明文 jsx**（`%APPDATA%\fz.FengZi3Hao\jsx\main.jsx`）：它 `iTuCengGeShu == 1` 才上色，多选只设前景色 —— 抄过来就是「返回成功但图层没变」。

`mm_diag_vendor` 里仍会探测 `ys_useStyleColor` / `ys_setForegroundColor` / `ys_useShapeFill`，那是诊断用途，不代表依赖。

## 两条通道（调错必炸）

| 原版前端 | 实际发出 | 用在哪 |
|---|---|---|
| `jsxHistory(fn, args, label)` | `ps_onJsx('{"f":fn,"arr":args,"n":label}')` | 渐变、图层样式 |
| `jsx` / `jsxWrite` | `fn(args)` 直接调 | 字体 |

判断依据是原版 `cep/transport.ts` 的调用点，**不是函数名是否以 `ys_` 开头**。

- 直接调 `ys_useStyleColor` / `ps_ysBtnUseStyle` 会报「缺少必需值」（调度器上下文缺失）
- `n` 是前端日志标签，不传给 jsx 函数
- 参数序列化：对象先 `JSON.stringify` 再包**单引号**，传过去是字符串不是对象（`core/cep/bridge.ts` 的 `toJsxArg`）

## 返回值

| 值 | 含义 |
|---|---|
| `1` | 成功（原版判定 `r != -1`） |
| `-1` | 宿主拒绝执行（多为没选中图层） |
| `error:<message>` | 内部异常（由我们包的 IIFE 捕获，不是 vendor 返回） |
| `no-doc` | 自有 jsx 的约定，vendor 不走这个 |

## 已知依赖

**必须先注入环境变量**（`core/ps/env.ts`），否则内部拼路径报「undefined 不是对象」。最关键字段是 `VUE_APP_USER_DIR = '/SheJiZhuLi'`。

官方脚本还会自己读 `%APPDATA%\SheJiZhuLi\` 下的配置：

| 文件 | 影响 |
|---|---|
| `sj_set.json` | `cyAutoFillColor` 是**主面板前端**的分支开关（开才发 `ys_useStyleColor`），vendor 内部不读；我们直接发调度调用，不受它影响 |
| `sj_interfaceSet.ini` | `img_cya4 === false` 时跳过填充；**文件缺失按开启处理** |

用 `/debug` 的「诊断官方能力」可探明：函数是否定义、配置文件是否存在、开关实际值。

**注意**：我们声明「不读旧目录」，但 vendor 内部可能自己读。这属于官方行为，不在我们控制范围，诊断结果如实显示，不做掩盖。

## 升级方式

```powershell
Copy-Item "D:\稿定设计助理-存档\app\public\lib\all.decrypted.js" `
  "源码工程\maomao-design-tools\jsx\vendor.jsx" -Force
```

> 不要从 `com.sf.设计助理2.7\jsx\main.jsx` 复制——那份只有 `sb_*`，复制过去所有 `ys_*` 都会消失。

然后更新本文档的「大小」「复制时间」，跑一次 `npm run deploy`，并重新验证 `/debug` 里 6 个函数是否都返回 `function`。

## 限制

- **仅本地自用**：这是第三方的加密代码，不得对外分发或用于商业发布
- 函数内部行为不可读，只能通过返回值（`1` / `-1` / 异常）判断结果
- 函数名硬编码在 `core/ps/*.ts` 里，官方改名会导致运行时报错（`VENDOR_FUNCS` 自检会先发现）
