/**
 * 【范本】库文件格式识别与载荷提取（纯函数，零 IO）
 *
 * 库文件有三种顶层形态（来自 app 项目实测，非推断）：
 *   groups     .kuc / .kuf / 本机 .ini → [{ name, show, list }]      明文
 *   flat       .kus / .kug            → [{ name, data }]             data 是 base64
 *   container  .kux / .dzx            → { arrFileData: [{name,data}] } base64
 *
 * 解析第一条判断必须是 Array.isArray，不能无脑读 arrFileData。
 * 解码函数由调用方注入，保持本文件纯函数、可单测。
 */

import { isArrayOf, isRecord } from '../types/guards';
import { parseJson } from '../types/json';
import { fail, ok, type Result } from '../types/result';

export type KuKindName = 'color' | 'gradient' | 'font' | 'style';

/** 库文件名 → 类型；不是库文件给 sidecar（旁路图） */
export type KuLibraryKind = KuKindName | 'sidecar';

/** 前缀 sj_ku + 后三位定类型，照抄原版 app.v4.js:53678 */
const KU_LIBRARY_TABLE: ReadonlyArray<{ code: string; kind: KuKindName }> = [
  { code: 'Col', kind: 'color' },
  { code: 'Gra', kind: 'gradient' },
  { code: 'Fon', kind: 'font' },
  { code: 'Fot', kind: 'font' },
  { code: 'Sty', kind: 'style' }
];

export function kuLibraryKind(name: string): KuLibraryKind {
  if (!name.startsWith('sj_ku')) return 'sidecar';
  const code = name.slice(5, 8);
  return KU_LIBRARY_TABLE.find((entry) => entry.code === code)?.kind ?? 'sidecar';
}

export function isKuLibraryFileName(name: string): boolean {
  return kuLibraryKind(name) !== 'sidecar';
}

/** 已证形态，消费侧只 switch 标签，不 as、不兜底 */
export type ProvenKu =
  | { shape: 'groups'; groups: Record<string, unknown>[] }
  | { shape: 'flat'; head: Record<string, unknown> }
  | { shape: 'container'; entries: Array<{ name: string; data?: unknown }> };

export function kuShapeOf(parsed: unknown): Result<ProvenKu> {
  if (Array.isArray(parsed)) {
    const head: unknown = parsed[0];

    /* flat 的元素带 data；groups 的元素是组对象 {name, show, list} */
    if (isRecord(head) && 'data' in head) {
      return ok({ shape: 'flat', head });
    }

    if (!isArrayOf(parsed, isRecord)) {
      return fail('CORRUPT', '库数组里混有非对象项');
    }
    return ok({ shape: 'groups', groups: parsed });
  }

  if (isRecord(parsed)) {
    const arrFileData = parsed.arrFileData;
    if (!Array.isArray(arrFileData)) {
      return fail('CORRUPT', '压缩包缺少 arrFileData 数组');
    }
    const entries = arrFileData.filter(
      (entry): entry is { name: string; data?: unknown } =>
        isRecord(entry) && typeof entry.name === 'string'
    );
    return ok({ shape: 'container', entries });
  }

  return fail('CORRUPT', '既不是数组也不是对象');
}

/**
 * 解 data 字段：先判类型，再解码。
 * data 可能是布尔 false（原版读不到内容时返回 false），直接丢给解码会抛 TypeError。
 */
export function decodeKuData(
  value: unknown,
  decode: (base64: string) => string
): Result<string> {
  if (typeof value !== 'string') return fail('CORRUPT', '条目没有内容');

  const compact = value.replace(/\s/g, '');
  if (!compact) return fail('CORRUPT', '条目内容为空');

  try {
    return ok(decode(compact));
  } catch {
    return fail('CORRUPT', 'base64 解码失败');
  }
}

function decodeArrayText(content: Result<string>): Result<Record<string, unknown>[]> {
  if (content.status === 'error') return content;

  const parsed = parseJson(content.value, '库条目内层');
  if (parsed.status === 'error') return parsed;

  if (!Array.isArray(parsed.value)) return fail('CORRUPT', '内层不是数组');
  if (!isArrayOf(parsed.value, isRecord)) return fail('CORRUPT', '内层混有非对象项');

  return ok(parsed.value);
}

/**
 * 从三种形态里取出「组数组」。
 * 只做形态分派与解码，不认字段——字段归 style-library.ts。
 */
export function resolveKuGroups(
  parsed: unknown,
  decode: (base64: string) => string
): Result<Record<string, unknown>[]> {
  const proven = kuShapeOf(parsed);
  if (proven.status === 'error') return proven;

  const shape = proven.value;
  switch (shape.shape) {
    case 'groups':
      return ok(shape.groups);
    case 'flat':
      return decodeArrayText(decodeKuData(shape.head.data, decode));
    case 'container': {
      const hit = shape.entries.find((entry) => isKuLibraryFileName(entry.name));
      if (!hit) return fail('CORRUPT', '压缩包里没有库文件');
      return decodeArrayText(decodeKuData(hit.data, decode));
    }
  }
}
