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
  'icongouxuan',
  /* 字体管理页：搜索 / 筛选 / 更多菜单 / 刷新 / 关闭 / 删除 */
  'iconsousuo',
  'iconguolv',
  'icongengduocaidan',
  'iconshuaxin',
  'iconguanbi',
  'iconshanchu',
  /* 字体管理页：标签 / 眼睛（预览档位）/ 字号（预览文案） */
  'iconbiaoqian',
  'iconxianshi',
  'iconzihaodaxiao1',
  /* 字体面板页：顶部 6 个操作 + 角标（原版 baseIcon 的第二个 flex 子项） */
  'iconfanyi',
  'iconchaifen',
  'iconanniu',
  'iconfuzhiwenziyangshi',
  'iconniantiewenziyangshi',
  'icongenggaiwenbenfangxiang',
  'iconjiaobiao',
  /* 字体面板页：底部 4 组 12 个对齐图标（组四第一个 id 末尾带连字符，是原版的真实 id） */
  'iconzuoduiqi',
  'iconchuizhiduiqi',
  'iconyouduiqi',
  'iconchuizhijuzhongfenbu',
  'iconbeijingchuizhiduiqi',
  'iconchuizhifenbu',
  'icondingbuduiqi',
  'iconshuipingduiqi',
  'icondibuduiqi',
  'iconshuipingjuzhongfenbu',
  'iconbeijingshuipingduiqi-',
  'iconshuipingfenbu',
  /* 字体面板页：翻译交换 / 分布弹窗固定 / 层级预设 */
  'iconzhuanhuan',
  'icongudingxuanxiangye',
  'iconchangguicengjiyushe',
  /* 字体面板页：快捷字体的 7 个字重图标（1 上面已登记） */
  'iconzihaodaxiao2',
  'iconzihaodaxiao3',
  'iconzihaodaxiao4',
  'iconzihaodaxiao5',
  'iconzihaodaxiao6',
  'iconzihaodaxiao7',
  /* 字体面板页：属性面板样式行 + 字号/行距/字距输入 */
  'iconqingxie',
  'iconquanbudaxie',
  'iconwenbenduiqi1',
  'iconwenbenduiqi2',
  'iconwenbenduiqi3',
  'iconshezhizitidaxiao',
  'iconshezhihangju',
  'iconshezhijianju',
  /* 字体面板页：层级预设重命名（删除用 iconshanchu，上面已登记） */
  'iconshuru',
  /* 常用页：网格 14 项（顺序即官方 14 项种子，id 不是数字顺序，见 03 计划 §3.2） */
  'iconqianrutupian',
  'iconqianruduotupian',
  'icondaoruduotupian',
  'iconzidongtianchongyanse',
  'iconxiuzhengmohu',
  'icontianchongxiankuanghuhuan',
  'iconyouhuawendang',
  'iconzidingyibianhuan',
  'icondaochutupian',
  'iconcankaoxiangongju',
  'iconanjianjufenbu',
  'iconyuansutihuan',
  'iconweizhiduihuan',
  'icontucengyansehuhuan',
  /* 常用页缩放区的两个触发器：放大镜 + / 放大镜 −，必须是同一套。
     原版缩小用的是 `iconsuoxiao`（一条横杠），与放大镜不成对，已换成成对的 `iconshousuo` */
  'iconfangda',
  'iconshousuo',
  /* 常用页页头两个基础按钮：打开所在目录 / 重置常用项
     （`iconshuaxin` 前面已登记过，这里只补目录图标） */
  'iconwenjianjiamulu',
  /* 常用页：4 个「悬停换图」图标（种子里 fillSvg 是字符串时指向它们） */
  'iconzidongtianchongyanselan',
  'iconxiuzhengmohulan',
  'iconzidingyibianhuanlan',
  'iconanjianjufenbulan',
  /* 常用页：翻转 6 向（左右 / 上下 / 左 / 右 / 下 / 上） */
  'iconzuoyoufanzhuan',
  'iconshangxiafanzhuan',
  'iconxiangzuofanzhuan',
  'iconxiangyoufanzhuan',
  'iconxiangxiafanzhuan',
  'iconxiangshangfanzhuan',
  /* 常用页 v2 · 自定义变换面板的 6 个输入框左图标（顺序 = 官方 6 个输入：数量 / 比例 / 左右 / 上下 / 角度 / 透明度） */
  'iconfuzhishuliang',
  'iconsuofangbili',
  'iconzuoyoujuli',
  'iconzuoyoujuli-1',
  'iconxuanzhuanjiaodu',
  'icontoumingdudijian',
  /* 常用页 v2 · 导出面板「保存到」右侧的选目录图标 */
  'iconwenjianjiaguanli',
  /* 常用页 v2 · 九宫格锚点 9 格 × 2 态（常色 / 选中蓝）。命名没有连字符：
     `iconmaodianbianhuandianweizhi{n}` / `...weizhilan{n}`，照 sprite 原样 */
  'iconmaodianbianhuandianweizhi1',
  'iconmaodianbianhuandianweizhi2',
  'iconmaodianbianhuandianweizhi3',
  'iconmaodianbianhuandianweizhi4',
  'iconmaodianbianhuandianweizhi5',
  'iconmaodianbianhuandianweizhi6',
  'iconmaodianbianhuandianweizhi7',
  'iconmaodianbianhuandianweizhi8',
  'iconmaodianbianhuandianweizhi9',
  'iconmaodianbianhuandianweizhilan1',
  'iconmaodianbianhuandianweizhilan2',
  'iconmaodianbianhuandianweizhilan3',
  'iconmaodianbianhuandianweizhilan4',
  'iconmaodianbianhuandianweizhilan5',
  'iconmaodianbianhuandianweizhilan6',
  'iconmaodianbianhuandianweizhilan7',
  'iconmaodianbianhuandianweizhilan8',
  'iconmaodianbianhuandianweizhilan9'
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
lines.push('/**');
lines.push(' * 名字是否在图标表里。');
lines.push(' * 文件 / 记忆里来的图标 id 是字符串，渲染前必须过这道守卫——');
lines.push(' * 不允许 `as IconName`，那是把「图标没了」伪装成「图标画了」。');
lines.push(' */');
lines.push('export function isIconName(value: string): value is IconName {');
lines.push('  return Object.prototype.hasOwnProperty.call(ICONS, value);');
lines.push('}');
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
