import { describe, expect, it } from 'vitest';
import type { VectorPoint, VectorSubPath } from '../types/vectorize';
import { extractSvgPaths, hexToRgb, parseSvgPath, scaleSubpaths } from './vectorize';

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
      /* 用户看的话统一来自 MSG，具体是哪条指令只进 detail */
      expect(result.detail).toContain('cmd:A');
    }
  });

  it('空数据给 VALIDATION，不是空数组', () => {
    const result = parseSvgPath('   ');
    expect(result.status).toBe('error');
  });

  it('参数不足的 d 明确报错，不静默跳过', () => {
    /* C 需要 6 个参数，这里只有 4 个 */
    const result = parseSvgPath('M0 0 C10 0 20 0');
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.code).toBe('VALIDATION');
    expect(result.detail).toContain('args:4');
  });

  it('闭合曲线的起点拿到进入控制柄，与起点重合的末点被去掉', () => {
    /* 第二段曲线的终点回到起点：起点的 left 应取该段的 c2 = (50,0) */
    const subpath = first('M0,0 C10,0 20,0 30,0 C40,0 50,0 0,0 Z');

    expect(subpath.points).toHaveLength(2);
    expect(subpath.points[0]?.anchor).toEqual([0, 0]);
    expect(subpath.points[0]?.left).toEqual([50, 0]);
    expect(subpath.closed).toBe(true);
  });

  it('末点离起点很远时不合并（直线闭合保持原样）', () => {
    const subpath = first('M0 0 L10 0 L10 10 Z');

    expect(subpath.points).toHaveLength(3);
    expect(subpath.points[0]?.left).toEqual([0, 0]);
  });
});

describe('scaleSubpaths', () => {
  function point(anchor: [number, number], left: [number, number], right: [number, number]): VectorPoint {
    return { anchor, left, right, smooth: true };
  }

  it('按 bounds / export 的比例换算，并加回图层左上角', () => {
    const subpaths: VectorSubPath[] = [{ closed: true, points: [point([100, 50], [90, 40], [110, 60])] }];

    /* 600 → 300 是 0.5 倍，再平移 (20, 10) */
    const result = scaleSubpaths(subpaths, {
      exportWidth: 600,
      exportHeight: 300,
      bounds: { left: 20, top: 10, width: 300, height: 150 }
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value[0]?.points[0]?.anchor).toEqual([70, 35]);
    expect(result.value[0]?.points[0]?.left).toEqual([65, 30]);
    expect(result.value[0]?.points[0]?.right).toEqual([75, 40]);
  });

  it('横竖比例分开算：取整导致的两边比例差异不许共用同一个 scale', () => {
    const subpaths: VectorSubPath[] = [{ closed: false, points: [point([600, 600], [600, 600], [600, 600])] }];

    const result = scaleSubpaths(subpaths, {
      exportWidth: 600,
      exportHeight: 601,
      bounds: { left: 0, top: 0, width: 300, height: 300 }
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    const anchor = result.value[0]?.points[0]?.anchor;
    expect(anchor?.[0]).toBe(300);
    expect(anchor?.[1]).toBeCloseTo((300 * 600) / 601, 6);
  });

  it('导出尺寸为 0 时报 VALIDATION，不静默返回原坐标', () => {
    const subpaths: VectorSubPath[] = [{ closed: true, points: [point([1, 1], [1, 1], [1, 1])] }];

    const result = scaleSubpaths(subpaths, {
      exportWidth: 0,
      exportHeight: 100,
      bounds: { left: 0, top: 0, width: 100, height: 100 }
    });

    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.code).toBe('VALIDATION');
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
