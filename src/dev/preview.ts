/**
 * 仅开发用：给各页塞一份假数据，方便在浏览器里对照样式。
 *
 * 为什么需要它：CEP 面板在浏览器里没有 `window.__adobe_cep__`，读 PS 状态与库文件必然失败——
 * 样式页只剩空态、字体管理页读不到系统字体，看不到真实排版与间距，也就无从判断视觉是否统一。
 *
 * 生产不加载：`main.tsx` 用 `import.meta.env.DEV` 守卫 + 动态 import。
 * 删除本文件时，连 `main.tsx` 里那三行、以及 `features/font-manage/useFontManage.ts`
 * 的 DEV 分支一起删，不影响任何业务。
 *
 * 数据都是现造的，只是形状与体量贴近真实（上百项分组、长短不一的家族名），
 * 不冒充官方数据，也不写进任何文件。
 */
import type { Classification } from '../domain/classification';
import type { FontItem } from '../domain/font-item';
import type { KuGroup, KuItem, KuKind, StyleWarehouse } from '../domain/style-library';
import { DEFAULT_TEXT_INFO } from '../domain/text-info';
import { useCommonUseStore } from '../store/common-use';
import { useFontStore } from '../store/font';
import { useStyleLibraryStore } from '../store/style-library';
import { useTextStore } from '../store/text';

/* ---------- 字体管理页：家族名长短与字重数量都要照顾到极端情况 ---------- */
function fontItem(family: string, weights: string[]): FontItem {
  const ascii = family.replace(/\s+/g, '');
  return {
    family,
    weights,
    names: weights.map((weight) => `${family} ${weight}`),
    postScriptNames: weights.map((weight) => `${ascii}-${weight}`)
  };
}

const FAMILIES: ReadonlyArray<readonly [string, string[]]> = [
  ['思源黑体', ['Regular', 'Medium', 'Bold']],
  ['阿里巴巴普惠体', ['Light', 'Regular', 'Medium', 'Bold', 'Heavy']],
  ['HarmonyOS Sans SC', ['Regular', 'Medium', 'Bold', 'Black']],
  ['微软雅黑', ['Regular', 'Bold']],
  ['Source Han Serif SC', ['Regular', 'Bold']],
  ['方正兰亭黑简体', ['Regular', 'Medium', 'Bold']],
  ['PingFang SC', ['Ultralight', 'Thin', 'Light', 'Regular', 'Medium', 'Semibold']],
  ['Arial', ['Regular', 'Italic', 'Bold', 'Bold Italic']],
  ['Helvetica Neue', ['Thin', 'Light', 'Regular', 'Medium', 'Bold']],
  ['Times New Roman', ['Regular', 'Italic', 'Bold']],
  ['Bahnschrift', ['Light', 'Regular', 'Semibold', 'Bold']],
  ['Noto Sans SC', ['Thin', 'Light', 'Regular', 'Medium', 'Bold', 'Black']],
  ['站酷高端黑', ['Regular']],
  ['DengXian', ['Light', 'Regular', 'Bold']],
  ['Georgia', ['Regular', 'Italic', 'Bold']],
  ['Impact', ['Regular']],
  ['JetBrains Mono', ['Regular', 'Medium', 'Bold']],
  ['Cascadia Code', ['Regular', 'SemiBold', 'Bold']]
];

/** 字体管理页的假列表 */
export const PREVIEW_FONTS: FontItem[] = FAMILIES.map(([family, weights]) => fontItem(family, weights));

/* ---------- 样式页：四库各自的格子与分组 ---------- */
const PALETTE = [
  '#e05252', '#e08c52', '#dcdc52', '#8cc152', '#4caf50', '#4dd964',
  '#4db8ff', '#0f7df2', '#3f51b5', '#9c27b0', '#b44dff', '#e91e63',
  '#2b2b2b', '#535353', '#8a8a8a', '#b0b0b0', '#ececec', '#ffffff'
];

function item(name: string, extra: Partial<KuItem> = {}): KuItem {
  return { name, ...extra };
}

/** 用同一批色值铺满 n 个格子，名字逐个数递增，贴近真实库文件的密集团组 */
function spread(prefix: string, count: number, build: (index: number) => Partial<KuItem>): KuItem[] {
  return Array.from({ length: count }, (_, index) => item(`${prefix} ${index + 1}`, build(index)));
}

function colorGroups(): KuGroup[] {
  return [
    { name: '常用色', show: true, items: spread('灰', 12, (i) => ({ swatch: PALETTE[(i + 12) % PALETTE.length] })) },
    { name: '品牌色', show: true, items: spread('品牌', 8, (i) => ({ swatch: PALETTE[i] })) },
    { name: '辅助色', show: true, items: spread('辅助', 10, (i) => ({ swatch: PALETTE[(i + 4) % PALETTE.length] })) },
    { name: '已归档', show: false, items: spread('旧', 6, (i) => ({ swatch: PALETTE[(i + 8) % PALETTE.length] })) }
  ];
}

function gradientGroups(): KuGroup[] {
  const stops = (from: string, to: string): Partial<KuItem> => ({
    swatch: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
  });
  return [
    {
      name: '双色',
      show: true,
      items: [
        item('红橙', stops('#e05252', '#e08c52')),
        item('橙黄', stops('#e08c52', '#dcdc52')),
        item('黄绿', stops('#dcdc52', '#8cc152')),
        item('蓝青', stops('#4db8ff', '#4dd964')),
        item('蓝紫', stops('#0f7df2', '#b44dff')),
        item('紫粉', stops('#b44dff', '#e91e63'))
      ]
    },
    {
      name: '多段',
      show: true,
      items: spread('彩虹', 6, (i) => ({
        swatch: `linear-gradient(135deg, ${PALETTE[i]} 0%, ${PALETTE[(i + 3) % PALETTE.length]} 50%, ${PALETTE[(i + 6) % PALETTE.length]} 100%)`
      }))
    }
  ];
}

function fontGroups(): KuGroup[] {
  const weights = ['Regular', 'Medium', 'Bold', 'Black'];
  const sizes = ['18', '24', '36', '48'];
  return [
    {
      name: '中文',
      show: true,
      items: Array.from({ length: 10 }, (_, i) =>
        item(`${FAMILIES[i]?.[0] ?? `字体 ${i + 1}`}`, {
          fontPreview: {
            count: (i % 4) + 1,
            size: sizes[i % sizes.length] ?? '24',
            color: '#ececec',
            family: FAMILIES[i]?.[0] ?? '思源黑体',
            weight: weights[i % weights.length] ?? 'Regular',
            scriptFamily: 'Simplified'
          }
        })
      )
    },
    { name: '英文', show: true, items: spread('Serif', 6, (i) => ({
      fontPreview: { count: 1, size: '24', color: '#ececec', family: 'Georgia', weight: i % 2 ? 'Bold' : 'Regular', scriptFamily: 'Latin' }
    })) }
  ];
}

function styleGroups(): KuGroup[] {
  return [
    { name: '投影', show: true, items: spread('投影', 9, (i) => ({ thumb: `style-${i + 1}.png` })) },
    { name: '描边', show: true, items: spread('描边', 7, (i) => ({ thumb: `stroke-${i + 1}.png` })) },
    { name: '质感', show: true, items: spread('质感', 8, (i) => ({ thumb: `tex-${i + 1}.png` })) }
  ];
}

function previewLibraries(): Record<KuKind, KuGroup[]> {
  return {
    color: colorGroups(),
    gradient: gradientGroups(),
    font: fontGroups(),
    style: styleGroups()
  };
}

/* ---------- 字体管理页：标签、评分、分类 ---------- */
const PREVIEW_TAGS = [
  { text: '标题', arr: ['思源黑体', '阿里巴巴普惠体', '站酷高端黑'], xz: true },
  { text: '正文', arr: ['微软雅黑', 'PingFang SC', 'Noto Sans SC'], xz: true },
  { text: '英文', arr: ['Arial', 'Helvetica Neue', 'Georgia'], xz: true },
  { text: '代码', arr: ['JetBrains Mono', 'Cascadia Code'], xz: false }
];

const PREVIEW_STARS: Record<string, number> = {
  思源黑体: 5,
  阿里巴巴普惠体: 4,
  'HarmonyOS Sans SC': 5,
  微软雅黑: 3,
  'PingFang SC': 4,
  'JetBrains Mono': 5
};

const PREVIEW_CLASSIFICATION: Classification = {
  categories: [
    {
      key: 'language',
      name: '语言',
      tags: [
        { id: 1, category: 'language', name: '中文' },
        { id: 2, category: 'language', name: '英文' },
        { id: 3, category: 'language', name: '日文' }
      ]
    },
    {
      key: 'rating',
      name: '评分',
      extraTag: 0,
      tags: [3, 4, 5].map((star, index) => ({
        id: index + 10,
        category: 'rating',
        name: `${star} 星`,
        icon: 'star',
        repeat: star
      }))
    }
  ]
};

/* ---------- 字体面板页：文字属性 ---------- */
export function installPreviewData(): void {
  useTextStore.setState({
    info: {
      ...DEFAULT_TEXT_INFO,
      size: '24',
      weight: 'Regular',
      family: '思源黑体',
      leading: 12,
      tracking: 20,
      useAutoLeading: false,
      color: { r: 240, g: 240, b: 240 }
    },
    failure: null
  });

  /*
   * 把各 store 的 load 换成空操作：页面挂载时会调它，浏览器里读文件必然失败，
   * 而失败分支会清空 / 标记假数据，页面上只剩红字。dev 下不让它跑。
   */
  useFontStore.setState({
    tags: PREVIEW_TAGS,
    stars: PREVIEW_STARS,
    classification: PREVIEW_CLASSIFICATION,
    failures: { tags: null, stars: null, classification: null },
    dropped: { tags: [], stars: [] },
    /* 读成功 ⇒ 失败臂为空（`TD-09-4` 收窄后不再是 ok 结果） */

    loadTags: () => {},
    loadStars: () => {},
    loadClassification: () => {}
  });

  useCommonUseStore.setState({
    load: () => {},
    failures: { tiles: null, options: null }
  });

  const libraries = previewLibraries();
  useStyleLibraryStore.setState({
    indexFailure: null,
    warehouses: WAREHOUSES,
    activeIndex: 0,
    libraries,
    failures: { color: null, gradient: null, font: null, style: null },
    loading: false,
    load: async () => {},
    selectWarehouse: async () => {}
  });
}

const WAREHOUSES: StyleWarehouse[] = [
  { name: '默认仓库' },
  { name: '电商专用' },
  { name: '品牌 VI' },
  { name: '归档库' }
];
