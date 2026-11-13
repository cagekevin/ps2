import { describe, expect, it } from 'vitest';
import { driverShortfall } from './dlss-driver';

describe('driverShortfall', () => {
  it('实测组合：610.88 配引擎 310.8.0.0 报出 616.56', () => {
    expect(driverShortfall({ driver: '610.88', version: '310.8.0.0' })).toBe('616.56');
  });

  it('等于最低版本算够（不拦边界）', () => {
    expect(driverShortfall({ driver: '616.56', version: '310.8.0.0' })).toBeNull();
  });

  it('主版本更高就够，不看后面的段', () => {
    expect(driverShortfall({ driver: '620.10', version: '310.8.0.0' })).toBeNull();
  });

  it('没收录的引擎版本不判断（宁可漏报，不凭猜测拦机器）', () => {
    expect(driverShortfall({ driver: '500.00', version: '310.9.0.0' })).toBeNull();
    expect(driverShortfall({ driver: '500.00', version: '—' })).toBeNull();
  });

  it('驱动版本读不到（引擎没报）时不判断', () => {
    expect(driverShortfall({ driver: '—', version: '310.8.0.0' })).toBeNull();
  });
});
