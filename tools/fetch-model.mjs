#!/usr/bin/env node
/**
 * 下载抠图模型到默认位置
 * 用法：npm run fetch:model [-- <目标路径>]
 *
 * 落点默认 `%APPDATA%\Maomao\assets\cut\model.onnx` —— 也就是 `CONVENTIONS` §5.2
 * 两条候选里的第 2 条。第 1 条（prefs `cut.model`）是用户在设置页自己选的，
 * 脚本**不碰**偏好：它只管把文件放到默认位置，放哪由用户决定。
 *
 * 模型不进仓库的原因见 `docs/plan/21` §2：176MB 超 GitHub 单文件上限，
 * 放进 `public/` 还会随每次部署拷进扩展目录。
 *
 * 下载后写一份 README.md 到同目录：那是给人看的「这是什么、能删吗」，
 * 不是给程序读的配置。
 */
import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

/* briaai/RMBG-1.4 的官方 onnx 导出（176,153,355 字节）。换模型只改这两行 */
const MODEL_URL = 'https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx';
const MODEL_BYTES = 176153355;

const root = resolve(import.meta.dirname, '..');
const override = process.argv[2];
const target =
  override ?? join(homedir(), 'AppData', 'Roaming', 'Maomao', 'assets', 'cut', 'model.onnx');

if (existsSync(target) && statSync(target).size === MODEL_BYTES) {
  console.log(`已存在，跳过: ${target}`);
  process.exit(0);
}

mkdirSync(dirname(target), { recursive: true });

console.log(`下载: ${MODEL_URL}`);
console.log(`目标: ${target}`);

const response = await fetch(MODEL_URL, { redirect: 'follow' });
if (!response.ok || !response.body) {
  console.error(`下载失败: HTTP ${response.status}`);
  process.exit(1);
}

/* 先写 .part 再改名：中途断掉不会留下一个「看起来能用」的半截模型 */
const partial = `${target}.part`;
await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));

const size = statSync(partial).size;
if (size !== MODEL_BYTES) {
  console.error(`大小不符: 期望 ${MODEL_BYTES}，实际 ${size}（可能被代理截断，重跑一次）`);
  process.exit(1);
}

/* 改名前清掉旧文件：Windows 上 rename 不能覆盖已存在的目标 */
if (existsSync(target)) rmSync(target, { force: true });
renameSync(partial, target);

writeFileSync(
  join(dirname(target), 'README.md'),
  [
    '# 抠图模型目录',
    '',
    '`model.onnx` 是 RMBG-1.4（ISNet，约 168MB）的 onnx 导出，供常用页「智能抠图」使用。',
    '',
    '- 来源：https://huggingface.co/briaai/RMBG-1.4 （`onnx/model.onnx`）',
    '- 重新下载：`npm run fetch:model`',
    '- 想放到别处：设置页 →「抠图模型」→「选择模型文件」，选一次即可（优先于本目录）',
    '- 可以删：删了只会让抠图报「没找到模型」，重新下载即恢复',
    '',
    '许可：RMBG-1.4 为非商用许可。自用无妨，对外分发前须换 BiRefNet（MIT）。',
    ''
  ].join('\n'),
  'utf8'
);

console.log(`完成: ${target}`);
console.log('下一步: 打开面板 → 常用 →「智能抠图」');
