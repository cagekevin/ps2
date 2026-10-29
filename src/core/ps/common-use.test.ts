/**
 * 常用页 v2 的参数拼装测试
 *
 * 为什么只测这一层：能力表里的 `fn` / 通道 / 超时由 `init.test.ts` 与 `capability.test.ts` 盯着，
 * 真机行为测不了；**唯一能在机器上出错又看不出来的是参数顺序**——
 * 官方 `cy_customBuildTransform` 是 `[number, angle, leftRigth, topBottom, pointIndex, scale, opacity]`，
 * Vue 参考实现给的是 `[number, scale, leftRight, topBottom, angle, opacity, anchor]`。
 * 拼错了不报错，只是变换结果全不对（角度当缩放、锚点当透明度）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => [] as { spec: unknown; args: unknown[] }[]);

vi.mock('./capability', () => ({
  callCapability: (spec: unknown, args: unknown[] = []) => {
    calls.push({ spec, args });
    return Promise.resolve({ status: 'ok', value: undefined });
  }
}));

import { CAP } from './capabilities';
import { customBuildTransform, embedImage, relinkPlacedLayer, smartFill } from './common-use';

beforeEach(() => {
  calls.length = 0;
});

describe('customBuildTransform 的参数拼装', () => {
  it('按官方 7 位顺序：number, angle, leftRigth, topBottom, pointIndex, scale, opacity', async () => {
    await customBuildTransform({
      number: 2,
      scale: 200,
      leftRigth: '20px',
      topBottom: '0px',
      angle: 30,
      opacity: 50,
      pointIndex: 4
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.spec).toBe(CAP.customBuildTransform);
    /* 逐位断言：整体 toEqual 也能过，但逐位能一眼看出是哪一位错 */
    const args = calls[0]?.args ?? [];
    expect(args[0]).toBe(2); // number
    expect(args[1]).toBe(30); // angle（不是 scale）
    expect(args[2]).toBe('20px'); // leftRigth
    expect(args[3]).toBe('0px'); // topBottom
    expect(args[4]).toBe(4); // pointIndex
    expect(args[5]).toBe(200); // scale（不是 angle）
    expect(args[6]).toBe(50); // opacity
  });
});

describe('嵌入类的参数形状', () => {
  it('embedImage：path 恒空串，bLink2 / bDelete 原样透传（官方不弹选图）', async () => {
    await embedImage(2, true);

    expect(calls[0]?.spec).toBe(CAP.embedImage);
    expect(calls[0]?.args).toEqual([{ path: '', bLink2: 2, bDelete: true }]);
  });

  it('relinkPlacedLayer：单个路径字符串', async () => {
    await relinkPlacedLayer('/tmp/a.png');

    expect(calls[0]?.spec).toBe(CAP.relinkPlacedLayer);
    expect(calls[0]?.args).toEqual(['/tmp/a.png']);
  });
});

describe('智能填色两条 jsx 不混', () => {
  it('color → cy_smartFillColor；line → cy_smartFillLineColor', async () => {
    await smartFill('color');
    await smartFill('line');

    expect(calls[0]?.spec).toBe(CAP.smartFillColor);
    expect(calls[1]?.spec).toBe(CAP.smartFillLineColor);
  });
});
