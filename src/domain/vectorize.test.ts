import { describe, expect, it } from 'vitest';
import { extractSvgPaths, hexToRgb, parseSvgPath } from './vectorize';

/** 取第一条子路径（多数用例只有一条） */
function first(d: string) {
  const result = parseSvgPath(d);
  if (result.status !== 'ok') throw new Error(`解析失败：${result.reason}`);
  const subpath = result.value[0];
  if (!subpath) throw new Error('没有子路径');
  return subpath;
}

describe('parseSvgPath', () => {
  it('折线：M/L/Z → 三个直线点，闭合', () => {
    const subpath = first('M0 0 L10 0 L10 10 Z');

    expect(subpath.closed).toBe(true);
    expect(subpath.points.map((point) => point.anchor)).toEqual([
      [0, 0],
      [10, 0],
      [10, 10]
    ]);
    /* 直线点的左右控制柄都等于锚点 */
    expect(subpath.points[0]?.left).toEqual([0, 0]);
    expect(subpath.points[0]?.right).toEqual([0, 0]);
  });

  it('三次曲线：控制柄落在相邻两个点上（上一点 right / 本点 left）', () => {
    const subpath = first('M0 0 C10 0 10 10 0 10 Z');

    expect(subpath.points[0]?.right).toEqual([10, 0]);
    expect(subpath.points[1]?.anchor).toEqual([0, 10]);
    expect(subpath.points[1]?.left).toEqual([10, 10]);
  });

  it('相对指令 + H/V：m/h/v 换算成绝对坐标', () => {
    const subpath = first('m10 10 h5 v5 z');

    expect(subpath.points.map((point) => point.anchor)).toEqual([
      [10, 10],
      [15, 10],
      [15, 15]
    ]);
    expect(subpath.closed).toBe(true);
  });

  it('M 后面的重复参数按 L 处理（隐式 L）', () => {
    const subpath = first('M0 0 10 0 10 10');

    expect(subpath.points).toHaveLength(3);
    expect(subpath.points[2]?.anchor).toEqual([10, 10]);
  });

  it('二次曲线 Q 按 2/3 抬升成三次控制点', () => {
    const subpath = first('M0 0 Q10 0 10 10');

    /* c1 = P0 + 2/3(Q - P0) = (6.666…, 0)；c2 = P1 + 2/3(Q - P1) = (10, 3.333…) */
    expect(subpath.points[0]?.right[0]).toBeCloseTo(6.6667, 3);
    expect(subpath.points[0]?.right[1]).toBeCloseTo(0, 6);
    expect(subpath.points[1]?.left[0]).toBeCloseTo(10, 6);
    expect(subpath.points[1]?.left[1]).toBeCloseTo(3.3333, 3);
  });

  it('多个 M 开多条子路径', () => {
    const result = parseSvgPath('M0 0 L1 1 M5 5 L6 6');
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value).toHaveLength(2);
    expect(result.value[1]?.points[0]?.anchor).toEqual([5, 5]);
  });

  it('两侧控制柄共线的点标成平滑点', () => {
    /* 中间点 anchor=30，left=20、right=40，共线 */
    const subpath = first('M0 0 C10 0 20 0 30 0 C40 0 50 0 60 0');

    expect(subpath.points[1]?.anchor).toEqual([30, 0]);
    expect(subpath.points[1]?.smooth).toBe(true);
    /* 折线点不是平滑点 */
    expect(first('M0 0 L10 0 L10 10 Z').points[1]?.smooth).toBe(false);
  });

  it('弧线指令 A 明确报错（不猜）', () => {
    const result = parseSvgPath('M0 0 A5 5 0 0 1 10 10');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('VALIDATION');
      expect(result.reason).toContain('弧线');
    }
  });

  it('空数据给 VALIDATION，不是空数组', () => {
    const result = parseSvgPath('   ');
    expect(result.status).toBe('error');
  });
});

describe('extractSvgPaths', () => {
  it('取出每条 path 的 d 与 fill，跳过没有 d 的', () => {
    const svg = [
      '<svg><path d="M0 0 L1 1 Z" fill="#000000"/>',
      '<path fill="#ff0000"/>',
      '<path d="M2 2 L3 3 Z" fill="#123456"></path></svg>'
    ].join('');

    const entries = extractSvgPaths(svg);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({ d: 'M0 0 L1 1 Z', fill: '#000000' });
    expect(entries[1]?.fill).toBe('#123456');
  });

  it('没有 path 时返回空数组（由命令层报「没有形状」）', () => {
    expect(extractSvgPaths('<svg></svg>')).toEqual([]);
  });
});

describe('hexToRgb', () => {
  it('六位十六进制转 rgb', () => {
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#ff8800')).toEqual({ r: 255, g: 136, b: 0 });
    expect(hexToRgb('ff8800')).toEqual({ r: 255, g: 136, b: 0 });
  });

  it('认不出返回 null（调用方兜黑色）', () => {
    expect(hexToRgb(null)).toBeNull();
    expect(hexToRgb('#fff')).toBeNull();
    expect(hexToRgb('red')).toBeNull();
  });
});

describe('提取 → 解析 串起来', () => {
  it('一条 vtracer 风格的 path 能变成闭合子路径', () => {
    const svg = '<path d="M0 0 L10 0 L10 10 Z" fill="#000000"/>';
    const [entry] = extractSvgPaths(svg);
    expect(entry).toBeDefined();

    const parsed = parseSvgPath(entry?.d ?? '');
    expect(parsed.status).toBe('ok');
    if (parsed.status !== 'ok') return;
    expect(parsed.value[0]?.closed).toBe(true);
    expect(parsed.value[0]?.points).toHaveLength(3);
  });
});
