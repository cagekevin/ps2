# scripts/ —— 通用辅助脚本集合

> 本目录是**从其他项目带过来的通用脚本集合**，不全是本项目（maomao-design-tools）在用。
> 本项目的工程脚本在 `tools/`（`deploy` / `check-templates` / `check-nav` / `new-feature`），
> 实际命令以本项目 `package.json` 为准。

## 顶层保留（本项目可用 / 已适配）

| 脚本 | 用途 | 是否接入 npm |
| --- | --- | --- |
| `mv-sync-refs.mjs` | 改名 / 移动文件 + AST 全库同步 import 说明符（搬文件一律用它，禁手写 import 漂移） | 手动 |
| `probe.mjs` | 「先红后绿」探针执行器：临时注入 → 跑命令 → 精确断言 → 无条件还原（sha256 自校验，零污染） | 手动 |
| `check-any-honesty.mjs` | 类型诚实性门禁：补 tsc 看不见的 `as any` / `as never` / 未标注 `useState(null)`·`useRef(null)`；对齐 CONVENTIONS §17 禁 any | 手动（扫描根仅 `src`） |
| `ts-strict-detail.mjs` | 「最严格开关」只读明细 / 聚类 / 净减（真实根 tsconfig + CLI 追加开关，零副本、零写源码） | 手动 |
| `ts-strict-override.mjs` | `noImplicitOverride` 候选 dry-run 生成器（只产 diff，不写文件） | 手动 |

> 这几个脚本不依赖本项目的专有路径，可直接 `node scripts/<名>` 运行。

## 已归档（1mao-scripts/）

- 顶层其余脚本（契约 / 架构 / 节点 / 事件 / 存储键 / 上传目录 / 死代码 / 闸门元层 / 健康度 /
  测试门禁 / ADR / 债务账本 / Tailwind 抽取 / 弯路抽取 / 类型消化战役工具 / UI 几何测量 等）
  以及 `ui-geometry/`、`gates.manifest.json`、`dead-code-baseline.json`、`skill-segment-vectors.json`，
  全部移入 `1mao-scripts/`。
- 它们指向旧 1mao / 原型项目的专有路径（`localTool`、`src/components/base/contracts.ts`、
  `canvas/nodes`、`daily/架构日志`、`docs/adr`、`knip`、`tailwind`、`tests/unit`、`@xyflow/react` 等），
  **在本项目中不存在，无法运行**，故不适合保留在顶层。
- `1mao-scripts/` 仅作历史对照 / 排障参考，**不在 npm scripts 中，默认不跑、不维护**。
  如需恢复长期复用，连同依赖移回 `scripts/` 根目录。

## 规范：一次性脚本归哪里

任何一次性 / 临时 / 探索性脚本，放进 `1mao-scripts/` 或新建独立文件夹，禁止直接丢进本目录。
本目录只保留**核心流水线**脚本（持续复用、被手动调用）。
