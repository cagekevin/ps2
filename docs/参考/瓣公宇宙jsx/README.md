# 瓣公宇宙 JSX 参考（不参与构建、不部署、不被任何代码 import）

第三方产品「瓣公宇宙」CEP 扩展（`art.bangong.appbox`）自带的 PS 侧 ExtendScript，
从 `@JSXBIN@ES@2.0@` 编译字节码解码而来（解码方法见 `docs/JSXBIN-解码指南.md`）。

- **仅本地参考，不得分发**（同 `jsx/vendor.jsx` 的约束）。
- 这些是**别人产品的实现**，不是本仓的运行时依赖；仓里没有任何代码 import 它们。
- 文件名是插件里的原始哈希名，保留以便和插件目录对照；功能看下表。

> 同类参考：官方「稿定设计助理」的 vendor 已在 `jsx/vendor.jsx`（解码源码 282,839 字节，MD5 `0189C076…`，与本次解码的 vendor 同一份，未重复放）。

---

## 文件 → 功能

| 文件 | 大小 | 原始名 | 核心功能 |
|---|---|---|---|
| `a-c6tfimomn7q3txv9fswjl.jsx` | 2.6KB | `a-c6tf…jsx` | 移除背景 / 图层栅格化 / 取文字字号 |
| `t-ygrewgh05d96ymdr9dbv.jsx` | 3KB | `t-ygrew…jsx` | 批量选择图层 |
| `m-ayifn9ybvbl2ee7o6sz.jsx` | 53KB | `m-ayifn9…jsx` | PS 工具库（19 个函数） |

---

## 1. `a-c6tfimomn7q3txv9fswjl.jsx`（3 个函数）

| 函数 | 做什么 | 关键调用 |
|---|---|---|
| `layer_remove_bg()` | 一键「移除背景」（抠图） | `executeAction(removeBackground)` |
| `layer_shangehua()` | 图层栅格化 | `executeAction(rasterizeLayer)` + `ActionDescriptor` |
| `getTextSize()` | 读文字图层字号，返回像素值 | `textKey` / `textStyle` / `size` / `transform` |

## 2. `t-ygrewgh05d96ymdr9dbv.jsx`（3 个函数）

| 函数 | 做什么 | 关键调用 |
|---|---|---|
| `doesIdExists(id)` | 判断某图层 id 是否存在 | `executeActionGet` + `try/catch` |
| `multiSelectByIDs(ids)` | 按图层 id 批量选中 | `slct` + `putIdentifier` |
| `start_piliang_select_layers()` | 遍历当前文档，筛出「位置未锁定、非文字层、非背景层、宽或高 ≥ 10px」的图层并批量选中 | `app.activeDocument.layers` 过滤 |

## 3. `m-ayifn9ybvbl2ee7o6sz.jsx`（53KB，19 个函数）

按功能分组：

| 分类 | 函数 |
|---|---|
| 智能对象 | `pasteSmartObject`（粘贴为智能对象）、`pasteInPlace`（原位粘贴） |
| 填充 | `fillSolidColour`（纯色）、`fill_shape`（形状）、`fill_nor`、`fill_filter`（含渐变 / 描边 / 颜色参数） |
| 变换 | `hFlip`（水平翻转）、`vFlip`（垂直翻转）、`mcRotate`（旋转） |
| 抠图 | `mcRemovebg`（移除背景） |
| 导入 | `importPSD`（导入 PSD）、`ai`（导入 AI）、`ftn3` |
| 导出 | `quick_export_png`（快速导出 PNG） |
| 工具 | `hexToRgb_num`（色值转换）、`checkFolder`（检查文件夹）、`Qmsg`（消息提示）、`cTID` / `sTID`（typeID 别名） |

字符串表（`__Oxf0391`，275 项）还暴露了这些能力：

- **打开 AppBox 各窗口**：`OPENAPPBOXPOPUP` / `OPENAPPBOXWINDOW` / `OPENAPPBOXINDEX` / `OPENAPPBOXHOMEDOWN`（走 `http://ps.bangong.art/?ac=…` 或 PlugPlug 事件）。
- **批量替换链接档案**：提示语「请至少选取一个链接档再执行脚本」「共 X 个链接档案被替换为：」。
- **跨应用**：`PHXS` / `PHSP` / `ILST` / `IDSN` / `AEFT`（PS / AI / ID / AE），含 PR 的「请先激活当前合成窗口！」。

---

## 共同点（三个文件都有）

1. **末尾是 jsjiami 防篡改**：`__encode` 不等于 `jsjiami.com` 就弹窗「版本号，js会定 期弹窗，还请支持我们的工作」。
2. 字符串都存在 `__Ox…` 数组里（上面功能说明已按数组还原成明文）。
3. 函数名就是前端 `evalScript("gn['函数名']()")` 直接调用的入口。

---

## 怎么用

只读参考，不要放进 `jsx/`、不要 import。想抄某个 PS 动作的写法时，先看 `docs/JSX-通道与自写指南.md`
判断该走 vendor 还是自写 `jsx/main.jsx`，再对照这里的 `executeAction` / `ActionDescriptor` 参数形状。
