import { describe, expect, it } from 'vitest';
import type { OcrBlock, OcrOffset } from '../types/ocr';
import { GROUP_GAP_RATIO, NAME_MAX, SIZE_MULTIPLIER } from '../config';
import { toOcrGroups } from './ocr';

/* 无选区导出：整画布，图片坐标就是文档坐标 */
const ORIGIN: OcrOffset = { left: 0, top: 0 };

function block(top: number, content: string, fontSize = 20, height = 20): OcrBlock {
  return { content, rect: { left: 0, top, width: 100, height }, fontSize };
}

describe('toOcrGroups', () => {
  it('间距超过「上一块字号 × 3」就开新组，组名按顺序编号', () => {
    const { groups } = toOcrGroups([block(0, 'A'), block(100, 'B'), block(130, 'C')], ORIGIN);

    /* 100 - (0+20) = 80 > 60 → 新组；130 - (100+20) = 10 → 同组 */
    expect(groups).toHaveLength(2);
    expect(groups[0]?.name).toBe('模块 1');
    expect(groups[0]?.layers.map((layer) => layer.content)).toEqual(['A']);
    expect(groups[1]?.name).toBe('模块 2');
    expect(groups[1]?.layers.map((layer) => layer.content)).toEqual(['B', 'C']);
  });

  it('间距正好等于阈值时不分段（判据是「大于」）', () => {
    /* 80 - (0+20) = 60 = 20 * GROUP_GAP_RATIO */
    const { groups } = toOcrGroups([block(0, 'A'), block(80, 'B')], ORIGIN);
    expect(GROUP_GAP_RATIO).toBe(3);
    expect(groups).toHaveLength(1);
  });

  it('字号乘 1.3，位置用未乘 1.3 的原字号下移', () => {
    const { groups } = toOcrGroups([block(100, 'A')], ORIGIN);
    const layer = groups[0]?.layers[0];

    expect(layer?.size).toBe(20 * SIZE_MULTIPLIER);
    expect(layer?.top).toBe(120);
  });

  it('选区导出的偏移加到左上角（识别坐标是图内坐标）', () => {
    const { groups } = toOcrGroups([block(100, 'A')], { left: 132, top: 645 });
    const layer = groups[0]?.layers[0];

    expect(layer?.left).toBe(132);
    /* 偏移加在「top + 字号」之外，两者互不覆盖 */
    expect(layer?.top).toBe(645 + 120);
  });

  it('图层名取内容前 15 字，换行折成空格', () => {
    const long = '一二三四五六七八九十一二三四五六七八九十';
    const { groups } = toOcrGroups([block(0, `第一行\r${long}`)], ORIGIN);
    const name = groups[0]?.layers[0]?.name ?? '';

    expect(name).toHaveLength(NAME_MAX);
    expect(name).not.toContain('\r');
    /* 建层的 content 保留 \r（PS 靠它分段），只有名字折行 */
    expect(groups[0]?.layers[0]?.content).toContain('\r');
  });

  it('没有任何块时返回空结果，不抛错', () => {
    expect(toOcrGroups([], ORIGIN)).toEqual({ groups: [] });
  });
});
