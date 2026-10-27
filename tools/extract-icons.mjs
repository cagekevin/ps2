#!/usr/bin/env node
/**
 * 从 app.v4.js 提取 SVG symbol，生成 React 图标组件
 * 用法：node tools/extract-icons.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = 'C:/Users/xinye/Downloads/稿定设计助理-本地模式/源码工程/psz-panel-v4/src/entry/app-main.js';
const OUT_DIR = join(ROOT, 'src', 'components', 'icons');

if (!existsSync(SRC)) {
  console.error('找不到 app-main.js:', SRC);
  process.exit(1);
}

const text = readFileSync(SRC, 'utf8');

/* 字符串里是 \" 转义，先还原成普通引号 */
const unescaped = text.replace(/\\"/g, '"');

const symbolRe = /<symbol id="(icon-[^"]+)" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g;
const symbols = [];
let match;
while ((match = symbolRe.exec(unescaped))) {
  const [, id, viewBox, inner] = match;
  if (symbols.some((s) => s.id === id)) continue;
  symbols.push({ id, viewBox, inner });
}

console.log('提取到 symbol:', symbols.length);
for (const s of symbols) console.log(' ', s.id, s.viewBox, s.inner.length, 'chars');

if (!symbols.length) {
  console.error('没有提取到任何 symbol');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

/* 只保留导航相关 + 常用图标 */
const NAV_IDS = symbols.map((s) => s.id);

const lines = [];
lines.push('/**');
lines.push(' * 图标组件');
lines.push(' * 由 tools/extract-icons.mjs 从原版 app.v4.js 提取，不要手改。');
lines.push(' * 用法：<Icon name="icon-nav_mobanku" />');
lines.push(' */');
lines.push("import type { SVGProps } from 'react';");
lines.push('');
lines.push('export interface IconProps extends SVGProps<SVGSVGElement> {');
lines.push('  name: IconName;');
lines.push('  size?: number;');
lines.push('}');
lines.push('');
lines.push('export type IconName =');
lines.push(NAV_IDS.map((id) => `  | '${id}'`).join('\n') + ';');
lines.push('');
lines.push('interface IconData {');
lines.push('  viewBox: string;');
lines.push('  /** 内部 path 片段，来自原版 sprite */');
lines.push('  inner: string;');
lines.push('}');
lines.push('');
lines.push('const ICONS: Record<IconName, IconData> = {');
for (const s of symbols) {
  lines.push(`  '${s.id}': {`);
  lines.push(`    viewBox: '${s.viewBox}',`);
  lines.push(`    inner: ${JSON.stringify(s.inner.trim())}`);
  lines.push('  },');
}
lines.push('};');
lines.push('');
lines.push('export function Icon({ name, size = 24, ...rest }: IconProps) {');
lines.push('  const data = ICONS[name];');
lines.push('  if (!data) return null;');
lines.push('  return (');
lines.push('    <svg');
lines.push('      viewBox={data.viewBox}');
lines.push('      width={size}');
lines.push('      height={size}');
lines.push('      fill="currentColor"');
lines.push('      aria-hidden="true"');
lines.push('      {...rest}');
lines.push('      dangerouslySetInnerHTML={{ __html: data.inner }}');
lines.push('    />');
lines.push('  );');
lines.push('}');
lines.push('');

writeFileSync(join(OUT_DIR, 'index.tsx'), lines.join('\n'), 'utf8');
console.log('\n已生成', join(OUT_DIR, 'index.tsx'));
