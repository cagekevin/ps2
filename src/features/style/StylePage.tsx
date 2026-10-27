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
import { Chevron } from '../../components/Chevron';
import { Icon } from '../../components/icons';
import { InlineEdit } from '../../components/InlineEdit';
import { SelectBox } from '../../components/SelectBox';
import { useFloatingPosition } from '../../hooks/useFloatingPosition';
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
import { useLoading } from '../../components/Loading';
import { useToast } from '../../components/Toast';
import { useStyleLibraryStore } from '../../store/style-library';
import { BottomBar } from './components/BottomBar';
import { ImgColorDialog } from './components/ImgColorDialog';
import { ItemView } from './components/ItemView';
import { NewGroupRow } from './components/NewGroupRow';
import { StateHint } from '../../components/StateHint';
import { ADD_TITLE, useStyleActions } from './useStyleActions';
import './StylePage.css';

/** 悬停浮层的目标：定位锚点就是那个项元素 */
interface DescribeTarget {
  kind: KuKind;
  groupIndex: number;
  itemIndex: number;
  el: HTMLElement;
}

export default function StylePage() {
  const load = useStyleLibraryStore((state) => state.load);
  const loadingLibrary = useStyleLibraryStore((state) => state.loading);
  const indexResult = useStyleLibraryStore((state) => state.indexResult);
  const warehouses = useStyleLibraryStore((state) => state.warehouses);
  const activeIndex = useStyleLibraryStore((state) => state.activeIndex);
  const activeKind = useStyleLibraryStore((state) => state.activeKind);
  const setActiveKind = useStyleLibraryStore((state) => state.setActiveKind);
  const selectWarehouse = useStyleLibraryStore((state) => state.selectWarehouse);
  const libraries = useStyleLibraryStore((state) => state.libraries);
  const groups = useStyleLibraryStore((state) => state.libraries[state.activeKind]);
  const result = useStyleLibraryStore((state) => state.results[state.activeKind]);

  /* 悬停浮层：enter 时记下项与锚点元素，leave 清空 */
  const [describe, setDescribe] = useState<DescribeTarget | null>(null);
  const describeAnchor = useMemo(() => describe?.el ?? null, [describe]);
  const { floatingRef: describeRef, update: updateDescribe } = useFloatingPosition({
    placement: 'bottom-start',
    offset: 6,
    padding: 8
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

  /* 图片取色：拖一张图进来，量化出 10 色，弹层里应用或入库 */
  const [extracted, setExtracted] = useState<string[] | null>(null);
  const loading = useLoading();
  const toast = useToast();
  const warehouse = warehouses[activeIndex];

  /** 原版 `getImgHex`（`app.v4.js:54682-54694`）：dataUrl → 缩到 350 宽 → 量化 10 色 */
  async function handleDropImage(event: React.DragEvent) {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length !== 1) {
      toast.info('请拖入1张图片');
      return;
    }

    /* 原版 `$load.show('正在解析图片')`（app.v4.js:54667）同款文案 */
    await loading.run(
      async () => {
        const dataUrl = await readFileAsDataUrl(files[0] as File);

        /* canvas / Image 在 CEP 的 Chromium 里可用；jsdom 测不了（见 image-color.ts 注释） */
        const colors = await extractImageColors(
          { kind: 'dataUrl', dataUrl },
          { createCanvas, decode: decodeImage }
        );

        if (!colors.length) {
          toast.error('解析图片失败');
          return;
        }
        setExtracted(colors.map((color) => color.hex));
      },
      '正在解析图片'
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

  const warehouseOptions = warehouses.map((warehouse, index) => ({
    value: String(index),
    label: warehouse.name
  }));

  return (
    <section
      className="mm-style"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => void handleDropImage(event)}
    >
      <div className="mm-style__toolbar">
        {warehouseOptions.length ? (
          <SelectBox
            className="mm-style__warehouse"
            value={String(activeIndex)}
            options={warehouseOptions}
            icon={<Icon name="iconmorencangku" size={16} />}
            arrowIcon="iconzhankaizhedie"
            arrowSize={10}
            onChange={(next) => {
              void selectWarehouse(Number(next));
            }}
          />
        ) : (
          <StateHint empty="未找到仓库" />
        )}
        {loadingLibrary ? <span className="mm-style__loading">读取中…</span> : null}
      </div>

      {indexResult && indexResult.status !== 'ok' ? (
        <StateHint result={indexResult} onRetry={() => void load()} />
      ) : (
        <>
          {/* 四等分 + 段间 1px 竖线（原版 .switch 结构） */}
          <div className="mm-style__tabs">
            {KU_KINDS.map((kind, index) => (
              <div key={kind} className="mm-style__tab-cell">
                <button
                  type="button"
                  className={`mm-style__tab${kind === activeKind ? ' mm-style__tab--active' : ''}`}
                  onClick={() => setActiveKind(kind)}
                >
                  {KU_TAB_LABELS[index]}
                </button>
                {index !== KU_KINDS.length - 1 ? <span className="mm-style__tab-line" /> : null}
              </div>
            ))}
          </div>

          {result && result.status !== 'ok' ? (
            <StateHint result={result} onRetry={() => void load()} />
          ) : null}

          <div className="mm-style__list">
            {(groups ?? []).map((group: KuGroup, index: number) => {
              const isOpen = expanded.has(index);
              return (
                <div
                  key={`${group.name}-${index}`}
                  className={`mm-style__group${
                    activeKind === 'gradient' || activeKind === 'style' ? ' mm-style__group--wide' : ''
                  }`}
                >
                  {editing?.type === 'group' && editing.groupIndex === index ? (
                    <div className="mm-style__group-head">
                      <Chevron open={isOpen} size={9} />
                      <InlineEdit
                        value={group.name}
                        onCommit={(next) => void handleRename({ type: 'group', groupIndex: index }, next)}
                        onCancel={() => setEditing(null)}
                      />
                      <span className="mm-style__count">{group.items.length}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="mm-style__group-head"
                      data-group-head
                      data-group-index={index}
                      onClick={() => {
                        /* 刚拖完的那次 click 不算折叠 */
                        if (draggedRef.current) {
                          draggedRef.current = false;
                          return;
                        }
                        toggleGroup(index);
                      }}
                      onMouseDown={(event) => handleGroupMouseDown(event, index)}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setMenu({
                          type: 'group',
                          groupIndex: index,
                          groupName: group.name,
                          x: event.clientX,
                          y: event.clientY
                        });
                      }}
                    >
                      <Chevron open={isOpen} size={9} />
                      <span className="mm-style__group-name">{group.name}</span>
                      <span className="mm-style__count">{group.items.length}</span>
                    </button>
                  )}

                  {isOpen ? (
                    <div className={`mm-style__items mm-style__items--${activeKind}`}>
                      {group.items.map((item, itemIndex) => (
                        <ItemView
                          key={`${item.name}-${itemIndex}`}
                          kind={activeKind}
                          item={item}
                          groupIndex={index}
                          itemIndex={itemIndex}
                          editing={
                            editing?.type === 'item' &&
                            editing.groupIndex === index &&
                            editing.itemIndex === itemIndex
                          }
                          onApply={(group_, item_, name, event) =>
                            void handleApply(group_, item_, name, event)
                          }
                          onDescribe={(show, el) =>
                            setDescribe(
                              show && el
                                ? { kind: activeKind, groupIndex: index, itemIndex, el }
                                : null
                            )
                          }
                          onContextMenu={(event, group_, item_, name) => {
                            event.preventDefault();
                            setMenu({
                              type: 'item',
                              groupIndex: group_,
                              itemIndex: item_,
                              name,
                              x: event.clientX,
                              y: event.clientY
                            });
                          }}
                          onMouseDown={handleItemMouseDown}
                          onRename={(next) =>
                            void handleRename({ type: 'item', groupIndex: index, itemIndex }, next)
                          }
                          onCancelRename={() => setEditing(null)}
                        />
                      ))}

                      {/* 组末尾的「+」：四库各一个（原版 .add-svg / .add / .img-add） */}
                      <button
                        type="button"
                        className={`mm-style__add mm-style__add--${activeKind}`}
                        title={ADD_TITLE[activeKind]}
                        onClick={() => void handleAddItem(index)}
                      >
                        <Icon name="iconchuangjian" size={12} />
                      </button>
                    </div>
                  ) : null}

                  {/* 新建分组占位：插在这一组之后 */}
                  {newGroup?.afterIndex === index ? (
                    <NewGroupRow
                      onCommit={(name) => void handleCreateGroup(name, index)}
                      onCancel={() => setNewGroup(null)}
                    />
                  ) : null}
                </div>
              );
            })}

            {!groups?.length && !newGroup && result?.status === 'ok' ? (
              <StateHint empty="这个库是空的" />
            ) : null}

            {/* 空库时没有「某组之后」，直接渲染在列表里 */}
            {!groups?.length && newGroup ? (
              <NewGroupRow
                onCommit={(name) => void handleCreateGroup(name, -1)}
                onCancel={() => setNewGroup(null)}
              />
            ) : null}
          </div>
        </>
      )}

      {/* 悬停浮层：portal 到 body，位置走 useFloatingPosition（照 app 的 style-describe） */}
      {describeContent
        ? <Portal>
            <div ref={describeRef} className="mm-style__describe">
              <p className="mm-style__describe-name">{describeContent.name}</p>
              <p className="mm-style__describe-meta">{describeContent.subtitle}</p>
              {describeContent.detail ? (
                <p className="mm-style__describe-meta">{describeContent.detail}</p>
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

      <BottomBar
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
