/**
 * 【范本】样式面板。
 *
 * 仓库条 → 四个 tab → 分组列表（默认只展开第一组）→ 底栏。
 *
 * 本文件只做**骨架和 JSX**：动作（应用 / 增删改 / 拖拽 / 右键菜单）全在
 * `useStyleActions`，单项渲染在 `components/ItemView`。
 * 拆分依据：动作与单项渲染各自独立成模块，页面只负责组装（不设行数上限）。
 */
import { useEffect, useMemo, useState } from 'react';
import { Portal } from '../../components/Portal';
import { ContextMenu } from '../../components/ContextMenu';
import { GroupHead } from '../../components/GroupHead';
import { Icon } from '../../components/icons';
import { InlineEdit } from '../../components/InlineEdit';
import { useFloatingPosition } from '../../hooks/useFloatingPosition';
import { useRunCommand } from '../../hooks/useRunCommand';
import { failWithDetail, ok } from '../../types/result';
import {
  describeDetail,
  KU_KINDS,
  KU_TAB_LABELS,
  type KuGroup,
  type KuKind
} from '../../domain/style-library';
import { extractImageColors } from '../../domain/image-color';
import { createCanvas, decodeImage, readFileAsDataUrl } from '../../core/image';
import {
  applyColorByHex,
  applyGradientPair,
  saveExtractedColorsToGroup,
  saveExtractedGradientsToGroup,
  saveExtractedToSwatch
} from '../../commands/style';
import { useToast } from '../../components/Toast';
import { useStyleLibraryStore } from '../../store/style-library';
import { StyleBottomBar } from './components/StyleBottomBar';
import { ImgColorDialog } from './components/ImgColorDialog';
import { ItemView } from './components/ItemView';
import { NewGroupRow } from './components/NewGroupRow';
import { MessageBar, failureMessage, mergeMessages } from '../../components/MessageBar';
import { MSG } from '../../types/messages';
import { ADD_TITLE, useStyleActions } from './useStyleActions';
import './StylePage.css';

/** 悬停浮层的目标：定位锚点就是那个项元素 */
interface DescribeTarget {
  kind: KuKind;
  groupIndex: number;
  itemIndex: number;
  el: HTMLElement;
}

/** 多选显示时库的排序：固定 tab 顺序，不跟点击顺序走 */
const KIND_ORDER: Record<KuKind, number> = { color: 0, gradient: 1, font: 2, style: 3 };

/**
 * 一条库的分组列表（单选时只有一条，多选时命中几条连排几条）。
 *
 * 从页面主体抽出：kind 由父级给定——单选 = activeKind；多选时每条 section
 * 用**自己库的 kind** 渲染格子、「+」与浮层，动作层（useStyleActions）照旧读 activeKind。
 * 编辑态（editing）与新建分组占位（newGroup）仍归页面管：它们只落在当前库（activeKind）
 * 那条 section 上，非当前库的 section 不渲染这两样。
 */
function StyleLibrarySection({
  kind,
  isCurrent,
  expanded,
  onToggleGroup,
  onGroupMenu,
  onGroupMouseDown,
  onAddItem,
  onApply,
  onDescribe,
  onItemMenu,
  onItemMouseDown,
  onRename,
  onCancelRename,
  pageEditing,
  draggedRef,
  /** 新建分组占位要插在第几组之后；-1 = 空库建组（原版约定）；null = 不渲染 */
  newGroupAfterIndex,
  onNewGroupCommit,
  onNewGroupCancel
}: {
  kind: KuKind;
  /** 是否 = activeKind：编辑态 / 新建分组占位 / 拖拽重排只落在当前库上 */
  isCurrent: boolean;
  expanded: Set<number>;
  onToggleGroup: (index: number) => void;
  onGroupMenu: (event: React.MouseEvent, groupIndex: number, name: string) => void;
  onGroupMouseDown: (event: React.MouseEvent, groupIndex: number) => void;
  onAddItem: (groupIndex: number) => void;
  onApply: (groupIndex: number, itemIndex: number, name: string, event: React.MouseEvent) => void;
  onDescribe: (kind: KuKind, groupIndex: number, itemIndex: number, show: boolean, el?: HTMLElement) => void;
  onItemMenu: (event: React.MouseEvent, groupIndex: number, itemIndex: number, name: string) => void;
  onItemMouseDown: (event: React.MouseEvent, groupIndex: number, itemIndex: number) => void;
  onRename: (target: { type: 'group'; groupIndex: number } | { type: 'item'; groupIndex: number; itemIndex: number }, name: string) => void;
  onCancelRename: () => void;
  /** 页面的编辑态：只落当前库的 section（形状同 handleRename 的入参） */
  pageEditing: { type: 'group'; groupIndex: number } | { type: 'item'; groupIndex: number; itemIndex: number } | null;
  /** 页面的拖拽「刚拖完」标记：挡掉拖完那次误折叠 click */
  draggedRef: React.MutableRefObject<boolean>;
  /** 新建分组占位要插在第几组之后；-1 = 空库建组（原版约定）；null = 不渲染 */
  newGroupAfterIndex: number | null;
  onNewGroupCommit: (name: string, afterIndex: number) => void;
  onNewGroupCancel: () => void;
}) {
  const groups = useStyleLibraryStore((state) => state.libraries[kind]);
  const failure = useStyleLibraryStore((state) => state.failures[kind]);
  /* 编辑态归页面管（只落当前库）；这里只是读出来对位置 */
  const editing = isCurrent ? pageEditing : null;
  return (
    <>
      {failure ? null : (groups ?? []).map((group: KuGroup, index: number) => {
        const isOpen = expanded.has(index);
        return (
          <div
            key={`${kind}-${group.name}-${index}`}
            className="mm-style__group"
          >
            {editing?.type === 'group' && editing.groupIndex === index ? (
              <GroupHead
                title={group.name}
                open={isOpen}
                onToggle={() => undefined}
                titleSlot={
                  <InlineEdit
                    value={group.name}
                    onCommit={(next) => void onRename({ type: 'group', groupIndex: index }, next)}
                    onCancel={onCancelRename}
                  />
                }
              />
            ) : (
              <GroupHead
                title={group.name}
                open={isOpen}
                onToggle={() => {
                  /* 刚拖完的那次 click 不算折叠 */
                  if (draggedRef.current) {
                    draggedRef.current = false;
                    return;
                  }
                  onToggleGroup(index);
                }}
                onMouseDown={(event) => onGroupMouseDown(event, index)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  onGroupMenu(event, index, group.name);
                }}
                /* 拖拽落点靠这两个属性选节点（`useStyleActions` 的 `[data-group-head]`），别改名 */
                data={{ 'data-group-head': '', 'data-group-index': index }}
              />
            )}

            {isOpen ? (
              <div className="mm-u-tiles">
                {group.items.map((item, itemIndex) => (
                  <ItemView
                    key={`${item.name}-${itemIndex}`}
                    kind={kind}
                    item={item}
                    groupIndex={index}
                    itemIndex={itemIndex}
                    editing={
                      editing?.type === 'item' &&
                      editing.groupIndex === index &&
                      editing.itemIndex === itemIndex
                    }
                    onApply={onApply}
                    onDescribe={(show, el) => onDescribe(kind, index, itemIndex, show, el)}
                    onContextMenu={onItemMenu}
                    onMouseDown={onItemMouseDown}
                    onRename={(next) =>
                      void onRename({ type: 'item', groupIndex: index, itemIndex }, next)
                    }
                    onCancelRename={onCancelRename}
                  />
                ))}

                {/* 组末尾的「+」：四库各一个（原版 .add-svg / .add / .img-add） */}
                <button
                  type="button"
                  className={`mm-style__add mm-style__add--${kind}`}
                  title={ADD_TITLE[kind]}
                  onClick={() => onAddItem(index)}
                >
                  <Icon name="iconchuangjian" />
                </button>
              </div>
            ) : null}

            {/* 新建分组占位：插在这一组之后（只落当前库的 section） */}
            {isCurrent && newGroupAfterIndex === index ? (
              <NewGroupRow
                onCommit={(name) => onNewGroupCommit(name, index)}
                onCancel={onNewGroupCancel}
              />
            ) : null}
          </div>
        );
      })}

      {/* 空库时没有「某组之后」，直接渲染在列表里（-1 = 原版空库建组约定） */}
      {isCurrent && newGroupAfterIndex === -1 ? (
        <NewGroupRow
          onCommit={(name) => onNewGroupCommit(name, -1)}
          onCancel={onNewGroupCancel}
        />
      ) : null}
    </>
  );
}

export default function StylePage() {
  const load = useStyleLibraryStore((state) => state.load);
  const loadingLibrary = useStyleLibraryStore((state) => state.loading);
  const indexFailure = useStyleLibraryStore((state) => state.indexFailure);
  /* 仓库不再显示，但「拖图入库」要知道写进哪个库文件，所以这两个数据仍要订阅 */
  const warehouses = useStyleLibraryStore((state) => state.warehouses);
  const activeIndex = useStyleLibraryStore((state) => state.activeIndex);
  const activeKind = useStyleLibraryStore((state) => state.activeKind);
  const setActiveKind = useStyleLibraryStore((state) => state.setActiveKind);
  const toggleExtraKind = useStyleLibraryStore((state) => state.toggleExtraKind);
  /* Ctrl 点 tab 并进来一起显示的库（顺序 = 点击顺序；显示顺序见 KIND_ORDER） */
  const extraKinds = useStyleLibraryStore((state) => state.extraKinds);
  const libraries = useStyleLibraryStore((state) => state.libraries);
  const failures = useStyleLibraryStore((state) => state.failures);
  /* 单选时页面只渲染这一条库；多选时按 KIND_ORDER 把命中的库上下连排 */
  const groups = useStyleLibraryStore((state) => state.libraries[state.activeKind]);
  const failure = useStyleLibraryStore((state) => state.failures[state.activeKind]);

  /* 悬停浮层：enter 时记下项与锚点元素，leave 清空 */
  const [describe, setDescribe] = useState<DescribeTarget | null>(null);
  const describeAnchor = useMemo(() => describe?.el ?? null, [describe]);
  const { floatingRef: describeRef, update: updateDescribe } = useFloatingPosition({
    placement: 'bottom-start'
  });

  useEffect(() => {
    if (describeAnchor) updateDescribe(describeAnchor);
  }, [describeAnchor, updateDescribe]);

  const describeContent = useMemo(() => {
    if (!describe) return null;
    const group = libraries[describe.kind]?.[describe.groupIndex];
    const item = group?.items[describe.itemIndex];
    if (!group || !item) return null;
    return {
      name: item.name,
      subtitle: `${group.name} · ${KU_TAB_LABELS[KU_KINDS.indexOf(describe.kind)]}库`,
      detail: describeDetail(describe.kind, item)
    };
  }, [describe, libraries]);

  /*
   * 多选显示（2026-11-05 用户定）：Ctrl 点 tab 把该库并进同一页，只是显示方式——
   * 每个 section 仍用自己库的 kind 渲染，动作层（useStyleActions）照旧读 activeKind，零改动。
   * 单选 = 原样一条；多选 = 命中的库按 KIND_ORDER 上下连排。
   */
  const visibleKinds: KuKind[] = extraKinds.length
    ? [...KU_KINDS].sort((a, b) => KIND_ORDER[a] - KIND_ORDER[b])
        .filter((kind) => kind === activeKind || extraKinds.includes(kind))
    : [activeKind];

  /* 图片取色：拖一张图进来，量化出 10 色，弹层里应用或入库 */
  const [extracted, setExtracted] = useState<string[] | null>(null);
  const runCommand = useRunCommand();
  const toast = useToast();
  const warehouse = warehouses[activeIndex];

  /** 原版 `getImgHex`（`app.v4.js:54682-54694`）：dataUrl → 缩到 350 宽 → 量化 10 色 */
  async function handleDropImage(event: React.DragEvent) {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length !== 1) {
      toast.info(MSG.style.dropOneImage);
      return;
    }

    /* 原版 `$load.show('正在解析图片')`（app.v4.js:54667）同款文案 */
    await runCommand(
      async () => {
        try {
          const dataUrl = await readFileAsDataUrl(files[0] as File);

          /* canvas / Image 在 CEP 的 Chromium 里可用；jsdom 测不了（见 image-color.ts 注释） */
          const colors = await extractImageColors(
            { kind: 'dataUrl', dataUrl },
            { createCanvas, decode: decodeImage }
          );

          /* 一张图提不出颜色 = 解析失败（不是「成功但空」），也要走统一出口 */
          if (!colors.length) {
            return failWithDetail('CORRUPT', MSG.style.parseImageFailed, 'colors:0');
          }

          setExtracted(colors.map((color) => color.hex));
          return ok(undefined);
        } catch (error) {
          /* `extractImageColors` 是纯函数、失败**抛错**（decode 拒绝 / 缺注入）；
             在这里折成 Result，否则整个 handler 会变成一个无人捕获的 rejection ——
             遮罩消失、界面没反应、日志里什么都没有。 */
          return failWithDetail('CORRUPT', MSG.style.parseImageFailed, String(error));
        }
      }
    );
  }

  const {
    expanded,
    menu,
    setMenu,
    editing,
    setEditing,
    newGroup,
    setNewGroup,
    draggedRef,
    toggleGroup,
    handleAddItem,
    startNewGroup,
    handleCreateGroup,
    handleApply,
    buildMenuItems,
    handleRename,
    handleItemMouseDown,
    handleGroupMouseDown,
    handleImportKuReplace,
    handleImportKuAppend,
    handleExportKuAll,
    handleExportKuCurrent,
    runWithFeedback
  } = useStyleActions();

  /** 组头右键菜单（原主体内联，现由两条 section 共用） */
  function openGroupMenu(event: React.MouseEvent, groupIndex: number, groupName: string) {
    event.preventDefault();
    setMenu({
      type: 'group',
      groupIndex,
      groupName,
      x: event.clientX,
      y: event.clientY
    });
  }

  /** 格子右键菜单（原主体内联，现由两条 section 共用） */
  function openItemMenu(
    event: React.MouseEvent,
    groupIndex: number,
    itemIndex: number,
    name: string
  ) {
    event.preventDefault();
    setMenu({
      type: 'item',
      groupIndex,
      itemIndex,
      name,
      x: event.clientX,
      y: event.clientY
    });
  }

  /*
   * 页面状态话全仓唯一出口 = 底部消息行（常驻零位移）：索引 / 库读取失败、空库
   * 收敛到这一行，优先级 error > warn > info（`mergeMessages`）。
   * 多选显示时四条 section 的失败臂全部并进这一行（同一消息行的多来源合并）。
   */
  const sectionFailure = visibleKinds
    .map((kind) => failures[kind])
    .find((item) => item !== null) ?? null;
  const message = mergeMessages([
    failureMessage(indexFailure, () => void load()),
    failureMessage(sectionFailure, () => void load()),
    /* 「读到但是空的」= 有值数组 + 无失败臂；「没读过」不显示空态（只看当前库） */
    groups !== null && !failure && !groups.length && !newGroup
      ? { kind: 'info' as const, text: '这个库是空的' }
      : null
  ]);

  return (
    <section
      className="mm-style"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => void handleDropImage(event)}
    >
      {/* 没有仓库切换：单仓库（只有一个库文件，仓库名对用户没有信息量）。
          保留这一行只为显示读取态。 */}
      <div className="mm-u-row mm-style__toolbar">
        {loadingLibrary ? <span className="mm-style__loading">读取中…</span> : null}
      </div>

      {indexFailure ? null : (
        <>
          {/* 四等分 + 段间 1px 竖线（原版 .switch 结构）；
              Ctrl 点 tab = 把该库并进同一页显示（再点移出），普通点 = 独占 */}
          <div className="mm-tabs">
            {KU_KINDS.map((kind, index) => (
              <div key={kind} className="mm-tabs__cell">
                <button
                  type="button"
                  aria-pressed={kind === activeKind || extraKinds.includes(kind)}
                  className={`mm-tabs__tab${kind === activeKind ? ' mm-tabs__tab--active' : ''}${
                    kind !== activeKind && extraKinds.includes(kind) ? ' mm-style__tab--extra' : ''
                  }`}
                  onClick={(event) => {
                    if (event.ctrlKey || event.metaKey) toggleExtraKind(kind);
                    else setActiveKind(kind);
                  }}
                >
                  {KU_TAB_LABELS[index]}
                </button>
                {index !== KU_KINDS.length - 1 ? <span className="mm-tabs__line" /> : null}
              </div>
            ))}
          </div>

          <div className="mm-style__list">
            {visibleKinds.map((viewKind) => (
              <StyleLibrarySection
                key={viewKind}
                kind={viewKind}
                isCurrent={viewKind === activeKind}
                expanded={expanded}
                onToggleGroup={toggleGroup}
                onGroupMenu={openGroupMenu}
                onGroupMouseDown={handleGroupMouseDown}
                onAddItem={(groupIndex) => void handleAddItem(groupIndex)}
                onApply={(groupIndex, itemIndex, name, event) =>
                  void handleApply(groupIndex, itemIndex, name, event)
                }
                onDescribe={(describeKind, groupIndex, itemIndex, show, el) =>
                  setDescribe(
                    show && el
                      ? { kind: describeKind, groupIndex, itemIndex, el }
                      : null
                  )
                }
                onItemMenu={openItemMenu}
                onItemMouseDown={handleItemMouseDown}
                onRename={(target, next) => void handleRename(target, next)}
                onCancelRename={() => setEditing(null)}
                pageEditing={editing}
                draggedRef={draggedRef}
                newGroupAfterIndex={viewKind === activeKind ? newGroup?.afterIndex ?? null : null}
                onNewGroupCommit={(name, afterIndex) =>
                  void handleCreateGroup(name, afterIndex)
                }
                onNewGroupCancel={() => setNewGroup(null)}
              />
            ))}
          </div>
        </>
      )}

      {/* 消息行常驻在滚动区与底栏之间：行高锁死，出现 / 消失都不挤动上方内容 */}
      <MessageBar message={message} />

      {/* 悬停浮层：portal 到 body，位置走 useFloatingPosition（照 app 的 style-describe） */}
      {describeContent
        ? <Portal>
            <div ref={describeRef} className="mm-popover mm-style__describe">
              <div className="mm-style__describe-name">{describeContent.name}</div>
              <div className="mm-style__describe-meta">{describeContent.subtitle}</div>
              {describeContent.detail ? (
                <div className="mm-style__describe-meta">{describeContent.detail}</div>
              ) : null}
            </div>
          </Portal>
        : null}

      {/* 图片取色弹层（原版 imgColor） */}
      {extracted ? (
        <ImgColorDialog
          colors={extracted}
          onApplyColor={(hex) =>
            void runWithFeedback(() => applyColorByHex(hex), '已应用颜色')
          }
          onApplyGradient={(pair) =>
            void runWithFeedback(() => applyGradientPair(pair), '已应用渐变')
          }
          onSaveSwatch={(hexes) =>
            void runWithFeedback(() => saveExtractedToSwatch(hexes), '已保存到色板')
          }
          onSaveColorGroup={(hexes) => {
            if (!warehouse) return;
            void runWithFeedback(() => saveExtractedColorsToGroup(warehouse, hexes), '已保存到颜色库');
          }}
          onSaveGradientGroup={(hexes) => {
            if (!warehouse) return;
            void runWithFeedback(
              () => saveExtractedGradientsToGroup(warehouse, hexes),
              '已保存到渐变库'
            );
          }}
          onClose={() => setExtracted(null)}
        />
      ) : null}

      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={buildMenuItems(menu)}
          onClose={() => setMenu(null)}
        />
      ) : null}

      <StyleBottomBar
        onAddGroup={startNewGroup}
        onImport={(append) => {
          if (append) handleImportKuAppend();
          else handleImportKuReplace();
        }}
        onExport={(current) => {
          if (current) handleExportKuCurrent();
          else handleExportKuAll();
        }}
      />
    </section>
  );
}
