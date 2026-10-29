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

  useEffect(() => {
    /* 只列**当前开着**的语义：关着的开关不留空监听，退订即行为 */
    const subscriptions: Subscription[] = [];

    /*
     * **顺序有意义**：`imageDropped` 上挂两个回调时，官方是先 `relink` 后 `embed`
     * （`13-常用-V2` §0.2 第 4 条 / `ps/src/commands/commonUse.ts:564-575`）——
     * 先嵌入再改链接，那时图层已经不是「置入」状态了。监听按插入顺序触发，
     * 所以 relink 必须写在 embed 前面。**别按可读性重排这两块。**
     */
    if (relinkOnDrop) {
      subscriptions.push({
        name: 'imageDropped',
        onEvent: (payload) => {
          const path = droppedPathOf(payload);
          if (!path) {
            log.warn('拖入转链接缺少文件路径，已跳过', { payload });
            return;
          }
          run(relinkPlacedLayer(path), '拖入转链接智能对象失败');
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
      });
    }

    return () => {
      cancelled = true;
      for (const off of unsubscribes) off();
    };
  }, [embedOnDrop, embedOnPaste, embedOnClipMask, relinkOnDrop, smartFillOn, guideOn]);

  return null;
}
