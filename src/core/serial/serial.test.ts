import { describe, expect, it } from 'vitest';
import { runSerial } from './index';

describe('runSerial', () => {
  it('同一 key 按提交顺序执行', async () => {
    const order: string[] = [];

    const first = runSerial('same', async () => {
      await Promise.resolve();
      order.push('first');
      return 1;
    });
    const second = runSerial('same', async () => {
      order.push('second');
      return 2;
    });

    await Promise.all([first, second]);
    expect(order).toEqual(['first', 'second']);
  });

  it('前一个失败不阻塞后一个', async () => {
    await expect(
      runSerial('fail', async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    await expect(runSerial('fail', async () => 'ok')).resolves.toBe('ok');
  });

  it('不同 key 互不等待', async () => {
    let release: (() => void) | undefined;
    const blocker = new Promise<void>((resolve) => {
      release = resolve;
    });

    void runSerial('a', async () => {
      await blocker;
      return 'a';
    });

    await expect(runSerial('b', async () => 'b')).resolves.toBe('b');
    release?.();
  });
});
