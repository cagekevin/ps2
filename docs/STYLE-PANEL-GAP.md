# 样式面板 · 现状与剩余缺口

> 更新：2026-10-27（第四次体检后）
> 对照对象：`D:\稿定设计助理-存档\app`（已验证可用的 Vue 实现）
>
> **本文只写「现在到哪了、还差什么」**。通道、参数、数据契约等技术事实见 `PS-CHANNEL-NOTES.md`，
> 写法规矩见 `CONVENTIONS.md`。旧版本里「应用颜色 ❌」「写函数全缺」等结论已全部失效，见第三节。

---

## 一、当前能力矩阵

图例：✅ 真机通过 ｜ 🔧 已实现待真机确认 ｜ ❌ 未实现 ｜ — 不需要

### 1.1 显示（读）

| 能力 | 状态 | 位置 |
|---|---|---|
| 读索引 `sj_kuStoreInfo.ini` | ✅ | `repo/style-repo.ts` |
| 三种库形态（groups / flat / container） | ✅ 单测 + 真实数据 | `domain/ku-format.ts` |
| 四类项归一化（颜色 / 渐变 / 字体 / 样式） | ✅ 真实数据 | `domain/style-library.ts` |
| 分组折叠（默认只展开第一组） | ✅ | `features/style/StylePage.tsx` |
| 展开状态持久化 | ✅ | `hooks/usePersisted` + `core/prefs` |
| 失败如实显示（`NOT_FOUND` / `CORRUPT` / `IO_ERROR` 分说，IO 可重试） | ✅ | `components/StateHint` |
| 样式缩略图 / 渐变图 | 🔧 | `core/paths` `userAssetUrl` |
| 仓库下拉 | 🔧 原生 `<Select>` | 未对齐原版自定义下拉（36px、蓝仓库名、带图标） |

### 1.2 应用（写 PS）

| 能力 | 通道 | 状态 |
|---|---|---|
| 颜色（普通 / 形状 / 智能对象 / 文字） | 自有 `mm_style_applyColor` | ✅ |
| 渐变 | `ps_onJsx` + `ys_useGradient` | ✅ |
| 图层样式 | `ps_onJsx` + `ps_ysBtnUseStyle` | ✅ |
| 字体（先检查再应用） | 直调 `ys_checkUseFont` / `ys_useFont` | ✅ |
| ctrl + 点 → 只改形状填充 | `mm_style_applyShapeFill` | ✅ |
| shift + 点 → 只改描边 | `mm_style_applyBorderColor` | ✅ |
| alt + 点 → 改色 | `cy_changeStyleColor` | ❌ |

### 1.3 编辑（写库）

| 能力 | 状态 | 说明 |
|---|---|---|
| 删除分组 / 项 | ✅ 真机 | `.bak` 已确认生成 |
| 重命名分组 / 项 | ✅ 真机 | 内联输入，Enter / Esc / 失焦 |
| 同组内拖拽排序 | ✅ 真机 | 300ms 长按 |
| 跨组拖拽项 | 🔧 | 落点从「组容器」改为「整个列表」 |
| 分组拖拽排序 | 🔧 | 长按分组标题纵向拖 |
| 新建分组（底部栏 4 个按钮 + 右键「创建新组」） | 🔧 | 内联输入，不弹窗 |
| 折叠写回库（`show` 字段） | 🔧 | 折叠是库字段，不是纯前端状态 |
| 添加当前前景色到分组 | 🔧 待验证 | 组末尾「+」，`mm_style_getForegroundColor` |
| 添加渐变 / 字体 / 样式到分组 | ❌ | 点了明确提示未实现，不静默 |
| 仓库管理（新建 / 重命名 / 删除仓库） | ❌ | 只有 `mutateIndex` 预留 |

### 1.4 导入导出 / 联动

| 能力 | 状态 | 缺什么 |
|---|---|---|
| 导入 / 导出（`.kux` 等） | ❌ 按钮置灰 | `domain/ku-io.ts`（13 导出）+ `style-library-io.ts`（3 导出）+ 文件对话框 |
| 发送到色板 / 追加到色板 | ❌ 菜单置灰 | 色板 store + `com.fengzi.event.seban` 事件 |
| 快速吸色到组 | ❌ 菜单置灰 | 取色浮层 `usePointPopover` 等价物 |
| 发送 / 移动到仓库 | ❌ 菜单置灰 | 仓库管理 + 项跨仓库移动 |

### 1.5 UI 对齐

| 项 | 现状 | 原版 |
|---|---|---|
| 色块 / 渐变 / 字体 / 样式尺寸 | ✅ 已按原版（25×25 / 50×26 r4 / 70×44 r4 / 26×26） | 四库尺寸不共用 |
| tab | ✅ 四等分 + 1px 竖线 + 选中 `#006fff` | 同 |
| 底栏 | ✅ 26px 图标条，4 个新建 + 导入导出 | 同 |
| 三层底色 | ✅ 页面 `#363636` / 仓库条 `#282828` / 底栏 `#535353` | 同 |
| 顶部标题栏 | ⚠️ 多一行「猫猫设计工具 / 诊断 / 版本」 | 原版没有，标题在左侧导航 |
| 回顶按钮 | ❌ | 右下角 ↑ |
| 分组头字号 / 颜色 | ⚠️ 12px | 更小，组名灰色 |

---

## 二、剩余缺口（按优先级）

### P0 · 需要一次真机确认（改过 UI / 路径，未复验）

1. 样式缩略图、渐变图能否正常显示（`userAssetUrl` 补了 `SheJiZhuLi` 根之后）
2. 底栏图标尺寸与间距（20px 图标 / 26px 按钮 / 1px 竖线）
3. 「添加前景色」按钮（组末尾「+」）

### P1 · 功能补齐（按性价比）

| # | 缺口 | 需要什么 | 规模 |
|---|---|---|---|
| 1 | 渐变「+」 | 读当前图层渐变：`ys_getGradientInfo` 或 `ys_getGradient` | 中 |
| 2 | 字体「+」 | 读文字图层属性：`ys_getFontInfo` 返回 `{ fonts: [...] }`，结构与库项一致 | 中 |
| 3 | alt + 点改色 | `cy_changeStyleColor`（走 `ps_onJsx`） | 小 |
| 4 | 样式「+」 | 要把图层样式存成 `kuStyle/<groupId>.psd` + 缩略图，是写文件 | 大 |
| 5 | 仓库管理 | `selectWarehouse` / `addWarehouse` / `renameWarehouse` / `deleteWarehouse`（删仓库要清图片，需目录枚举） | 中 |

### P2 · 联动与导入导出

| # | 缺口 | 依赖 |
|---|---|---|
| 1 | 发送 / 追加到色板 | 色板 store + `com.fengzi.event.seban` |
| 2 | 快速吸色到组 | 取色浮层 + 屏幕取色 |
| 3 | 导入 / 导出 | `ku-io.ts` + `style-library-io.ts` + `showOpenDialogEx` |
| 4 | 发送 / 移动到仓库 | 仓库管理（P1-5） |

### P3 · UI 收尾

1. 仓库下拉换自定义（36px、蓝色仓库名、带图标）
2. 去掉顶部标题栏，诊断入口挪到导航底部
3. 回顶按钮
4. 分组头字号 / 颜色对齐

---

## 三、已失效的旧结论（不要照着做）

本文档旧版本与 `REVIEW-2026-10-27-2.md` 里以下说法**已经不成立**：

| 旧说法 | 现在的事实 |
|---|---|
| `ys_useStyleColor` 抛异常，颜色应用待验证 | 颜色改走自有 `mm_style_applyColor`，已真机通过；`ys_useStyleColor` **不再使用** |
| 渐变 / 图层样式「已接但未验证」 | 均走 `ps_onJsx`，已真机通过 |
| 字体应用 ❌ | 直调通道，已真机通过 |
| ctrl / shift 修饰键 ❌ | 已真机通过 |
| `ku-format.ts` 全缺 | 已完成（三形态 + base64），19 个单测 |
| `readKuItem` 缺，用 `raw` 字段绕过 | 已实现，且 `raw` 字段已删除（原始项只从磁盘读） |
| `useDismiss` / `usePersisted` / `useLongPressDrag` 全缺 | 均已实现并被页面使用 |
| 右键菜单 / 确认弹窗 / 空状态缺 | 前两个已实现；空状态用 `StateHint` |
| repo 16 个写函数全缺 | 8 个已实现并真机通过（分组 5 + 项 3），其余按需补 |
| 跨组拖拽未实现 | 已实现（项跨组 + 分组排序） |
| 样式页 717 行 | 已拆为 245 行 + `useStyleActions` + 4 组件 |

---

## 四、规模对照（2026-10-27 上午快照）

补实现之前的对照，留着说明「为什么不能一次抄完」，不代表当前差距：

| 层 | app | 当时本项目 |
|---|---|---|
| `domain/style-library.ts` | 13.8 KB / 8 导出 | 7 KB / 8 导出 |
| `domain/ku-format.ts` | 7.5 KB / 5 导出 | 无 |
| `domain/ku-io.ts` | 12.5 KB / 13 导出 | 无（仍未做） |
| `cep/data/style-library-repo.ts` | 39 KB / 29 导出 | 2 KB / 2 导出 |
| `cep/data/style-library-io.ts` | 19.6 KB / 3 导出 | 无（仍未做） |
| `commands/style.ts` | 22.9 KB / 34 命令 | 1 KB / 3 命令 |
| `composables/*` | 8 个 / 29 KB | 5 个 hook（等价能力） |

结论没变：**导入导出（`ku-io` + `style-library-io`）是唯一还差一个量级的部分**，其余已基本对齐。

---

## 五、下一步建议

```
1. 真机复验 P0 三项（缩略图 / 底栏尺寸 / 添加前景色）
2. 补 P1 里成本最低的两个：alt 改色、渐变「+」
3. 字体「+」（结构已明确，读 ys_getFontInfo 直接存项）
4. 仓库管理（含目录枚举，删仓库要清图片）
5. 导入导出（最后做，涉及 zip 与文件对话框）
```
