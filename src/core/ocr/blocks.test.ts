import { describe, expect, it } from 'vitest';
import { inferFontSize, mergeBlocks } from './blocks';

/* 期望值按参考脚本 docs/参考/ocr-image-to-text.py 的公式手算，不按实现反推 */
describe('inferFontSize', () => {
  it('按「平均字宽 0.7 + 框高 0.3」估算后向上取偶数', () => {
    /* width/字数 = 50 → 50*0.7 + 40*0.3 = 47 → ceil(47/2)*2 = 48 */
    expect(inferFontSize(200, 40, 4)).toBe(48);
  });

  it('字号再小也落 12', () => {
    /* 10/50 = 0.2 → 0.14 + 3 = 3.14 → 4，但下限是 12 */
    expect(inferFontSize(10, 10, 50)).toBe(12);
  });

  it('字数为 0 时按 1 算，不除零', () => {
    /* 30/1 = 30 → 21 + 6 = 27 → ceil(27/2)*2 = 28 */
    expect(inferFontSize(30, 20, 0)).toBe(28);
  });
});

describe('mergeBlocks', () => {
  it('间距够小且左边界对齐时并成一段，content 用 \\r 连接、rect 取并集', () => {
    const merged = mergeBlocks([
      { content: '标题', left: 100, top: 100, width: 80, height: 20 },
      { content: '副标题', left: 102, top: 125, width: 100, height: 18 }
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.content).toBe('标题\r副标题');
    expect(merged[0]?.rect).toEqual({ left: 100, top: 100, width: 102, height: 43 });
    /* 字号沿用第一行（80/2 = 40 → 28 + 6 = 34），不按合并后的框重算 */
    expect(merged[0]?.fontSize).toBe(34);
  });

  it('字号差太多的两块不合并（大标题不会被并进正文）', () => {
    /* 真实接口返回过的一组框：间距 34 < 42×1.5、左边界都是 41，但字号 42 vs 24 相对差 0.43 > 0.3 */
    const merged = mergeBlocks([
      { content: '标题文字测试', left: 41, top: 50, width: 260, height: 39 },
      { content: '第一行正文内容', left: 41, top: 123, width: 164, height: 24 }
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[0]?.fontSize).toBe(42);
    expect(merged[1]?.fontSize).toBe(24);
  });

  it('左边界差 ≥ 20 时不合并（两栏排版）', () => {
    const merged = mergeBlocks([
      { content: '左栏', left: 100, top: 100, width: 80, height: 20 },
      { content: '右栏', left: 200, top: 100, width: 80, height: 20 }
    ]);

    expect(merged).toHaveLength(2);
  });

  it('垂直间距超过字号 1.5 倍时不合并', () => {
    /* 第一行字号 34 → 阈值 51；间距 100 - 120 = 80 > 51 */
    const merged = mergeBlocks([
      { content: '上一段', left: 100, top: 100, width: 80, height: 20 },
      { content: '下一段', left: 100, top: 200, width: 80, height: 20 }
    ]);

    expect(merged).toHaveLength(2);
  });

  it('空内容的行在合并前丢掉（否则字数为 1、字号会算出天文数字）', () => {
    const merged = mergeBlocks([
      { content: '   ', left: 0, top: 0, width: 10, height: 10 },
      { content: '正文', left: 0, top: 40, width: 40, height: 20 }
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.content).toBe('正文');
  });
});
