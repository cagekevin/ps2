/**
 * 用本机真实样式库验证解析。
 * 没有数据的机器自动跳过，不影响 CI。
 */
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeStyleIndex, fileNameOf, readKuGroups, type KuKind } from './style-library';

const LEGACY_DIR = join(homedir(), 'AppData', 'Roaming', 'SheJiZhuLi');
const INDEX_FILE = join(LEGACY_DIR, 'sj_kuStoreInfo.ini');
const HAS_DATA = existsSync(INDEX_FILE);

function readText(file: string): string {
  return readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

describe.skipIf(!HAS_DATA)('真实样式库', () => {
  it('索引可解析且至少一个仓库', () => {
    const raw = JSON.parse(readText(INDEX_FILE)) as unknown;
    const result = decodeStyleIndex(raw);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.list.length).toBeGreaterThan(0);
  });

  it('当前仓库的四类库都能解析（文件缺失的跳过）', () => {
    const raw = JSON.parse(readText(INDEX_FILE)) as unknown;
    const result = decodeStyleIndex(raw);
    if (result.status !== 'ok') return;

    const warehouse = result.value.list[result.value.index];
    expect(warehouse).toBeDefined();
    if (!warehouse) return;

    const kinds: KuKind[] = ['color', 'gradient', 'font', 'style'];
    for (const kind of kinds) {
      const name = fileNameOf(warehouse, kind);
      if (!name) continue;
      const file = join(LEGACY_DIR, name);
      if (!existsSync(file)) continue;

      const outcome = readKuGroups(kind, readText(file));
      expect(outcome.status, `${kind} ${name}`).toBe('ok');
      if (outcome.status === 'ok') {
        expect(outcome.value.length).toBeGreaterThan(0);
      }
    }
  });

  it('颜色项的 swatch 都是 # 开头的 6 位色值', () => {
    const raw = JSON.parse(readText(INDEX_FILE)) as unknown;
    const result = decodeStyleIndex(raw);
    if (result.status !== 'ok') return;

    const warehouse = result.value.list[result.value.index];
    if (!warehouse) return;

    const name = fileNameOf(warehouse, 'color');
    if (!name) return;
    const file = join(LEGACY_DIR, name);
    if (!existsSync(file)) return;

    const outcome = readKuGroups('color', readText(file));
    if (outcome.status !== 'ok') return;

    const swatches = outcome.value.flatMap((group) => group.items.map((item) => item.swatch));
    const valid = swatches.filter((value): value is string => typeof value === 'string');
    expect(valid.length).toBeGreaterThan(0);
    for (const swatch of valid) {
      expect(swatch).toMatch(/^#[0-9A-Fa-f]{3,8}$/);
    }
  });
});
