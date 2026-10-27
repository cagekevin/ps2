# 命令层（commands）

> 【范本】业务动作层，夹在页面和 PS 原子能力之间。
> **一个命令 = 一个用户意图**，不做 UI，不弹提示，不直接调 `evalScript`。

## 判定：写进 core/ps 还是 commands

| 情况 | 放哪 |
|---|---|
| 一次 `evalScript`，无业务分支 | `core/ps/<域>.ts` |
| 多次原子调用 + 业务判断 | `commands/<域>.ts` |
| 需要写库 / 读库 | `commands/<域>.ts` |
| 只管交互和渲染 | `features/<域>/` |

一句话：**需要判断、组合、写盘，就进 commands。**

## 三条硬规则

1. **不碰 DOM**，不弹 toast，只返回 `Result<T>`
2. **不直接 `evalScript`**，一律走 `core/ps`
3. **不做 UI 状态**，loading / 提示由页面决定

## 依赖方向

```
features → commands → store → core
```

`commands` 可以依赖 `core`、`store`、`types`；**禁止**依赖 `features`、`components`、`app`。

## 范本

```ts
// src/commands/swatch.ts
import { getLayerKind } from '../core/ps/layer';
import { setShapeFill } from '../core/ps/shape';
import { fail, type Result } from '../types/result';
import type { Color } from '../types/color';

/**
 * 给当前图层上色。
 * 业务判断（按图层类型分流）在命令层，页面不需要知道这些分支。
 */
export async function applyColor(color: Color): Promise<Result<void>> {
  const kind = await getLayerKind();
  if (!kind.ok) return kind;

  switch (kind.data) {
    case 'shape':
      return setShapeFill(color);
    // 文字、普通图层、智能对象：等 core/ps 补出对应能力后再加分支，
    // 不允许在命令层自己 evalScript 绕过。
    default:
      return fail('VALIDATION', '当前图层类型暂不支持上色');
  }
}
```

页面调用：

```tsx
const result = await loading.run(() => applyColor(color));
if (!result.ok) toast.error(result.message);
```

## 命名

| 类型 | 规则 | 例子 |
|---|---|---|
| 文件 | 按业务域，不用动词 | `swatch.ts`、`style.ts`、`layer.ts` |
| 函数 | 动词开头，一个意图 | `applyColor`、`deleteGroup`、`moveItemTo` |
| 返回 | 一律 `Result<T>` | 不抛异常 |

## 不要做的事

- 不要建命令注册表（`id: 'style.applyColor'` 那种）。直接 `import` 是编译期检查，注册表是运行时报错。
- 不要在命令里弹 toast。页面才知道该用什么形式提示。
- 不要把「应用颜色」和「写最近使用」塞进同一个命令。
