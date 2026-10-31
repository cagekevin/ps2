/**
 * **模板库私有 · 禁止外借**
 *
 * 这个 hook 只服务模板库页面的一个动作：**把条目卡拖到文件夹格（或路径栏）里 = 移动条目**。
 *
 * ## 不许别人用，也不许别人抄
 *
 * - **不许**在别处 import 它。它不是公共件，不进 `GOVERNANCE` §4.1 清单，不是范本。
 * - **不许**把它当「通用拖放」抄到别的页面。别的页面要拖拽排序，用 `hooks/useLongPressDrag`
 *   （那份是排序语义：长按 300ms + 浮层克隆 + before/after 落点）。
 * - 万一以后第二个页面真要「拖进容器」，那时再把它提升成公共件并写清判据 ——
 *   现在是**单消费者**，按 `STYLE` §6.2「零/单消费者不建公共件」留在页面目录里。
 *
 * ## 为什么不用 `useLongPressDrag`
 *
 * 那份回答的是「拖到了哪个元素的前面还是后面」（`DropPosition`），本页要的是
 * 「**落进了哪个文件夹**」（drop-into），语义不同、事件链也不同。
 * 它自己的文件头写着「不要和 HTML5 DnD 混用（两条链）」—— 所以这里只用一条链：
 * **原生 HTML5 拖放**，十几行，不长按、不克隆浮层、不做落点高亮。
 *
 * ## 用到的东西
 *
 * `draggable` + `dataTransfer.setData('template-item', id)`；落点 `dragover` 必须
 * `preventDefault()`，否则 `drop` 不触发（浏览器默认光标也会变成「可放下」，不用自己画）。
 */

import { useCallback, useState } from 'react';

/** 只在页面内部流动的 MIME；别的页面即使收到也认不出，避免误接 */
const MIME = 'template-item';

interface DragHandlers {
  /** 条目卡：`draggable` + 记下被拖的 id */
  itemProps: (id: string) => {
    draggable: true;
    onDragStart: (event: React.DragEvent<HTMLElement>) => void;
    onDragEnd: () => void;
  };
  /** 文件夹格 / 路径栏：接住放下 */
  dropProps: (folderId: string | null) => {
    onDragOver: (event: React.DragEvent<HTMLElement>) => void;
    onDrop: (event: React.DragEvent<HTMLElement>) => void;
  };
  /** 正在拖的那条（用于给卡片一点视觉弱化）；null = 没在拖 */
  draggingId: string | null;
}

export function useTemplateDrag(onDrop: (itemId: string, folderId: string | null) => void): DragHandlers {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const itemProps = useCallback<DragHandlers['itemProps']>(
    (id) => ({
      draggable: true,
      onDragStart: (event) => {
        event.dataTransfer.setData(MIME, id);
        event.dataTransfer.effectAllowed = 'move';
        setDraggingId(id);
      },
      onDragEnd: () => setDraggingId(null)
    }),
    []
  );

  const dropProps = useCallback<DragHandlers['dropProps']>(
    (folderId) => ({
      /* 必须 preventDefault：不写这一句 `drop` 永远不触发 */
      onDragOver: (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      },
      onDrop: (event) => {
        event.preventDefault();
        const id = event.dataTransfer.getData(MIME);
        setDraggingId(null);
        /* 是否「拖回原位」由页面判（这里不知道条目当前在哪个文件夹）；原地不该写盘 */
        if (id) onDrop(id, folderId);
      }
    }),
    [onDrop]
  );

  return { itemProps, dropProps, draggingId };
}
