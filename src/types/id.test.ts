import { describe, expect, it } from 'vitest';
import { newId } from './id';

describe('newId', () => {
  it('只含 0-9a-z（36 进制时间戳 + 2 位序号 + 2 位随机），长度稳定', () => {
    expect(newId()).toMatch(/^[0-9a-z]{11,16}$/);
  });

  it('同一毫秒内连续调用严格不撞（靠进程内序号，不靠随机）', () => {
    /* 200 < 序号回绕点 1296，所以同毫秒内必然两两不同 */
    const ids = new Set(Array.from({ length: 200 }, () => newId()));
    expect(ids.size).toBe(200);
  });
});
