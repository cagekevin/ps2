/**
 * 【范本】状态切片
 * 每个 feature 一个切片文件，禁止把所有状态塞进一个 store。
 * 组件必须用选择器订阅，禁止 useAppStore() 不带参数。
 *
 * `layerKind` / `layerName` 由 app/layer-watcher 统一写入，页面只读。
 *
 * 注意：这里**不放**「PS 是否就绪」。就绪状态由 core/ps/init 的模块级变量维护，
 * 因为它依赖 jsx 加载时机，放进 store 会出现两份真相。
 */
import { create } from 'zustand';
import type { LayerKind } from '../types/layer';

interface AppState {
  /** 当前活动图层类型，null 表示无文档或读取失败 */
  layerKind: LayerKind | null;
  /** 当前活动图层名称，空串表示未知 */
  layerName: string;
  setLayer: (kind: LayerKind | null, name: string) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  layerKind: null,
  layerName: '',
  setLayer: (layerKind, layerName) => set({ layerKind, layerName })
}));

/* 使用示例（组件内）：
 *   const layerKind = useAppStore((s) => s.layerKind);
 *   const layerName = useAppStore((s) => s.layerName);
 */
