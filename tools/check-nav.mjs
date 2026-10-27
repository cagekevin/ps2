#!/usr/bin/env node
/**
 * 导航与路由一致性自检
 * 防止「导航有项但路由没注册」或「路由存在但导航看不见」。
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const navText = readFileSync(join(root, 'src', 'app', 'nav-config.ts'), 'utf8');
const routerText = readFileSync(join(root, 'src', 'app', 'router.tsx'), 'utf8');

const items = [...navText.matchAll(/\{[^{}]*key: '([^']+)'[^{}]*path: '([^']+)'[^{}]*implemented: (true|false)[^{}]*\}/g)]
  .map((match) => ({ key: match[1], path: match[2], implemented: match[3] === 'true' }));

const routes = [...routerText.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]);

if (!items.length) {
  console.error('没有解析到任何导航项，检查 nav-config.ts 格式');
  process.exit(1);
}

/** 有路由但不在导航里的页面（调试页等） */
const EXEMPT_ROUTES = ['/debug'];

const problems = [];

for (const item of items) {
  if (!item.implemented) continue;
  if (!routes.includes(item.path)) {
    problems.push(`导航项「${item.key}」标记已实现，但 router 没有 ${item.path}`);
  }
}

for (const route of routes) {
  if (route === '/' || route === '*') continue;
  if (EXEMPT_ROUTES.includes(route)) continue;
  if (!items.some((item) => item.path === route)) {
    problems.push(`router 有 ${route}，但 nav-config 没有登记`);
  }
}

if (problems.length) {
  console.error('导航自检失败:');
  for (const problem of problems) console.error('  -', problem);
  process.exit(1);
}

const implemented = items.filter((item) => item.implemented).length;
console.log(`导航自检通过：${items.length} 项（已实现 ${implemented}），路由 ${routes.length} 条`);
