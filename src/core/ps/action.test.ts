/**
 * 动作页两条 jsx 的参数形状（唯一错误点：`dz_callAction` 传的是**整个 item**）。
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
import { callAction, getActionList } from './action';

beforeEach(() => {
  calls.length = 0;
});

describe('callAction', () => {
  it('传整个 item（group + name），不是只传 name', async () => {
    await callAction({ group: '修图', name: '磨皮' });

    expect(calls[0]?.spec).toBe(CAP.callAction);
    expect(calls[0]?.args).toEqual([{ group: '修图', name: '磨皮' }]);
  });

  it('有 alias 才带；没有时不塞 undefined（jsx 会当成空别名）', async () => {
    await callAction({ group: '修图', name: '磨皮', alias: '美颜' });
    expect(calls[0]?.args).toEqual([{ group: '修图', name: '磨皮', alias: '美颜' }]);

    await callAction({ group: '修图', name: '磨皮', alias: '' });
    expect(calls[1]?.args).toEqual([{ group: '修图', name: '磨皮' }]);
  });
});

describe('getActionList', () => {
  it('无参直调', async () => {
    await getActionList();

    expect(calls[0]?.spec).toBe(CAP.getActionList);
    expect(calls[0]?.args).toEqual([]);
  });
});
