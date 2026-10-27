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
import type { ReadOutcome } from '../types/read';

function emptyRecord<T>(value: T): Record<KuKind, T> {
  return { color: value, gradient: value, font: value, style: value };
}

interface StyleLibraryState {
  indexOutcome: ReadOutcome<StyleWarehouseIndex> | null;
  warehouses: StyleWarehouse[];
  activeIndex: number;
  activeKind: KuKind;
  libraries: Record<KuKind, KuGroup[] | null>;
  outcomes: Record<KuKind, ReadOutcome<KuGroup[]> | null>;
  loading: boolean;
  load: () => Promise<void>;
  setActiveKind: (kind: KuKind) => void;
  selectWarehouse: (index: number) => Promise<void>;
}

export const useStyleLibraryStore = create<StyleLibraryState>()((set, get) => {
  async function loadWarehouse(warehouse: StyleWarehouse | undefined): Promise<void> {
    const libraries = emptyRecord<KuGroup[] | null>(null);
    const outcomes = emptyRecord<ReadOutcome<KuGroup[]> | null>(null);

    for (const kind of KU_KINDS) {
      const outcome = readLibrary(warehouse, kind);
      outcomes[kind] = outcome;
      libraries[kind] = outcome.status === 'ok' ? outcome.value : null;
    }

    set({ libraries, outcomes });
  }

  return {
    indexOutcome: null,
    warehouses: [],
    activeIndex: 0,
    activeKind: 'color',
    libraries: emptyRecord<KuGroup[] | null>(null),
    outcomes: emptyRecord<ReadOutcome<KuGroup[]> | null>(null),
    loading: false,

    async load() {
      set({ loading: true });

      const indexOutcome = readIndex();
      if (indexOutcome.status !== 'ok') {
        set({
          indexOutcome,
          warehouses: [],
          libraries: emptyRecord<KuGroup[] | null>(null),
          outcomes: emptyRecord<ReadOutcome<KuGroup[]> | null>(null),
          loading: false
        });
        log.warn('样式库索引读取失败', indexOutcome);
        return;
      }

      const { list, index } = indexOutcome.value;
      await loadWarehouse(list[index]);

      set({ indexOutcome, warehouses: list, activeIndex: index, loading: false });
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
