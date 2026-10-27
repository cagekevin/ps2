/**
 * 字体分类数据（`%APPDATA%\SheJiZhuLi\classification.json`）的类型与解码。
 *
 * 纯函数：读取在 `repo/font-repo.ts`，筛选规则在 `font-filter.ts`。
 * 分组顺序按原版面板展示顺序；某个分组结构不认识就**跳过该组**，不整份拒绝。
 *
 * 只有「语言」组有消费点：评分 / 授权 / 类型 / 风格依赖云端字体数据，
 * 本面板不随包分发那份数据，也不拿 MOCK 冒充（计划 §1.2）。
 * `presets` / `commercials` 没有数据源，不落字段、不解码——留着会让筛选说出没根据的结论。
 */
import { isRecord } from '../types/guards';
import { fail, ok, type Result } from '../types/result';

export interface CategoryTag {
  id: number;
  category: string;
  name?: string;
  /** 评分类用图标重复次数，如 3 星 */
  icon?: string;
  repeat?: number;
}

export interface Category {
  key: string;
  name: string;
  /** 有值表示该组额外带一个「全部」项 */
  extraTag?: number;
  tags: CategoryTag[];
}

export interface Classification {
  categories: Category[];
}

const ORDER = ['rating', 'language', 'commercial', 'type', 'style'] as const;

/** 磁盘 tags → `CategoryTag[]`：字段逐项证明，坏条目丢弃（只读数据，不回写） */
export function toCategoryTags(raw: readonly unknown[]): CategoryTag[] {
  const out: CategoryTag[] = [];

  for (const tag of raw) {
    if (!isRecord(tag) || typeof tag.id !== 'number' || typeof tag.category !== 'string') continue;
    out.push({
      id: tag.id,
      category: tag.category,
      name: typeof tag.name === 'string' ? tag.name : undefined,
      icon: typeof tag.icon === 'string' ? tag.icon : undefined,
      repeat: typeof tag.repeat === 'number' ? tag.repeat : undefined
    });
  }

  return out;
}

export function emptyClassification(): Classification {
  return { categories: [] };
}

/** `classification.json` → Classification；顶层不是对象才整份失败 */
export function decodeClassification(raw: unknown): Result<Classification> {
  if (!isRecord(raw)) return fail('CORRUPT', '分类数据顶层不是对象');

  const rawCategories = isRecord(raw.categories) ? raw.categories : {};
  const categories: Category[] = [];

  for (const key of ORDER) {
    const item = rawCategories[key];
    if (!isRecord(item) || !Array.isArray(item.tags)) continue;

    const category: Category = {
      key,
      name: typeof item.name === 'string' ? item.name : key,
      tags: toCategoryTags(item.tags)
    };
    if (typeof item.extraTag === 'number') category.extraTag = item.extraTag;
    categories.push(category);
  }

  return ok({ categories });
}
