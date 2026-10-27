/**
 * 【范本】类型守卫
 * 全项目共用的运行时判断。不要在各自模块里重复实现 isRecord。
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}
