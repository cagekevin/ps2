#!/usr/bin/env node
/**
 * 【范本】新增 feature 脚手架
 * 用法：npm run new:feature -- <name>
 * 生成唯一允许的目录结构与模板，避免每个人写出不同写法。
 * 改这里等于改所有新页面的初始结构，改动前先更新 CONVENTIONS.md。
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const raw = process.argv[2];
if (!raw) {
  console.error('用法: npm run new:feature -- <name>');
  process.exit(1);
}

const name = raw.toLowerCase().replace(/[^a-z0-9-]/g, '');
if (!name) {
  console.error('name 只能包含字母、数字和短横线');
  process.exit(1);
}

const pascal = name.replace(/(^|-)([a-z0-9])/g, (_, __, ch) => ch.toUpperCase());
const dir = join(process.cwd(), 'src', 'features', name);

if (existsSync(dir)) {
  console.error(`目录已存在: ${dir}`);
  process.exit(1);
}

mkdirSync(join(dir, 'components'), { recursive: true });
mkdirSync(join(dir, 'hooks'), { recursive: true });

writeFileSync(
  join(dir, `${pascal}Page.tsx`),
  `import { useEffect, useState } from 'react';
import { log } from '../../core/logger';
import './${pascal}Page.css';

export default function ${pascal}Page() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    log.info('${name} 页面已加载');
    setReady(true);
  }, []);

  return (
    <section className="mm-${name}">
      <h1 className="mm-${name}__title">${pascal}</h1>
      <p className="mm-${name}__hint">{ready ? '待实现' : '加载中…'}</p>
    </section>
  );
}
`,
  'utf8'
);

writeFileSync(
  join(dir, `${pascal}Page.css`),
  `.mm-${name} {
  padding: var(--mm-space-3);
}

.mm-${name}__title {
  margin: 0 0 var(--mm-space-2);
  font-size: var(--mm-font-md);
  font-weight: normal;
  color: var(--mm-color-text);
}

.mm-${name}__hint {
  margin: 0;
  font-size: var(--mm-font-sm);
  color: var(--mm-color-text-dim);
}
`,
  'utf8'
);

writeFileSync(
  join(dir, 'api.ts'),
  `/**
 * ${name} 的请求封装
 * 接口 key 必须先登记到 core/http/endpoints.ts，再用 request('key')。
 * 类型会自动推导，不要写泛型。
 */
import { request } from '../../core/http/client';
import type { Result } from '../../types/result';

export function load${pascal}(): Promise<Result<unknown>> {
  // TODO: 换成已登记的 endpoint key，例如 request('syncFileList')
  return Promise.resolve({ ok: false, code: 'VALIDATION', message: '接口未接入' });
}
`,
  'utf8'
);

writeFileSync(
  join(dir, 'types.ts'),
  `/** ${name} 模块的局部类型 */
export interface ${pascal}Item {
  id: string;
  name: string;
}
`,
  'utf8'
);

console.log(`已生成 features/${name}/`);
console.log('下一步：');
console.log(`  1. 在 src/app/router.tsx 注册（懒加载）`);
console.log(`  2. 需要全局状态时在 src/store/ 新建切片，不要塞进别人的`);
