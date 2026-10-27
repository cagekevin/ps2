/**
 * 字体项的运行时结构（家族名 + 字重 + 字体名 + PostScript 名）。
 *
 * 磁盘缓存 `SysFont2.json` 与 jsx 返还是同一份数据的两种键名：
 *   family / weights / names / postScriptNames  ← jsx / 页面
 *   name / zz / mz / hjm                        ← 磁盘缓存
 * 统一由 `font-normalize.ts` 转换，页面只认这里的形状。
 */
import { failWithDetail, ok, type Result } from '../types/result';

export interface FontItem {
  /** 家族名，如「思源黑体」 */
  family: string;
  /** 字重，如 Regular、Bold（与 names / postScriptNames 同索引） */
  weights: string[];
  /** 字体名 */
  names: string[];
  /** PostScript 名，应用字体时要传 */
  postScriptNames: string[];
}

/** 应用字体要传的三个明文参数（同一索引对齐） */
export interface FontFace {
  postScriptName: string;
  name: string;
  weight: string;
}

/**
 * 三个同索引数组的**唯一判据**：任一缺失就不发调用，缺哪个报哪个。
 *
 * 索引对不齐属于损坏数据：回落成 `family` / `'Regular'` 会被 PS 当成另一个字体，
 * 它报回的「字体不可用」会把真正的原因（缺名字）盖掉。
 */
export function resolveFontFace(font: FontItem, index: number): Result<FontFace> {
  const postScriptName = font.postScriptNames[index];
  const name = font.names[index];
  const weight = font.weights[index];

  const missing: string[] = [];
  if (!postScriptName) missing.push('PostScript 名');
  if (!name) missing.push('字体名');
  if (!weight) missing.push('字重');

  if (!postScriptName || !name || !weight) {
    return failWithDetail(
      'VALIDATION',
      `「${font.family}」第 ${index + 1} 个字重缺少${missing.join('、')}，无法应用`,
      `family:${font.family} index:${index}`
    );
  }

  return ok({ postScriptName, name, weight });
}
