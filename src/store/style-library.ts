/**
 * 【范本】样式库状态切片
 * 只读投影：负责加载与选择，不写文件、不做业务动作。
 * 四类库各自保留三态结果，页面据此如实显示。
 */
import { create } from 'zustand';
import { log } from '../core/logger';
import { getPref } from '../core/prefs';
import {
  KU_KINDS,
  type KuGroup,
  type KuKind,
  type StyleWarehouse
} from '../domain/style-library';
import { readIndex, readLibrary } from '../repo/style-repo';
import type { Failure } from '../types/result';

function emptyRecord<T>(value: T): Record<KuKind, T> {
  return { color: value, gradient: value, font: value, style: value };
}

/** 展开分组偏好的键：**唯一拼写处**（`commands/style` 落盘时 import 这里） */
export const EXPANDED_GROUPS_KEY = 'style.expandedGroups';

/**
 * 偏好 → 展开的分组下标：**唯一判据**（同 `store/rename.normalizeMode`）。
 *
 * `prefs.json` 是用户可改的文件：不是数组、混进字符串 / `null` / 负数都见过。
 * 只留下标（非负整数）并去重；**空数组照收**（用户可能把组全收起了，那不是坏值）。
 * 不是数组才回默认 `[0]`（第一组展开，与旧实现一致）。
 */
export function normalizeExpandedGroups(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [0];

  const seen = new Set<number>();
  for (const value of raw) {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) seen.add(value);
  }
  return [...seen];
}

/**
 * 索引与四类库的失败臂（**只存失败臂，不存整条 `Result`**）。
 *
 * 存整条 `Result` 会让「读成功」与「没读过」在这个字段上同形，页面还得再判一次 `status`，
 * 而且 `ok` 臂上能拿到 `.value` —— 值和「读到没有」混在一起（`TD-05-1`，同 `store/text` 的判据）。
 *
 * 三态怎么读（页面只用这三条）：
 *   `failures[k] !== null`            ⇒ 那次读失败，`StateHint` 直接展示它
 *   `libraries[k] !== null` 且无失败   ⇒ 读到了（空数组 = 读到但是空的）
 *   `libraries[k] === null` 且无失败   ⇒ 还没读过
 */
interface StyleLibraryState {
  /** 索引的失败臂；`null` = 没失败过（含没读过） */
  indexFailure: Failure | null;
  warehouses: StyleWarehouse[];
  activeIndex: number;
  activeKind: KuKind;
  libraries: Record<KuKind, KuGroup[] | null>;
  /** 四类库各自的失败臂；`null` = 那次读没失败 */
  failures: Record<KuKind, Failure | null>;
  loading: boolean;
  /** 展开的分组下标（界面偏好；归一化后的值） */
  expandedGroups: number[];
  load: () => Promise<void>;
  /** 只改本地（命令 `setExpandedGroups` 负责落盘） */
  setExpandedGroups: (next: number[]) => void;
  setActiveKind: (kind: KuKind) => void;
  selectWarehouse: (index: number) => Promise<void>;
}

export const useStyleLibraryStore = create<StyleLibraryState>()((set, get) => {
  async function loadWarehouse(warehouse: StyleWarehouse | undefined): Promise<void> {
    const libraries = emptyRecord<KuGroup[] | null>(null);
    const failures = emptyRecord<Failure | null>(null);

    for (const kind of KU_KINDS) {
      const outcome = readLibrary(warehouse, kind);
      /* 失败臂原样存（`code` / `reason` / `detail` 一个不丢），值只在成功时落地 */
      if (outcome.status === 'error') {
        failures[kind] = outcome;
        continue;
      }
      libraries[kind] = outcome.value;
    }

    set({ libraries, failures });
  }

  return {
    indexFailure: null,
    warehouses: [],
    activeIndex: 0,
    activeKind: 'color',
    libraries: emptyRecord<KuGroup[] | null>(null),
    failures: emptyRecord<Failure | null>(null),
    loading: false,
    expandedGroups: normalizeExpandedGroups(getPref<unknown>(EXPANDED_GROUPS_KEY, [0])),

    setExpandedGroups(next) {
      set({ expandedGroups: next });
    },

    async load() {
      set({ loading: true });

      const index = readIndex();
      if (index.status === 'error') {
        /*
         * 这里**必须清空**，不能套「保留旧值」：
         * 索引读失败后 `warehouses` 与 `libraries` 的对应关系已经不可信，
         * 留着上一轮的库列表等于让用户看到另一个仓库的数据。
         * 判据：**同一数据源刷新失败 → 保留 + 标记**（`store/text`、`store/font`）；
         * **换数据源（切仓库 / 切文档）失败 → 清空 + 标记**，不许显示别处的数据。
         */
        set({
          indexFailure: index,
          warehouses: [],
          libraries: emptyRecord<KuGroup[] | null>(null),
          failures: emptyRecord<Failure | null>(null),
          loading: false
        });
        log.warn('样式库索引读取失败', { code: index.code, reason: index.reason, detail: index.detail });
        return;
      }

      const { list } = index.value;
      await loadWarehouse(list[index.value.index]);

      set({
        indexFailure: null,
        warehouses: list,
        activeIndex: index.value.index,
        loading: false
      });
      log.info('样式库已加载', { warehouses: list.length, index: index.value.index });
    },

    setActiveKind(kind) {
      set({ activeKind: kind });
    },

    async selectWarehouse(index) {
      const { warehouses } = get();
      const warehouse = warehouses[index];
      if (!warehouse) return;

      set({ loading: true, activeIndex: index });
      await loadWarehouse(warehouse);
      set({ loading: false });
    }
  };
});
