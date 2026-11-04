#!/usr/bin/env node
/**
 * 面板图标栅格化：源 SVG → CEP 图标档（public/icons/，Vite 原样拷进 dist）
 * 用法：node tools/rasterize-icon.mjs
 * SVG→PNG 唯一入口：headless Edge 截图，不引任何栅格化依赖（GOVERNANCE §二 #5）。
 * CEP 约定：23×23 常态 + 同名 @2x 46×46 高清；DarkNormal 浅描边（暗面板）/ LightNormal 深描边（亮面板），各带 rollover。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const SRC = 'C:/Users/xinye/Downloads/withicons--cat-sketch.svg';
const OUT = join(root, 'public', 'icons');

if (!existsSync(SRC)) {
  console.error(`找不到源 SVG: ${SRC}`);
  process.exit(1);
}

const edge = [
  process.env.EDGE,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].filter(Boolean).find((p) => existsSync(p));
if (!edge) {
  console.error('找不到 Edge，可设 EDGE=msedge.exe 路径后重跑');
  process.exit(1);
}

const svg = readFileSync(SRC, 'utf8');

/* 描边色取 tokens 既有文字档：常态 text 系、hover 用 strong/faint 对照；亮色主题取对照深灰 */
const VARIANTS = [
  { file: 'icon-dark.png', color: '#d6d6d6', size: 23 },
  { file: 'icon-dark@2x.png', color: '#d6d6d6', size: 46 },
  { file: 'icon-dark-rollover.png', color: '#f5f5f5', size: 23 },
  { file: 'icon-dark-rollover@2x.png', color: '#f5f5f5', size: 46 },
  { file: 'icon-light.png', color: '#464646', size: 23 },
  { file: 'icon-light@2x.png', color: '#464646', size: 46 },
  { file: 'icon-light-rollover.png', color: '#1d1d1d', size: 23 },
  { file: 'icon-light-rollover@2x.png', color: '#1d1d1d', size: 46 }
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const { file, color, size } of VARIANTS) {
  const colored = svg.replaceAll('currentColor', color);
  const html = `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${colored}`;
  const target = join(OUT, file);
  execFileSync(edge, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${size},${size}`,
    /* 透明底：RRGGBBAA 全 0 = 全透明（PS 图标栏底色由主题给，不许 PNG 自带底） */
    '--default-background-color=00000000',
    `--screenshot=${target}`,
    `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
  ], { stdio: 'pipe', timeout: 30000 });
  if (!existsSync(target) || statSync(target).size === 0) {
    console.error(`截图失败: ${file}`);
    process.exit(1);
  }
  console.log(`${file}  ${statSync(target).size}B`);
}
