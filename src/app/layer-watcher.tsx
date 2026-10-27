/**
 * 【范本】当前图层监听
 *
 * 全项目**唯一**的图层订阅者，在 Layout 挂载一次。
 * 页面只从 store 读 `layerKind` / `layerName`，禁止自己 setInterval 轮询——
 * 那是第二套写法，且 N 个页面就是 N 倍 evalScript。
 *
 * 为什么用轮询而不是事件：PS 的图层选择事件需要 jsx 侧 registerNotification，
 * 目前没接。800ms 一次，开销是一次 evalScript，实测可接受。
 */

import { useEffect } from 'react';
import { getLayerState } from '../core/ps/layer';
import { useAppStore } from '../store/app';

/** 轮询间隔；面板隐藏时跳过，不消耗 evalScript */
const INTERVAL_MS = 800;

export function LayerWatcher() {
  const setLayer = useAppStore((s) => s.setLayer);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    let lastKey = '';

    async function tick() {
      if (document.hidden) return;

      const result = await getLayerState();
      if (cancelled) return;

      /* 无文档、读失败都归成 null，页面据此禁用「应用」 */
      const kind = result.ok ? result.data.kind : null;
      const name = result.ok ? result.data.name : '';
      const key = `${kind ?? ''}|${name}`;

      /* 状态没变就不触发 React 更新 */
      if (key === lastKey) return;
      lastKey = key;
      setLayer(kind, name);
    }

    void tick();
    timer = window.setInterval(() => {
      void tick();
    }, INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
    };
  }, [setLayer]);

  return null;
}
