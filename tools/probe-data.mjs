#!/usr/bin/env node
/**
 * 数据可用性探针
 * 用和 core/storage 相同的路径规则读本机真实数据，验证底层能承接。
 * 只读，不写任何文件。
 */
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const userData = join(homedir(), 'AppData', 'Roaming');
const legacyDir = join(userData, 'SheJiZhuLi');
const dataDir = join(userData, 'Maomao');

function readJson(file) {
  const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(text);
}

console.log('用户目录:', userData);
console.log('legacy 根:', legacyDir, existsSync(legacyDir) ? '[存在]' : '[不存在]');
console.log('data 根  :', dataDir, existsSync(dataDir) ? '[存在]' : '[不存在]');
console.log('');

const indexPath = join(legacyDir, 'sj_kuStoreInfo.ini');
if (!existsSync(indexPath)) {
  console.log('未找到 sj_kuStoreInfo.ini，样式库可能未使用过');
  process.exit(0);
}

const index = readJson(indexPath);
const list = Array.isArray(index.list) ? index.list : [];
console.log(`仓库数: ${list.length}，当前索引: ${index.index}`);
console.log('');

const KINDS = ['color', 'gradient', 'font', 'style'];

for (let i = 0; i < list.length; i++) {
  const warehouse = list[i];
  const mark = i === index.index ? '*' : ' ';
  console.log(`${mark} [${i}] ${warehouse.name}`);
  for (const kind of KINDS) {
    const file = warehouse[kind];
    if (typeof file !== 'string' || !file) {
      console.log(`     ${kind.padEnd(8)} 未登记`);
      continue;
    }
    const full = join(legacyDir, file);
    if (!existsSync(full)) {
      console.log(`     ${kind.padEnd(8)} ${file} [文件缺失]`);
      continue;
    }
    try {
      const groups = readJson(full);
      const groupCount = Array.isArray(groups) ? groups.length : 0;
      const itemCount = Array.isArray(groups)
        ? groups.reduce((n, g) => n + (Array.isArray(g?.list) ? g.list.length : 0), 0)
        : 0;
      console.log(`     ${kind.padEnd(8)} ${file} → ${groupCount} 组 / ${itemCount} 项`);
    } catch (error) {
      console.log(`     ${kind.padEnd(8)} ${file} [解析失败: ${error.message}]`);
    }
  }
}
