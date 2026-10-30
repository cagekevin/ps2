/**
 * 【唯一入口】图标 + 展开面板 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * **右键语义**：`onContextMenu` 只做「展开 / 收起」，**不判 Ctrl** —— 这与官方一致
 * （官方普通右键展开）。官方还有一层「**Ctrl+右键** 把该项加入自由面板」，
 * 我方**未接**（`TD-09-7`，解释见 `daily/架构日志/05-跨区-自由面板-现状与接续-2026-10-29.md`）。
 * 接的时候只改这一处：`if (event.ctrlKey || event.metaKey) → commands.addToFreePanel(...)`，
 * **不要在页面里另接 `contextmenu`**。
 *
 * 【范本】图标 + 展开面板（触发器与面板的公共壳）
 *
 * 用在哪：一排工具图标，点图标是主操作，右键在图标行**下方**展开它的设置区
 * （字体面板的「生成按钮 / 粘贴文字属性」、常用页的一批按钮都是这个形状）。
 *
 * 四条定死的规则（`CONVENTIONS` §6）：
 *   1. 关闭只认触发器：再点同一个 = 关；同组内点另一个 = 顶掉它（互斥时）
 *   2. **点外部不关、Esc 不关**——与 `ContextMenu` / `useDismiss` 的默认语义相反，
 *      所以这里刻意不挂 `useDismiss`。改这条会直接改变原版交互
 *   3. 互斥是 `IconPanelGroup` 的开关：`exclusive` 默认 `true`；
 *      要同时展开多个（字号 / 行距 / 字距的预设）就传 `false`
 *   4. 面板渲染在**组末尾**（整宽推开后续内容），不贴在某个图标下面——
 *      所以自定义触发器也必须和面板同组，别指望面板跟着触发器跑
 *
 * 受控模式（`openId` + `onOpenChange`）：不传 `openId` 时组内自己管，字体面板就按这种方式用，
 * 零改动。常用页要「跨行也只开一个」，做法是**每行一个组、所有组绑同一个 `openId`**——
 * 组内互斥管不了跨组，只能由页面把同一个值发下去。受控值只表达「当前开着的那个」，
 * 需要同时开多个请用非受控 + `exclusive={false}`。
 *
 * 面板用 `createPortal` 落到组末尾的宿主 div：面板节点始终留在 `IconPanel` 自己的
 * React 子树里，props 变化会正常更新。**不要改回「把节点存进 ref、由组去读」**——
 * 那种写法下注册不触发渲染，打开面板的第一帧会拿到上一轮注册的旧节点。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode
} from 'react';
import { createPortal } from 'react-dom';
import './icon-panel.css';
import { log } from '../../core/logger';
import { Chevron } from '../Chevron';
import { IconButton } from '../IconButton';
import type { IconName } from '../icons';

type TriggerHandlers = {
  /** 无参开关：绑到「点一下就展开」的小按钮（数字框右侧箭头这类） */
  toggle: () => void;
  /** 带事件开关：需要看 ctrlKey / shiftKey 时用 */
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
  active: boolean;
  'aria-expanded': boolean;
  /** 展开面板的 DOM id；收起时不传 */
  'aria-controls'?: string;
};

interface GroupValue {
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  /** 面板落地的宿主容器（组末尾的空 div） */
  host: HTMLElement | null;
  /** 挂载计数：同 id 挂第二个说明 id 重复 */
  mount: (id: string) => number;
  unmount: (id: string) => void;
}

const GroupContext = createContext<GroupValue | null>(null);

interface GroupProps {
  /** true（默认）：同组只开一个；false：各自开关互不影响 */
  exclusive?: boolean;
  /** 受控：当前开着的面板 id，空串 = 全收起；不传则组内自己管 */
  openId?: string;
  /** 受控回调：抛出变化后的 id（全收起时是空串） */
  onOpenChange?: (openId: string) => void;
  className?: string;
  children: ReactNode;
}

/** 一组图标 + 它们共用的面板宿主（面板按触发顺序渲染在组末尾） */
export function IconPanelGroup({
  exclusive = true,
  openId,
  onOpenChange,
  className = '',
  children
}: GroupProps) {
  const controlled = openId !== undefined;
  const [internalIds, setInternalIds] = useState<string[]>([]);
  /* 受控时唯一真相在调用方；这里只是把单个 id 折成同一种数组形状，下面分支只有一处。
     必须 memo：否则每次渲染都是新数组，下面几个 useCallback 的依赖会跟着变 */
  const openIds = useMemo(
    () => (controlled ? (openId ? [openId] : []) : internalIds),
    [controlled, openId, internalIds]
  );
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const counts = useRef(new Map<string, number>());

  const commit = useCallback(
    (next: string[]) => {
      if (!controlled) setInternalIds(next);
      /* 最后一个是「刚打开的那个」；全收起时抛空串，调用方不必再判断 undefined */
      onOpenChange?.(next[next.length - 1] ?? '');
    },
    [controlled, onOpenChange]
  );

  const toggle = useCallback(
    (id: string) => {
      if (openIds.includes(id)) {
        commit(openIds.filter((item) => item !== id));
        return;
      }
      commit(exclusive ? [id] : [...openIds, id]);
    },
    [commit, exclusive, openIds]
  );

  const isOpen = useCallback((id: string) => openIds.includes(id), [openIds]);

  const mount = useCallback((id: string) => {
    const next = (counts.current.get(id) ?? 0) + 1;
    counts.current.set(id, next);
    return next;
  }, []);

  const unmount = useCallback((id: string) => {
    const current = counts.current.get(id) ?? 0;
    if (current <= 1) counts.current.delete(id);
    else counts.current.set(id, current - 1);
  }, []);

  /* 从「可多开」切到「互斥」时，把已经开着的收敛成一个，否则会同时露出多个面板。
     受控时不能动：值在调用方手里，组内再改一次就是两套真相 */
  useEffect(() => {
    if (exclusive && !controlled) setInternalIds((current) => current.slice(-1));
  }, [exclusive, controlled]);

  const value = useMemo<GroupValue>(
    () => ({ isOpen, toggle, host, mount, unmount }),
    [isOpen, toggle, host, mount, unmount]
  );

  return (
    <GroupContext.Provider value={value}>
      {/* 组根只是「行 + 面板宿主」的容器，没有自己的视觉，所以不挂本组件的类名 */}
      <div className={className || undefined}>
        {children}
        <div ref={setHost} className="mm-icon-panel__host" />
      </div>
    </GroupContext.Provider>
  );
}

interface PanelProps {
  /** 组内唯一；互斥判定靠它，重复会让两个触发器抢同一个开关 */
  id: string;
  title: string;
  /** 有 panel 才表现得像「可展开」；没有就只是普通按钮 */
  panel?: ReactNode | ((close: () => void) => ReactNode);
  /** 主操作（左键）。不传 = 左键也是开/关 */
  onPrimary?: (event: MouseEvent<HTMLElement>) => void;
  /** 默认触发器的图标；用 `trigger` 时忽略 */
  icon?: IconName;
  badge?: boolean;
  disabled?: boolean;
  /** 自定义触发器（数字框右侧小箭头这类），需要自己处理 active 与 aria */
  trigger?: (handlers: TriggerHandlers) => ReactNode;
}

/**
 * 标题行触发器：整行「箭头 + 标题」，点整行开合（原 `Collapse` 的头部）。
 *
 * 这是**触发器的第二种默认形态**（第一种是图标按钮），不是第二个组件：
 * 需要「一行标题开合一块内容」时传 `trigger={sectionTrigger('标题')}`，
 * 不要自己拼 `<button>` + `Chevron` + aria —— 那会在页面里长出第三个折叠实现。
 *
 * 箭头随开合（收起朝右 / 展开朝下）：`aria-expanded` 与箭头方向同时表达同一件事。
 */
export function sectionTrigger(title: string) {
  return (handlers: TriggerHandlers) => (
    <button
      type="button"
      className="mm-icon-panel__title"
      aria-expanded={handlers['aria-expanded']}
      aria-controls={handlers['aria-controls']}
      onClick={handlers.toggle}
    >
      <Chevron open={handlers['aria-expanded']} />
      <span className="mm-icon-panel__title-text">{title}</span>
    </button>
  );
}

/** 一个触发器 + 它要展开的面板（面板 portal 到组末尾的宿主里） */
export function IconPanel({
  id,
  title,
  panel,
  onPrimary,
  icon,
  badge = false,
  disabled = false,
  trigger
}: PanelProps) {
  const group = useContext(GroupContext);
  if (!group) throw new Error('IconPanel 必须在 IconPanelGroup 内使用');

  const { isOpen, toggle, host, mount, unmount } = group;
  const open = isOpen(id);
  const panelId = useId();

  /* 同组内 id 重复不会报错、只会「点 A 开 B」——挂载时数一次，重复就留痕 */
  useEffect(() => {
    if (mount(id) > 1) {
      log.warn('IconPanel 的 id 重复：同组内两个触发器用了同一个 id', { id });
    }
    return () => unmount(id);
  }, [id, mount, unmount]);

  function flip(): void {
    if (disabled || panel === undefined) return;
    toggle(id);
  }

  function onClick(event: MouseEvent<HTMLElement>): void {
    if (disabled) return;
    if (onPrimary) {
      onPrimary(event);
      return;
    }
    flip();
  }

  /**
   * 右键 = 开关面板。`preventDefault` **必须在这里做**：自定义 trigger 直接挂这个 handler，
   * 而原生右键菜单只有 `IconButton` 内部挡过——自定义 trigger（如常用页的功能格）此前会
   * 同时弹出系统菜单。
   */
  function onContextMenu(event: MouseEvent<HTMLElement>): void {
    event.preventDefault();
    if (disabled || panel === undefined) return;
    toggle(id);
  }

  const handlers: TriggerHandlers = {
    toggle: flip,
    onClick,
    onContextMenu,
    active: open,
    'aria-expanded': open,
    'aria-controls': open ? panelId : undefined
  };

  const triggerNode = trigger ? (
    trigger(handlers)
  ) : (
    <IconButton
      name={icon ?? 'iconzihaodaxiao1'}
      title={title}
      badge={badge}
      active={open}
      disabled={disabled}
      ariaExpanded={panel === undefined ? undefined : open}
      ariaControls={open ? panelId : undefined}
      onClick={onClick}
      onContextMenu={onContextMenu}
    />
  );

  /* 没展开时不调用 `panel(close)`：函数式面板可能有开销，收起状态不该付 */
  const panelNode =
    open && panel !== undefined
      ? typeof panel === 'function'
        ? panel(() => toggle(id))
        : panel
      : null;

  return (
    <>
      {triggerNode}
      {panelNode && host
        ? createPortal(
            <div id={panelId} className="mm-icon-panel__box">
              {panelNode}
            </div>,
            host
          )
        : null}
    </>
  );
}
