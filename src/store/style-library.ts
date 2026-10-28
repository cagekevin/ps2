/**
 * 【范本】样式库状态切片
 * 只读投影：负责加载与选择，不写文件、不做业务动作。
 * 四类库各自保留三态结果，页面据此如实显示。
 */
import { create } from 'zustand';
import { log } from '../core/logger';
import {
  KU_KINDS,
  type KuGroup,
  type KuKind,
  type StyleWarehouse,
  type StyleWarehouseIndex
} from '../domain/style-library';
import { readIndex, readLibrary } from '../repo/style-repo';
import type { Result } from '../types/result';

function emptyRecord<T>(value: T): Record<KuKind, T> {
  return { color: value, gradient: value, font: value, style: value };
}

interface StyleLibraryState {
  indexResult: Result<StyleWarehouseIndex> | null;
  warehouses: StyleWarehouse[];
  activeIndex: number;
  activeKind: KuKind;
  libraries: Record<KuKind, KuGroup[] | null>;
  results: Record<KuKind, Result<KuGroup[]> | null>;
  loading: boolean;
  load: () => Promise<void>;
  setActiveKind: (kind: KuKind) => void;
  selectWarehouse: (index: number) => Promise<void>;
}

export const useStyleLibraryStore = create<StyleLibraryState>()((set, get) => {
  async function loadWarehouse(warehouse: StyleWarehouse | undefined): Promise<void> {
    const libraries = emptyRecord<KuGroup[] | null>(null);
    const results = emptyRecord<Result<KuGroup[]> | null>(null);

    for (const kind of KU_KINDS) {
      const outcome = readLibrary(warehouse, kind);
      results[kind] = outcome;
      libraries[kind] = outcome.status === 'ok' ? outcome.value : null;
    }

    set({ libraries, results });
  }

  return {
    indexResult: null,
    warehouses: [],
    activeIndex: 0,
    activeKind: 'color',
    libraries: emptyRecord<KuGroup[] | null>(null),
    results: emptyRecord<Result<KuGroup[]> | null>(null),
    loading: false,

    async load() {
      set({ loading: true });

      const indexResult = readIndex();
      if (indexResult.status !== 'ok') {
        /*
         * 这里**必须清空**，不能套「保留旧值」：
         * 索引读失败后 `warehouses` 与 `libraries` 的对应关系已经不可信，
         * 留着上一轮的库列表等于让用户看到另一个仓库的数据。
         * 判据：**同一数据源刷新失败 → 保留 + 标记**（`store/text`、`store/font`）；
         * **换数据源（切仓库 / 切文档）失败 → 清空 + 标记**，不许显示别处的数据。
         */
        set({
          indexResult,
          warehouses: [],
          libraries: emptyRecord<KuGroup[] | null>(null),
          results: emptyRecord<Result<KuGroup[]> | null>(null),
          loading: false
        });
        log.warn('样式库索引读取失败', indexResult);
        return;
      }

      const { list, index } = indexResult.value;
      await loadWarehouse(list[index]);

      set({ indexResult, warehouses: list, activeIndex: index, loading: false });
      log.info('样式库已加载', { warehouses: list.length, index });
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
