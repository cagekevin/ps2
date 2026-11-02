/**
 * 【范本】常用页事件驱动（全项目**唯一**的常用页订阅者）
 *
 * 与 `layer-watcher` 分开的理由：那个只读图层状态、**永不写盘**；这里会触发嵌入 / 导出 /
 * 填色这类写操作，且要按开关逐个订阅 / 退订。合成一个会把两套生命周期捆在一起。
 *
 * 分工：
 *   `store/common-use.options`（5 个设置开关）+ `guideOn`（界面开关）
 *     → 本组件按开关订阅 / 退订 5 个语义
 *     → `commands/common-use` 执行（含写盘与 jsx）
 *
 * 三条硬规则：
 *   1. **页面不订阅**（`CONVENTIONS` §4.8）：常驻订阅只在这里，面板只改开关；
 *   2. **订阅失败只 `log.warn`，不弹 toast**：用户没点任何东西，弹错是噪音；
 *   3. **开关是唯一门控**，不再叠「有没有选区」之类的第二判据。
 */
import { useEffect } from 'react';
import {
  embedImage,
  relinkPlacedLayer,
  smartFill,
  smartReferenceLine
} from '../commands/common-use';
import {
  droppedPathOf,
  fillColorOf,
  referenceTargetOf,
  subscribeHostEvent,
  type HostEventName,
  type PhotoshopEventPayload
} from '../core/cep/ps-events';
import { log } from '../core/logger';
import { booleanOptionOf } from '../domain/common-use-options';
import { useCommonUseStore } from '../store/common-use';
import type { Result } from '../types/result';

/** 一条待订阅的语义 + 它命中后干什么 */
interface Subscription {
  name: HostEventName;
  onEvent: (payload: PhotoshopEventPayload) => void;
}

/** 跑一条命令（本组件不持有 UI：失败只留痕，不弹提示） */
function run(task: Promise<Result<unknown>>, label: string): void {
  void task.then((result) => {
    if (result.status === 'error') {
      log.warn(label, { code: result.code, reason: result.reason, detail: result.detail });
    }
  });
}

export function CommonUseWatcher() {
  /*
   * 逐项订阅：每个选择器只返回一个布尔，`load()` 换新对象时不会整棵重建。
   * **判据一律走 `booleanOptionOf`**（domain 的官方默认表），不自己写 `=== true`：
   * `cyAutoFillColor` 官方默认是 **true**，缺键时用 `=== true` 会判成关，与命令层/面板对不上。
   */
  const embedOnDrop = useCommonUseStore((s) => booleanOptionOf(s.options, 'cyDragInAutoEmbed'));
  const embedOnPaste = useCommonUseStore((s) => booleanOptionOf(s.options, 'cyPasetImageAutoEmbed'));
  const embedOnClipMask = useCommonUseStore((s) => booleanOptionOf(s.options, 'cyClipMaskAutoEmbed'));
  const relinkOnDrop = useCommonUseStore((s) => booleanOptionOf(s.options, 'cyOpenDranInToLinkObject'));
  const smartFillOn = useCommonUseStore((s) => booleanOptionOf(s.options, 'cyAutoFillColor'));
  const guideOn = useCommonUseStore((s) => s.guideOn);
  const loadOptions = useCommonUseStore((s) => s.load);

  /*
   * **必须自己先读一次设置**：`store/common-use.load()` 原先只有「常用页 / 设置页」调，
   * 而本组件在**所有页面**常驻。停在其它页面时 `options` 一直是官方默认值
   * （`cyOpenDranInToLinkObject` 默认 false）⇒ 拖入转链接永不订阅、智能填色按默认 true
   * 反而乱跑（2026-11-02 真机：开关状态 `relinkOnDrop:false`，而文件里是 true）。
   */
  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    /* 先把六个开关的**生效值**打出来：事件驱动的功能「没反应」时，第一个要回答的就是
       「effect 跑了没 / 它看到的开关是什么」。没有这行就只能靠猜（2026-11-02 查了一下午）。 */
    log.info('常用页事件订阅：开关状态', {
      embedOnDrop,
      embedOnPaste,
      embedOnClipMask,
      relinkOnDrop,
      smartFillOn,
      guideOn
    });

    /* 只列**当前开着**的语义：关着的开关不留空监听，退订即行为 */
    const subscriptions: Subscription[] = [];

    /*
     * **顺序 = 官方派发顺序：先 relink、后 embed**。
     *
     * 依据是 `app.v4.js` 的**派发处**（`:69463-69466`，`case 1349280544`）：
     *   `handleKey("cyOpenDranInToLinkObject", r); handleKey("cyDragInAutoEmbed", r);`
     * 不是 `mounted` 里的注册顺序（`:38222` / `:38225`）—— 注册只决定「开关开着才挂」，
     * 谁先跑由派发处决定。这里一度按注册顺序排成 embed 在前，结果嵌入先把置入层变成
     * 普通智能对象，relink 再跑时已经没有「置入」可转 ⇒ 勾了拖入转链接但没反应（`TD-01-29`）。
     * **别按可读性重排这两块。**
     */
    if (relinkOnDrop) {
      subscriptions.push({
        name: 'imageDropped',
        onEvent: (payload) => {
          /* 空路径的判据只在命令层（`relinkPlacedLayer` 的 `path:empty`）：
             这里再判一次就成了第二个判据，而且会把「载荷里没有 _path」吞成一句 warn，
             看不出宿主到底发了什么 —— 拖入自动转链接就查不到东西（2026-11-02）。 */
          run(relinkPlacedLayer(droppedPathOf(payload) ?? ''), '拖入转链接智能对象失败');
        }
      });
    }
    if (embedOnDrop) {
      subscriptions.push({ name: 'imageDropped', onEvent: () => run(embedImage(), '拖入自动嵌入失败') });
    }
    if (embedOnPaste) {
      subscriptions.push({ name: 'imagePasted', onEvent: () => run(embedImage(), '粘贴自动嵌入失败') });
    }
    if (embedOnClipMask) {
      subscriptions.push({
        name: 'clipMaskCreated',
        onEvent: () => run(embedImage(), '剪贴蒙版自动嵌入失败')
      });
    }
    if (smartFillOn) {
      subscriptions.push({
        name: 'fillColorChanged',
        onEvent: (payload) => {
          const property = fillColorOf(payload);
          if (!property) return;
          run(smartFill(property === 'foregroundColor' ? 'color' : 'line'), '智能填色失败');
        }
      });
    }
    if (guideOn) {
      subscriptions.push({
        name: 'referenceDrawn',
        onEvent: (payload) => {
          const target = referenceTargetOf(payload);
          if (!target) return;
          run(smartReferenceLine(target), '智能参考线失败');
        }
      });
    }

    if (!subscriptions.length) return;

    let cancelled = false;
    const unsubscribes: (() => void)[] = [];

    for (const { name, onEvent } of subscriptions) {
      void subscribeHostEvent(name, onEvent).then((result) => {
        if (result.status === 'error') {
          log.warn('常用页事件订阅失败，对应开关本次无效', {
            name,
            code: result.code,
            reason: result.reason,
            detail: result.detail
          });
          return;
        }
        /* 注册是 async 的：返回前依赖可能已经变了，此时必须立刻退订，否则监听表里越叠越多 */
        if (cancelled) {
          result.value();
          return;
        }
        unsubscribes.push(result.value);
      })
        /* 订阅里抛出来（`dispatchEvent` 被宿主拒、构造 CSEvent 失败）时，promise 会静默
           变成 unhandled rejection —— 表现就是「开关开着、什么日志都没有」（2026-11-02）。 */
        .catch((error: unknown) => {
          /* `String(error)`：CEP 抛出来的不是 Error，直接塞进 ctx 会被序列化成 `{}` */
          log.error('常用页事件订阅抛出异常', { name, message: String(error) });
        });
    }

    return () => {
      cancelled = true;
      for (const off of unsubscribes) off();
    };
  }, [embedOnDrop, embedOnPaste, embedOnClipMask, relinkOnDrop, smartFillOn, guideOn]);

  return null;
}
