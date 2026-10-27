#!/usr/bin/env node
/**
 * 从 icons-sprite.svg 生成 React 图标组件
 * 用法：node tools/build-icons.mjs
 *
 * 只提取白名单内的图标，避免把 189 个 symbol 全打进包里。
 * 需要新图标时往 WHITELIST 里加 id，重新运行。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SPRITE = join(ROOT, 'src', 'assets', 'icons-sprite.svg');
const OUT_DIR = join(ROOT, 'src', 'components', 'icons');

/** 导航图标 + 后续页面常用的少量图标 */
const WHITELIST = [
  'icon-nav_mobanku',
  'icon-nav_sucaiku',
  'icon-nav_zidingyikuangjia',
  'icon-nav_changyonggongneng',
  'icon-nav_zitimianban',
  'icon-nav_zitiguanli',
  'icon-nav_yangshiku',
  'icon-nav_dongzuoku',
  'icon-nav_chongmingmingtuceng',
  'icon-nav_piliangtaoban',
  /* 底部设置项 */
  'iconyonghushezhi',
  /* 样式页底栏：四个新建分组图标各不相同（原版就是四种）+ 导入 / 导出 */
  'iconchuangjian',
  'iconzitimianban',
  'iconxinjianyangshifenzu',
  'icondaoru',
  'icondaochu',
  /* 下拉箭头：原版分两种用途，不可混用
     iconzhankaizhedie —— 展开/折叠（可旋转 90°），分组头、仓库条
     iconxiala         —— 下拉选择（固定朝下），选择器触发器 */
  'iconzhankaizhedie',
  'iconxiala',
  /* 仓库图标（仓库条左侧） */
  'iconmorencangku',
  /* 选中勾（下拉列表当前项） */
  'icongouxuan'
];

if (!existsSync(SPRITE)) {
  console.error('找不到 sprite:', SPRITE);
  process.exit(1);
}

const svg = readFileSync(SPRITE, 'utf8');
const symbolRe = /<symbol id="([^"]+)"([^>]*)>([\s\S]*?)<\/symbol>/g;

const all = new Map();
let match;
while ((match = symbolRe.exec(svg))) {
  const [, id, attrs, inner] = match;
  const viewBox = /viewBox="([^"]+)"/.exec(attrs)?.[1] ?? '0 0 1024 1024';
  all.set(id, { viewBox, inner: inner.trim() });
}

const picked = [];
for (const id of WHITELIST) {
  const data = all.get(id);
  if (!data) {
    console.warn('缺少图标:', id);
    continue;
  }
  picked.push({ id, ...data });
}

console.log(`sprite 共 ${all.size} 个 symbol，提取 ${picked.length} 个`);

if (!picked.length) process.exit(1);

mkdirSync(OUT_DIR, { recursive: true });

const lines = [];
lines.push('/**');
lines.push(' * 图标组件');
lines.push(' * 由 tools/build-icons.mjs 从 assets/icons-sprite.svg 生成，不要手改。');
lines.push(' * 用法：<Icon name="icon-nav_mobanku" size={24} />');
lines.push(' *');
lines.push(' * 不用 <use href="#id">：旧版 Chromium 下会在父级重绘时重新解析 symbol，');
lines.push(' * 表现为图标闪烁。这里直接内联 path。');
lines.push(' */');
lines.push("import type { SVGProps } from 'react';");
lines.push('');
lines.push('export type IconName =');
lines.push(picked.map((item) => `  | '${item.id}'`).join('\n') + ';');
lines.push('');
lines.push('interface IconData {');
lines.push('  viewBox: string;');
lines.push('  inner: string;');
lines.push('}');
lines.push('');
lines.push('const ICONS: Record<IconName, IconData> = {');
for (const item of picked) {
  lines.push(`  '${item.id}': {`);
  lines.push(`    viewBox: '${item.viewBox}',`);
  lines.push(`    inner: ${JSON.stringify(item.inner)}`);
  lines.push('  },');
}
lines.push('};');
lines.push('');
lines.push('export interface IconProps extends Omit<SVGProps<SVGSVGElement>, \'name\'> {');
lines.push('  name: IconName;');
lines.push('  size?: number | string;');
lines.push('}');
lines.push('');
lines.push('export function Icon({ name, size = \'1em\', ...rest }: IconProps) {');
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
console.log('已生成', join(OUT_DIR, 'index.tsx'));
