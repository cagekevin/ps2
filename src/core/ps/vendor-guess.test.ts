/**
 * 「猜 vendor 返回」只允许在 `core/ps` 与 `core/cep` 内（`ADR-0003` 防御归属）。
 *
 * 这是**跨文件规范扫描**，不是自证式断言：它读的是别人写的源码，注入一处越界导入必红。
 * 加这条的原因：vendor 是 JSXBIN，返回形状只能在这两层里猜；一旦命令层 / 页面层
 * 自己 `parseJsxRaw` 或 `callJsx`，同一个 vendor 就有了第二份解释，改起来要顺着两处找。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = 'src';

/** 允许猜 vendor 的两层（含自身） */
const ALLOWED_PREFIXES = ['src/core/ps/', 'src/core/cep/'];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    /* 收集时统一成正斜杠：Windows 的 join 产出 `src\core\ps\...`，与 ALLOWED_PREFIXES 的
       正斜杠前缀永远不相等，会把 core/ps 自己的文件全判成越界（macOS 上则一直是绿的） */
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(path.replace(/\\/g, '/'));
  }
  return out;
}

function importsOf(file: string, pattern: RegExp): boolean {
  return pattern.test(readFileSync(file, 'utf8'));
}

describe('vendor 协议解析的边界', () => {
  const files = walk(SRC);

  it('raw 解析器（parseJsxRaw / unwrapRaw / lenientVoid …）只允许 core/ps 内导入', () => {
    const offenders = files
      .filter((file) => !file.startsWith('src/core/ps/'))
      .filter((file) => importsOf(file, /from '[^']*ps\/raw'/));

    expect(offenders).toEqual([]);
  });

  it('callJsx / evalScript 只允许 core/cep 与 core/ps 内导入', () => {
    /* 只禁「执行 vendor」的两个函数；`getUserDataPath` / `emitAppEvent` 等不算猜返回 */
    const offenders = files
      .filter((file) => !ALLOWED_PREFIXES.some((prefix) => file.startsWith(prefix)))
      .filter((file) => importsOf(file, /import\s*\{[^}]*\b(callJsx|evalScript)\b[^}]*\}\s*from\s*'[^']*bridge'/));

    expect(offenders).toEqual([]);
  });
});
