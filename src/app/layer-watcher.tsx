/**
 * 【范本】当前图层监听
 *
 * 全项目**唯一**的图层订阅者，在 Layout 挂载一次。
 * 页面只从 store 读 `layerKind` / `layerName`，禁止自己 setInterval 轮询——
 * 那是第二套写法，且 N 个页面就是 N 倍 evalScript。
 *
 * **两条触发路径，官方也是两条**：
 * 1. **事件（快路径）**：原版 `app.v4.js:42472` 用 `$psEvent.add("1936483188", "ztSelectLayer", …)`
 *    ——`slct`（选区变化）事件驱动，事件一到就 `zt_getFontSimpleInfo` 读一次，
 *    **不比任何 key**。我们照做：`core/cep/ps-events.ts` 的注册与回调分发**全在 CEP 层**
 *    （`dispatchEvent` + `onPhotoshopCallback`），**不需要 jsx**。
 * 2. **轮询（兜底）**：800ms 一次。事件可能不来（CEP 事件不稳），所以留着。
 *
 * **身份仍靠「类型 + 图层名」**（`layerKey`），所以改图层名会多读一次文字属性（界面无变化）。
 * 官方**也一样**：`slct` 的 `layerID` 分支里 `cyUpdataLayerName` 与 `ztSelectLayer` 并列
 * （`app.v4.js:69427`）——改名时官方也重读。
 * 事件载荷里带的 `layerID`（PS 全局 id）官方**没有**用来判身份（`selectLayer` 无参），
 * 我们也没有用。逐条现状见 `docs/plan/12-事件驱动的图层监听-2026-10-28.md`。
 */

import { useEffect } from 'react';
import { subscribeHostEvent } from '../core/cep/ps-events';
import { getLayerState } from '../core/ps/layer';
import { log } from '../core/logger';
import { useAppStore } from '../store/app';

/** 轮询间隔；面板隐藏时跳过，不消耗 evalScript */
const INTERVAL_MS = 800;

export function LayerWatcher() {
  const setLayer = useAppStore((s) => s.setLayer);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    let lastKey = '';
    /*
     * 上一次 tick 没回来就跳过这一次：PS 忙时 `setInterval` 会把请求堆进串行队列。
     *
     * **与 `store/text` 的 `refreshSeq` 是两种，别混抄**：
     *   - 这里用「跳过重复请求」（`inFlight`）：轮询宁可少一次，也不能积压；
     *   - `store/text` 用「序号丢弃过期」（`refreshSeq`）：用户主动点刷新，每次都必须算数，
     *     只丢过期的那份结果。
     * 判据：**固定节奏自动触发 → 跳过；用户动作触发 → 序号**。
     */
    let inFlight = false;
    /* 事件撞上正在跑的读时排队（这次必须算数），轮询撞上仍然跳过 */
    let queued = false;
    /* 读失败只记一次，恢复后重置——否则每 800ms 刷一条 */
    let failureLogged = false;

    /**
     * @param urgent 事件触发的**必须算数**：撞上正在跑的读就排队，不丢。
     *   轮询的 urgent=false：撞上就跳过（宁可少一次，也不能积压）。
     */
    async function tick(urgent = false) {
      if (document.hidden) return;
      if (inFlight) {
        if (urgent) queued = true;
        return;
      }
      inFlight = true;

      try {
        const result = await getLayerState();
        if (cancelled) return;

        if (result.status === 'error') {
          /*
           * 读失败 ≠ 没选中图层。
           *
           * 原来这里把失败折成 `null`，界面显示「未选中图层」，而真实原因
           * （`PS_UNREADY` / `EvalScript error`）一点痕迹都没有——每秒 1.25 次静默失败。
           * 现在：保持上一次状态（不假报「未选中」），码与现场进日志。
           */
          if (!failureLogged) {
            failureLogged = true;
            log.warn('图层状态读取失败', { code: result.code, detail: result.detail });
          }
          return;
        }

        failureLogged = false;
        const key = `${result.value.kind ?? ''}|${result.value.name}`;

        /* 状态没变就不触发 React 更新 */
        if (key === lastKey) return;
        lastKey = key;
        setLayer(result.value.kind, result.value.name);
      } finally {
        inFlight = false;
        if (queued && !cancelled) {
          queued = false;
          void tick(true);
        }
      }
    }

    void tick();
    timer = window.setInterval(() => {
      void tick();
    }, INTERVAL_MS);

    /**
     * 事件快路径：官方判据由 `core/cep/ps-events` 承担
     * （`layerChanged` = 官方 `ztSelectLayer` 的触发条件；`documentChanged` = 官方
     * `tbSwitchDocument` 的触发条件，见 `app.v4.js:69408` 一带）。
     *
     * 命中就**立刻**读一次，用户不用等满 800ms；轮询保留兜底。
     */
    const unsubscribes: (() => void)[] = [];
    for (const name of ['layerChanged', 'documentChanged'] as const) {
      void subscribeHostEvent(name, () => {
        void tick(true);
      })
        .then((off) => {
          unsubscribes.push(off);
        })
        .catch(() => {
          /* 注册失败已由 `ps-events` 记日志；轮询兜底继续跑（不静默、不降级放行） */
        });
    }

    return () => {
      cancelled = true;
      for (const off of unsubscribes) off();
      if (timer !== null) window.clearInterval(timer);
    };
  }, [setLayer]);

  return null;
}
