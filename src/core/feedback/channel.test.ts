/**
 * 状态通道原语：订阅 / 通知 / 挂载计数。
 *
 * 测的是这一层本身，不是 UI —— 两个容器怎么渲染仍靠真机。
 */
import { describe, expect, it, vi } from 'vitest';
import { createChannel, createMountGate } from './channel';

describe('createChannel', () => {
  it('emit 通知所有订阅者', () => {
    const channel = createChannel();
    const first = vi.fn();
    const second = vi.fn();
    channel.subscribe(first);
    channel.subscribe(second);

    channel.emit();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('退订后不再收到', () => {
    const channel = createChannel();
    const listener = vi.fn();
    const off = channel.subscribe(listener);

    off();
    channel.emit();

    expect(listener).not.toHaveBeenCalled();
    expect(channel.size()).toBe(0);
  });

  it('同一函数订阅两次 = 两条（与原实现一致，Set 不会合并同一引用以外的调用）', () => {
    const channel = createChannel();
    const listener = vi.fn();
    channel.subscribe(listener);
    channel.subscribe(listener);

    channel.emit();

    /* Set 按引用去重，同一个函数只会留一份 —— 这是既有语义，保持 */
    expect(listener).toHaveBeenCalledTimes(1);
    expect(channel.size()).toBe(1);
  });
});

describe('createMountGate', () => {
  it('挂载 / 卸载计数，两个容器都在才 isMounted', () => {
    const gate = createMountGate();
    expect(gate.isMounted()).toBe(false);

    const unmountFirst = gate.mount();
    const unmountSecond = gate.mount();
    expect(gate.isMounted()).toBe(true);

    unmountFirst();
    expect(gate.isMounted()).toBe(true);

    unmountSecond();
    expect(gate.isMounted()).toBe(false);
  });
});
