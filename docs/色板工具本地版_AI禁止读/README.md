# 色板工具本地版

独立的 CEP 面板，外观和操作与官方「稿定-PS设计助理-色板工具」一致，但不依赖登录态、不依赖主面板、不读取官方目录。

## 结构

```
色板工具本地版/
├─ CSXS\manifest.xml      bundle: com.local.psz.seban
├─ index.html             面板结构（与原版一致）
├─ css\style.css          样式（与原版一致）
├─ js\
│  ├─ CSInterface.js      Adobe 标准库，未改动
│  ├─ core.js             状态 / 持久化 / PS 通道 / 官方 vendor 加载与调度
│  └─ app.js              渲染 / 交互 / 动作
├─ jsx\main.jsx           面板自己用到的 PS 能力（取色、形状工具）
├─ jsx\vendor.jsx         官方 vendor（加密 jsxbin）原文件：多图层上色靠它
├─ docs\上色逻辑.md       上色逻辑的完整理解（官方做法 / PS 侧事实 / 验证判据）
└─ img\                   图标（1~7 与 1a~7a）
```

## 数据流

```
用户操作 / PS 前景色事件
        ↓
      actions
        ↓
      store.set()  ──自动落盘──►  %APPDATA%\FengZiSeBan\
        ↓ 订阅
      render()
```

- 界面不直接读写文件，也不直接调 `evalScript`
- 所有落盘集中在 `store.set()`
- 所有脚本调用集中在 `Seban.ps.call()` 与 `Seban.ps.dispatch()`

## 安装

复制整个目录到：

```
%APPDATA%\Adobe\CEP\extensions\com.local.psz.seban\
```

重启 Photoshop，菜单：`窗口 → 扩展功能 → 稿定-PS设计助理-色板工具(本地)`

需要 `PlayerDebugMode=1`（未签名扩展）。检查：

```powershell
Get-ItemProperty HKCU:\Software\Adobe\CSXS.11 | Select PlayerDebugMode
```

## 功能

| 操作 | 行为 |
|---|---|
| 左键点色块 | 给所有选中图层上色（官方智能填充） |
| shift + 左键 | 设为线框色（背景色） |
| ctrl + 左键（自定义色板） | 调色板取色替换该色块 |
| 右键（自定义色板） | 删除色块 |
| 拖拽（自定义色板） | 排序 |
| 图标 1 | 添加前景色 |
| 图标 4 | 添加当前图层颜色 |
| 图标 6 | 去掉形状填充；shift 去掉线框 |
| 图标 7 | 填充 / 线框颜色互换 |
| 图标 5 | **自动填充开关**：点一下点亮 = 开。开着时改 PS 前景色（吸管 / 拾色器）会自动填到选中图层 |
| 图标 3 | 设置最近使用数量 0–15 |

### 自动填充（图标 5）

**默认关闭，点亮才生效。**

- 监听 PS 的 `setd` 事件（`js/core.js` 的 `watchForeground`），前景色一变就取新色 → `ys_useStyleColor` 上色
- 上色路径与「点色块」完全同一条，没有第二套实现
- **循环抑制**：上色本身可能改前景色，从而再触发事件。记住刚用过的 hex，同色再回来就跳过一次
- 自动触发时**不弹窗**（没选中图层太常见），只写 `%TEMP%\seban-debug.log`
- 状态存在 `%APPDATA%\FengZiSeBan\ziDongTianChong.txt`（`1` = 开）

> 这是**官方 2019 年主动删掉**的行为。`docs/上色逻辑.md` 记着官方原注释：
> `2019.04.16更新 去掉自动填充应用普通图层，增加 颜色关联 可以对其他图层进行着色`。
> 本地版把它做成可选开关（默认关），不是修 bug。

## 上色怎么做的（只有一条路）

```
点色块 → js/app.js applyColor
       → js/core.js ps.dispatch('ys_useStyleColor', [项], '智能填充颜色')
       → 官方调度入口 ps_onJsx('{f,arr,n}')
       → jsx/vendor.jsx（官方 vendor 加密 jsxbin 原文件）→ 一次处理所有选中图层
```

- 官方的多图层上色就是 `ys_useStyleColor` 做的，官方主面板只是转发事件；我们没有主面板，就自己转发同一跳
- 线框色对应 `ys_setBorderColor`
- 参数：扁平颜色对象 `{hex,c,m,y,k}` + 顶层 `isFill:true`（照抄官方主面板 `app.v4.js:17894-17900`）
- 加载顺序不能改：`evalFile jsx/main.jsx` → `evalFile jsx/vendor.jsx` → `Sys_setSystemEnvInfo(15 个环境变量)` → 探 `typeof ps_onJsx`
- 官方 `ys_*` 不能直调，必须经 `ps_onJsx`（直调报「缺少必需值」）
- vendor 没加载或官方拒绝时，面板**明确提示**，不留第二套实现

## 数据文件

与官方版完全一致，升级不丢色：

```
%APPDATA%\FengZiSeBan\userColor.ini        自定义色板
%APPDATA%\FengZiSeBan\vecently.ini         最近使用
%APPDATA%\FengZiSeBan\zuiJinShuLiang.txt   最近使用数量
%APPDATA%\FengZiSeBan\ziDongTianChong.txt  自动填充开关（1 = 开，缺失 = 关）
```

## 排障

日志写到 `%TEMP%\seban-debug.log`：

```
JSX-LOAD => undefined
VENDOR-ENV => {"err":0,"data":true}
VENDOR-DISPATCH => function
DISPATCH ys_useStyleColor => 1
```

- `VENDOR-DISPATCH => undefined` → 官方调度入口没加载，点色块会弹提示
- `DISPATCH ys_useStyleColor => -1` → 官方拒绝（多为没选中图层），面板同时弹提示
- 改了 `js/` 或 `jsx/` 必须**完全退出 Photoshop 再开**：CEP 缓存旧页面，关面板重开不生效
- 脚本自检（不用人点）：Photoshop COM → `DoJavaScript`，见 `docs/上色逻辑.md` §5.3

## 限制

- 自动填充开着时，**只要前景色变了就会尝试上色**（包括吸管取色）。不想要就点一下关掉
- 智能对象批量不上色（官方行为）：单独选中它再点一次
- 图层组不上色（官方行为）
- 形状只改颜色，不改描边粗细
