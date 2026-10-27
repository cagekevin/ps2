/**
 * 【范本】常用页文件形状与归一化（纯函数，零 IO、零 UI）
 *
 * 新增同类「官方带种子的 JSON 文件」照这个结构：种子逐字照抄 + 校验整份拒绝 + 视图投影只读。
 *
 * `sj_commonFunction.json` 的根是**裸数组**（14 项），不是对象——与样式库索引那种
 * `{ index, list }` 不同，判空方式别照抄。
 *
 * 项里会出现我们没见过的键（原版还会写 `sort` / `openistrue`），所以 `CommonUseItem`
 * 带索引签名：**未知键原样保留**，写回时丢掉的话官方面板就读不到了。
 *
 * 尺寸 / 文案 / id 顺序的唯一出处是这里：`COMMON_USE_SEED` 逐项照抄官方
 * `configReset()`（`app.v4.js:467000` 一带），要改先改 `docs/plan/03-常用-2026-10-27.md` §3.2。
 */

import { isRecord } from '../types/guards';
import { failWithDetail, ok, type Result } from '../types/result';

/** 一条常用项：官方写 10 个键，其余键不解释但不丢 */
export interface CommonUseItem {
  id?: string;
  isMore?: boolean;
  ismark?: boolean;
  isShow?: boolean;
  title?: string;
  svg?: string;
  /** 官方有 `false` 与「另一个图标 id」两种取值；`false` = 悬停不换图 */
  fillSvg?: boolean | string;
  moreId?: string;
  name?: string;
  comName?: string;
  [key: string]: unknown;
}

/** 文件根（裸数组） */
export type CommonUseFile = CommonUseItem[];

/** 页面视图：只留渲染要用的字段，排序用 `index`，缺 `id` 的项进不了视图 */
export interface CommonUseTile {
  id: string;
  /** 在文件里的下标（拖拽排序传的就是它） */
  index: number;
  name: string;
  title: string;
  icon: { rest: string; filled: string | null };
  isMore: boolean;
  ismark: boolean;
  visible: boolean;
  moreId: string;
  comName: string | null;
}

/**
 * 官方 14 项种子（顺序即官方顺序，**不是按 id 数字排**：第 10 项 `cya11`、第 14 项 `cya12`，
 * `cya10` / `cya16` 不存在）。
 *
 * `title` 逐字照抄，包含官方的空串（`cya4`）与明显串行的描述（`cya13` 是「分成多行文字图层」，
 * 与「按间距分布」不符）——照抄是因为改文案等于改行为对照表，不是漏。
 */
export const COMMON_USE_SEED: readonly CommonUseItem[] = [
  {
    id: 'div_img_cya1',
    isMore: true,
    ismark: true,
    isShow: true,
    title: '智能匹配图片到背景框(id嵌入图片)',
    svg: '#iconqianrutupian',
    fillSvg: false,
    moreId: 'img_cya1_gd',
    name: '嵌入图片',
    comName: 'comembed'
  },
  {
    id: 'div_img_cya2',
    isMore: false,
    ismark: false,
    isShow: true,
    title: '智能匹配多张图片到背景框(id嵌入图片)',
    svg: '#iconqianruduotupian',
    fillSvg: false,
    moreId: '',
    name: '嵌入多图片'
  },
  {
    id: 'div_img_cya3',
    isMore: true,
    ismark: true,
    isShow: true,
    title: '智能导入多张图片到背景框(id嵌入图片)',
    svg: '#icondaoruduotupian',
    fillSvg: false,
    moreId: 'img_cya3_gd',
    name: '导入多图片',
    comName: 'comimport'
  },
  {
    id: 'div_img_cya4',
    isMore: false,
    ismark: false,
    isShow: true,
    title: '',
    svg: '#iconzidongtianchongyanse',
    fillSvg: '#iconzidongtianchongyanselan',
    moreId: '',
    name: '自动填充颜色'
  },
  {
    id: 'div_img_cya5',
    isMore: false,
    ismark: false,
    isShow: true,
    title: '修正形状图层因小数点造成的模糊',
    svg: '#iconxiuzhengmohu',
    fillSvg: '#iconxiuzhengmohulan',
    moreId: '',
    name: '修正模糊'
  },
  {
    id: 'div_img_cya6',
    isMore: false,
    ismark: false,
    isShow: true,
    title: '填充线框互换',
    svg: '#icontianchongxiankuanghuhuan',
    fillSvg: false,
    moreId: '',
    name: '填充线框互换'
  },
  {
    id: 'div_img_cya7',
    isMore: true,
    ismark: true,
    isShow: true,
    title: '删除文档原数据，解决保存卡顿问题',
    svg: '#iconyouhuawendang',
    fillSvg: false,
    moreId: '',
    name: '优化文档',
    comName: 'comoptimization'
  },
  {
    id: 'div_img_cya8',
    isMore: true,
    ismark: false,
    isShow: true,
    title: '根据参数复制元素',
    svg: '#iconzidingyibianhuan',
    fillSvg: '#iconzidingyibianhuanlan',
    moreId: 'img_cya8_gd',
    name: '自定义变换',
    comName: 'comcustomChange'
  },
  {
    id: 'div_img_cya9',
    isMore: true,
    ismark: true,
    isShow: true,
    title: '快速导出JPG/PNG,默认使用Web格式，在设置里可以设置不压缩导出',
    svg: '#icondaochutupian',
    fillSvg: false,
    moreId: 'img_cya9_gd',
    name: '导出图片',
    comName: 'comexport'
  },
  {
    id: 'div_img_cya11',
    isMore: true,
    ismark: false,
    isShow: true,
    title: '切图使用',
    svg: '#iconcankaoxiangongju',
    fillSvg: false,
    moreId: 'img_cya11_gd',
    name: '参考线工具',
    comName: 'comreference'
  },
  {
    id: 'div_img_cya13',
    isMore: true,
    ismark: false,
    isShow: true,
    title: '将一行文字分成多行文字图层/合并多个文字图层',
    svg: '#iconanjianjufenbu',
    fillSvg: '#iconanjianjufenbulan',
    moreId: 'img_cya13_gd',
    name: '按间距分布',
    comName: 'comspacing'
  },
  {
    id: 'div_img_cya14',
    isMore: false,
    ismark: false,
    isShow: true,
    title: '将一个组的内容替换到另一个组',
    svg: '#iconyuansutihuan',
    fillSvg: false,
    moreId: '',
    name: '元素替换'
  },
  {
    id: 'div_img_cya15',
    isMore: false,
    ismark: false,
    isShow: true,
    title: '将两个图层位置进行调换',
    svg: '#iconweizhiduihuan',
    fillSvg: false,
    moreId: '',
    name: '位置对换'
  },
  {
    id: 'div_img_cya12',
    isMore: false,
    ismark: false,
    isShow: true,
    title: '将两个图层颜色进行调换',
    svg: '#icontucengyansehuhuan',
    fillSvg: false,
    moreId: 'img_cya12_gd',
    name: '图层颜色互换'
  }
];

/* ---------------- 折叠态（三个区域） ---------------- */

/** 三个可折叠区域的键，别的字符串一律不认 */
export const COMMON_SECTIONS = ['zoom', 'transformation', 'grid'] as const;

export type CommonSection = (typeof COMMON_SECTIONS)[number];

/**
 * 折叠态归一化：prefs 里是任意 JSON，**逐键判真假**，坏值 / 缺键都按「展开」。
 *
 * 原先 `store` 的读取与 `commands.setCollapsed` 的写入各写一遍同样的三个比较——
 * 同一判据两处实现，改一处就会一边认「1」一边不认。收成这一个函数。
 */
export function normalizeCollapsed(raw: unknown): Record<CommonSection, boolean> {
  const source = isRecord(raw) ? raw : {};
  return {
    zoom: source.zoom === true,
    transformation: source.transformation === true,
    grid: source.grid === true
  };
}

/** 图标 id 在文件里带前导 `#`（`#iconqianrutupian`），sprite 组件不收 */
function stripHash(value: string): string {
  return value.startsWith('#') ? value.slice(1) : value;
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * 文件 → 视图。
 *
 * `file` 为 `null` 表示「文件不存在」（首次运行），此时按种子渲染、**不写盘**。
 * `isShow` 缺失按「显示」处理：官方默认 `true`，缺键不是用户关掉了它。
 */
export function toTiles(file: CommonUseFile | null): CommonUseTile[] {
  const source = file ?? COMMON_USE_SEED;
  const tiles: CommonUseTile[] = [];

  for (let index = 0; index < source.length; index += 1) {
    const item = source[index];
    if (!item) continue;

    const id = textOf(item.id);
    /* 没有 id 的项无法排序 / 无法定位显隐，宁可不上屏也不要用下标冒充 id */
    if (!id) continue;

    const svg = textOf(item.svg);
    const filled = typeof item.fillSvg === 'string' && item.fillSvg ? stripHash(item.fillSvg) : null;
    const comName = textOf(item.comName);

    tiles.push({
      id,
      index,
      name: textOf(item.name),
      title: textOf(item.title),
      icon: { rest: svg ? stripHash(svg) : '', filled },
      isMore: item.isMore === true,
      ismark: item.ismark === true,
      visible: item.isShow !== false,
      moreId: textOf(item.moreId),
      comName: comName ? comName : null
    });
  }

  return tiles;
}

/**
 * 文件结构校验：根必须是数组，每项必须是对象且带字符串 `id`。
 *
 * 不做「跳过坏项继续」：坏一项就整份拒绝，`detail` 指出第几个——
 * 静默丢项等于把用户自定义的按钮悄悄删掉。
 */
export function parseCommonUseFile(raw: unknown): Result<CommonUseFile> {
  if (!Array.isArray(raw)) return failWithDetail('CORRUPT', '常用功能文件顶层不是数组', 'root');

  const file: CommonUseFile = [];
  for (let index = 0; index < raw.length; index += 1) {
    const item: unknown = raw[index];
    if (!isRecord(item)) {
      return failWithDetail('CORRUPT', '常用功能文件里存在非对象条目', `root[${index}]`);
    }
    if (typeof item.id !== 'string' || !item.id) {
      return failWithDetail('CORRUPT', '常用功能项缺少 id', `root[${index}].id`);
    }
    file.push(item);
  }

  return ok(file);
}
