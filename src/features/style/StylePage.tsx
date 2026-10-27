/**
 * 【范本】样式面板。
 *
 * 仓库条 → 四个 tab → 分组列表（默认只展开第一组）→ 底栏。
 *
 * 本文件只做**骨架和 JSX**：动作（应用 / 增删改 / 拖拽 / 右键菜单）全在
 * `useStyleActions`，单项渲染在 `components/ItemView`。
 * 拆分依据 `GOVERNANCE.md` §0.5 触发条件第 6 条：组件超过 300 行必须拆。
 */
import { ContextMenu } from '../../components/ContextMenu';
import { Chevron } from '../../components/Chevron';
import { Icon } from '../../components/icons';
import { InlineEdit } from '../../components/InlineEdit';
import { SelectBox } from '../../components/SelectBox';
import { KU_KINDS, KU_TAB_LABELS, type KuGroup } from '../../domain/style-library';
import { useStyleLibraryStore } from '../../store/style-library';
import { BottomBar } from './components/BottomBar';
import { ItemView } from './components/ItemView';
import { NewGroupRow } from './components/NewGroupRow';
import { StateHint } from './components/StateHint';
import { ADD_TITLE, useStyleActions } from './useStyleActions';
import './StylePage.css';

export default function StylePage() {
  const load = useStyleLibraryStore((state) => state.load);
  const loadingLibrary = useStyleLibraryStore((state) => state.loading);
  const indexOutcome = useStyleLibraryStore((state) => state.indexOutcome);
  const warehouses = useStyleLibraryStore((state) => state.warehouses);
  const activeIndex = useStyleLibraryStore((state) => state.activeIndex);
  const activeKind = useStyleLibraryStore((state) => state.activeKind);
  const setActiveKind = useStyleLibraryStore((state) => state.setActiveKind);
  const selectWarehouse = useStyleLibraryStore((state) => state.selectWarehouse);
  const groups = useStyleLibraryStore((state) => state.libraries[state.activeKind]);
  const outcome = useStyleLibraryStore((state) => state.outcomes[state.activeKind]);

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
    handleGroupMouseDown
  } = useStyleActions();

  const warehouseOptions = warehouses.map((warehouse, index) => ({
    value: String(index),
    label: warehouse.name
  }));

  return (
    <section className="mm-style">
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
          <span className="mm-style__hint">未找到仓库</span>
        )}
        {loadingLibrary ? <span className="mm-style__loading">读取中…</span> : null}
      </div>

      {indexOutcome && indexOutcome.status !== 'ok' ? (
        <StateHint outcome={indexOutcome} onRetry={() => void load()} />
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

          {outcome && outcome.status !== 'ok' ? (
            <StateHint outcome={outcome} onRetry={() => void load()} />
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

            {!groups?.length && !newGroup && outcome?.status === 'ok' ? (
              <p className="mm-style__hint">这个库是空的</p>
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

      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={buildMenuItems(menu)}
          onClose={() => setMenu(null)}
        />
      ) : null}

      <BottomBar onAddGroup={startNewGroup} />
    </section>
  );
}
