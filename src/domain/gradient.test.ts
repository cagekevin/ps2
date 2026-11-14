/**
 * 渐变过渡的数值口径。
 *
 * **期望值不是我们算的，是参照引擎实测的**：`docs/参考/gradient-lab/color-core.js`
 * 在浏览器里跑出来的 5 组端点 × 3 条路线。改 `domain/gradient.ts` 里任何常数
 * （白点、矩阵、JND、色相路径判据）都会让这批值变红 —— 红了先确认「是不是有意改口径」，
 * 不是就说明改坏了。
 */

import { describe, expect, it } from 'vitest';
import { lchOf, lchToHex, partnerOf, sampleStops, type GradientRoute } from './gradient';

/** 参照引擎实测值：5 个点（t = 0 / .25 / .5 / .75 / 1），含两端 */
interface Reference {
  from: string;
  to: string;
  direct: string[];
  short: string[];
  long: string[];
}

const REFERENCES: Reference[] = [
  {
    /* 粉彩对：低饱和，三条路线都不出界，收色策略不参与 */
    from: '#9383CA',
    to: '#F6E9BF',
    direct: ['#9383CA', '#AC9DC7', '#C5B6C5', '#DDD0C2', '#F6E9BF'],
    short: ['#9383CA', '#D18DBE', '#F1A5AE', '#FAC6AB', '#F6E9BF'],
    long: ['#9383CA', '#5FACDC', '#6CCAC6', '#B1DDB2', '#F6E9BF']
  },
  {
    /* 高饱和对：中间点出 sRGB 色域，只有 §13.2 收色能对上这两个 */
    from: '#FF0000',
    to: '#00FF00',
    direct: ['#FF0000', '#BF4000', '#808000', '#40BF00', '#00FF00'],
    short: ['#FF0000', '#F17100', '#CEAA00', '#9DD600', '#00FF00'],
    long: ['#FF0000', '#FF37E6', '#37BFFF', '#00D9E1', '#00FF00']
  },
  {
    /* 两端都是中性色：没有色相，short 与 long 必须是同一条 */
    from: '#000000',
    to: '#FFFFFF',
    direct: ['#000000', '#404040', '#808080', '#BFBFBF', '#FFFFFF'],
    short: ['#000000', '#3B3B3B', '#777777', '#B9B9B9', '#FFFFFF'],
    long: ['#000000', '#3B3B3B', '#777777', '#B9B9B9', '#FFFFFF']
  },
  {
    /* 上一组的端点调头：三条路线都必须是镜像，验证色相方向跟着端点走 */
    from: '#F6E9BF',
    to: '#9383CA',
    direct: ['#F6E9BF', '#DDD0C2', '#C5B6C5', '#AC9DC7', '#9383CA'],
    short: ['#F6E9BF', '#FAC6AB', '#F1A5AE', '#D18DBE', '#9383CA'],
    long: ['#F6E9BF', '#B1DDB2', '#6CCAC6', '#5FACDC', '#9383CA']
  },
  {
    /* 冷暖跨越大：长路线要绕一大圈，色域收色在最高浓度处反复触发 */
    from: '#2E5BFF',
    to: '#FF8A3D',
    direct: ['#2E5BFF', '#6267CF', '#97739E', '#CB7E6E', '#FF8A3D'],
    short: ['#2E5BFF', '#C338D9', '#FE219F', '#FF596A', '#FF8A3D'],
    long: ['#2E5BFF', '#0087A2', '#009C7A', '#7AA800', '#FF8A3D']
  }
];

const ROUTES: GradientRoute[] = ['direct', 'short', 'long'];

describe('sampleStops 与参照引擎逐点一致', () => {
  for (const reference of REFERENCES) {
    for (const route of ROUTES) {
      it(`${reference.from} → ${reference.to} · ${route}`, () => {
        expect(sampleStops(reference.from, reference.to, route, 5)).toEqual(reference[route]);
      });
    }
  }
});

describe('sampleStops 的边界', () => {
  it('两端中性色时 short 与 long 给出同一条渐变', () => {
    expect(sampleStops('#000000', '#FFFFFF', 'short', 5)).toEqual(sampleStops('#000000', '#FFFFFF', 'long', 5));
  });

  it('端点不算中性时短路线与长路线必须不同', () => {
    expect(sampleStops('#2E5BFF', '#FF8A3D', 'short', 5)).not.toEqual(sampleStops('#2E5BFF', '#FF8A3D', 'long', 5));
  });

  it('count = 2 就是一条直线，只剩两端', () => {
    expect(sampleStops('#9383CA', '#F6E9BF', 'short', 2)).toEqual(['#9383CA', '#F6E9BF']);
  });

  it('count 小于 2 时抬到 2，不返回只有一个点的渐变', () => {
    expect(sampleStops('#9383CA', '#F6E9BF', 'short', 0)).toHaveLength(2);
    expect(sampleStops('#9383CA', '#F6E9BF', 'short', 1.4)).toHaveLength(2);
  });

  it('count 非数字直接抛错，不悄悄给一条默认渐变', () => {
    expect(() => sampleStops('#9383CA', '#F6E9BF', 'short', Number.NaN)).toThrow(TypeError);
  });

  it('色值解析不出直接抛错，不给兜底颜色', () => {
    expect(() => sampleStops('not-a-color', '#F6E9BF', 'short', 5)).toThrow(TypeError);
  });

  it('色标数量与请求一致，且首尾就是端点原值', () => {
    const stops = sampleStops('#2E5BFF', '#FF8A3D', 'long', 17);
    expect(stops).toHaveLength(17);
    expect(stops[0]).toBe('#2E5BFF');
    expect(stops[16]).toBe('#FF8A3D');
  });
});

describe('lchToHex', () => {
  /* 三个期望值同样取自参照引擎的 gamutMapSrgb + rgbToHex，不是本模块自己跑出来的 */

  it('色环取色与整条渐变用的同一套换算：端点处结果与原色一致', () => {
    /* #9383CA 的 LCH 约 L=58.36 / C=39.28 / h=297.21（参照引擎 colorCoordinates 同值） */
    expect(lchToHex(58.36108692324166, 39.281217069597766, 297.2061590785646)).toBe('#9383CA');
  });

  it('浓度为 0 得到中性灰，不带色相', () => {
    expect(lchToHex(50, 0, 297)).toBe('#777777');
  });

  it('超出色域的颜色按 §13.2 收进 sRGB，且收到与参照引擎同一个颜色', () => {
    /* L=70 / C=200 / h=140 远超 sRGB 能表达的范围，收色策略不同就会得到别的绿 */
    expect(lchToHex(70, 200, 140)).toBe('#00C155');
  });
});

describe('lchOf', () => {
  /*
   * 浮点上与参照引擎差到 1e-3 量级，**这是常量取整的差，不是口径不同**：
   * Culori 的 D50 白点用 Lindbloom 的 5 位截断值（0.96422 / 0.82521），本模块用
   * CSS Color 4 的规范值（0.9642956764 / 0.8251046025）。8 位色值上两者逐点一致，
   * 见上面的 15 组固定值；所以这里按「坐标级相同」断言，不锁浮点位。
   */
  it('与参照引擎的 colorCoordinates 同值（D50 白点）', () => {
    const reference = { l: 58.36108692324166, c: 39.281217069597766, h: 297.2061590785646 };
    const actual = lchOf('#9383CA');
    expect(Math.abs(actual.l - reference.l)).toBeLessThan(0.001);
    expect(Math.abs(actual.c - reference.c)).toBeLessThan(0.001);
    /* 色相是角度（atan2 输出），同样的绝对误差在这里被放大成 0.004°，可见门限约 0.5° */
    expect(Math.abs(actual.h - reference.h)).toBeLessThan(0.05);
  });

  it('中性色的色相给 0、浓度为 0，画点时不至于偏到环上某处', () => {
    const actual = lchOf('#808080');
    expect(actual.c).toBe(0);
    expect(actual.h).toBe(0);
    expect(Math.abs(actual.l - 53.5850142898864)).toBeLessThan(0.001);
  });

  it('与 lchToHex 互为逆运算（环内颜色往返不丢精度）', () => {
    /* #2E5BFF 的权威坐标：L=44.47528271804773 / C=93.27590259017576 / h=290.68872121957236 */
    const start = lchOf('#2E5BFF');
    expect(Math.abs(start.l - 44.47528271804773)).toBeLessThan(0.001);
    expect(Math.abs(start.c - 93.27590259017576)).toBeLessThan(0.001);
    expect(Math.abs(start.h - 290.68872121957236)).toBeLessThan(0.001);
    expect(lchToHex(start.l, start.c, start.h)).toBe('#2E5BFF');
  });
});

/** 两个色相角之间的最短角距（度） */
function angularGap(first: number, second: number): number {
  const delta = (((first - second) % 360) + 360) % 360;
  return Math.min(delta, 360 - delta);
}

describe('partnerOf', () => {
  it('色相转 150°、亮度不变：强对比，又不至于与起始色正好对立', () => {
    const source = lchOf('#9383CA');
    const target = lchOf(partnerOf('#9383CA'));
    expect(Math.abs(target.l - source.l)).toBeLessThan(0.5);
    expect(angularGap(target.h, source.h)).toBeGreaterThan(148);
    expect(angularGap(target.h, source.h)).toBeLessThan(152);
  });

  it('推出来的这一对，短路线与长路线必须看得出差别', () => {
    /* 这正是 150° 而不是 180° 的理由：对立时两条路都走 180°，界面上点「长路线」毫无反应 */
    const partner = partnerOf('#2E5BFF');
    expect(sampleStops('#2E5BFF', partner, 'short', 8)).not.toEqual(sampleStops('#2E5BFF', partner, 'long', 8));
  });

  it('中性色没有色相可转，结果仍是同一个灰', () => {
    expect(partnerOf('#808080')).toBe('#808080');
  });

  it('转两次是 300°，与原色差 60°：它不是「反色」，别当反转用', () => {
    const twice = lchOf(partnerOf(partnerOf('#2E5BFF')));
    const once = lchOf('#2E5BFF');
    expect(Math.abs(angularGap(twice.h, once.h) - 60)).toBeLessThan(20);
  });
});
