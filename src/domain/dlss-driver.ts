/**
 * 【纯逻辑】引擎版本 → 显卡驱动最低要求：点下去之前就知道会不会白跑。
 * 唯一入口：`features/dlss` 的底部信息行与「处理画幅」可用性判断。
 *
 * 为什么需要它：`--probe-nr` 只报 GPU / 驱动 / 引擎版本，**不判驱动够不够**，
 * 于是面板照旧显示「就绪 · 驱动 610.88 · 引擎 310.8.0.0」，用户点下去才拿到
 * `engine_exit_1` + `ERROR: NVIDIA driver 610.88 is too old … install driver 616.56 or newer`，
 * 白等一次图层导出又失败一次。这张表把「引擎的报错原文」提前成一条前置判据。
 *
 * 表里只收**实测过**的组合：版本号取引擎 `dlssnr:` 行，最低驱动取它的报错原文。
 * 没收录的版本返回 null —— 宁可漏报，也不凭猜测拦住一台其实能跑的机器。
 */

import type { DlssEngineInfo } from '../types/dlss';

/** 引擎版本 → 最低驱动版本（只收实测组合） */
const MIN_DRIVER: Readonly<Record<string, string>> = {
  /* 实测 2026-11-13：RTX 4060 Ti + 驱动 610.88 + 引擎 310.8.0.0 → 引擎 exit 1，要求 616.56 */
  '310.8.0.0': '616.56'
};

/** 版本号按数字段切开；非数字尾巴（`310,8,0,0` 这类逗号写法）按段号取到数字为止 */
function versionParts(version: string): number[] {
  return version.split('.').map((part) => {
    const digits = part.replace(/[^0-9].*$/, '');
    return digits ? Number(digits) : 0;
  });
}

/** 逐段比较：a < b 返回负数，相等 0，a > b 正数；缺的段当 0 */
function compareVersion(a: string, b: string): number {
  const left = versionParts(a);
  const right = versionParts(b);
  const count = Math.max(left.length, right.length);
  for (let index = 0; index < count; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * 驱动低于引擎要求时返回要求的最低版本，否则 null。
 *
 * 只判「驱动 < 最低版本」这一侧：驱动更新永远兼容旧引擎，反向不需要判。
 * 驱动版本取不到（`—`）时也返回 null —— 没有版本号就没有依据，不猜。
 */
export function driverShortfall(info: Pick<DlssEngineInfo, 'driver' | 'version'>): string | null {
  const min = MIN_DRIVER[info.version];
  if (!min) return null;
  if (!/^\d/.test(info.driver)) return null;
  return compareVersion(info.driver, min) < 0 ? min : null;
}
