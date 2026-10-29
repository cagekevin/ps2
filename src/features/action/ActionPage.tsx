/**
 * 动作页（`/action`）：仓库条 → 分组列表 → 底栏。
 *
 * 结构照 `05` §5。M2 做骨架（切仓库 / 折叠 / 执行 / 新建分组 / 列数），M3 补：
 * 分组与动作的右键菜单、仓库的增删改、导入导出。
 * **M3 还没做**：拖拽三处、添加动作弹窗、首次引导（`05` §6 余项）。
 *
 * 页面不写底层：命令走 `commands/action`，状态走 `store/action`，选路径走 `core/dialog`（授权例外），
 * 分组行用公共件 `GroupHead`（不新建 `ActionGroupRow`）。
 */

import { BottomBar, BottomBarButton } from '../../components/BottomBar';
import { IconButton } from '../../components/IconButton';
import { ContextMenu } from '../../components/ContextMenu';
import { GroupHead } from '../../components/GroupHead';
import { InputDialog } from '../../components/InputDialog';
import { PageHeader } from '../../components/PageHeader';
import { StateHint } from '../../components/StateHint';
import { Button } from '../../components/ui';
import { MSG } from '../../types/messages';
import { ACTION_ICONS } from './action-constants';
import { AddActionDialog } from './components/AddActionDialog';
import { WarehouseBar } from './components/WarehouseBar';
import { useActionPage } from './useActionPage';
import './ActionPage.css';

/** 三种输入弹窗的标题（官方逐字） */
const DIALOG_TITLE = {
  addGroup: MSG.action.needGroupName,
  renameGroup: MSG.action.needNewGroupName,
  alias: MSG.action.aliasTitle
} as const;

export default function ActionPage() {
  const page = useActionPage();

  return (
    <div className="mm-action">
      <PageHeader title={MSG.action.pageTitle} />

      <div className="mm-action__body">
        {page.reasons.index ? (
          <StateHint result={page.reasons.index} onRetry={page.reload} />
        ) : null}
        {page.reasons.library ? (
          <StateHint result={page.reasons.library} onRetry={page.reload} />
        ) : null}
        {page.dropped.length ? (
          <div
            className="mm-action__warning"
            /* 数量 + 首条现场：只给数量等于替数据层说「已处理」 */
            title={page.dropped
              .slice(0, 3)
              .map((item) => `${item.path} · ${item.reason}${item.detail ? ` · ${item.detail}` : ''}`)
              .join('\n')}
          >
            {page.dropped.length} {MSG.droppedSummary}
          </div>
        ) : null}

        <WarehouseBar
          warehouses={page.warehouses}
          currentIndex={page.currentIndex}
          onChange={page.switchWarehouse}
          onAdd={page.addWarehouse}
          onRemove={page.removeWarehouse}
          onRename={page.renameWarehouse}
        />

        <div className="mm-action__list" ref={page.listRef}>
          {page.groups.map((group, groupIndex) => (
            <div key={`${group.groupName}-${groupIndex}`} className="mm-action__group">
              <GroupHead
                title={group.groupName}
                open={group.show}
                count={group.list.length}
                onToggle={() => page.toggleGroup(groupIndex, !group.show)}
                onContextMenu={(event) => page.openGroupMenu(event, groupIndex, group.groupName)}
                onMouseDown={(event) => page.handleGroupMouseDown(event, groupIndex)}
                /* 拖拽落点靠这两个属性选节点（`useActionPage` 的 `[data-group-head]`），别改名 */
                data={{ 'data-group-head': '', 'data-group-index': groupIndex }}
                trailing={
                  <IconButton
                    name={ACTION_ICONS.addGroup}
                    title={MSG.action.addAction}
                    size={14}
                    onClick={() => void page.openAddAction(groupIndex)}
                  />
                }
              />

              {group.show ? (
                group.list.length ? (
                  <div
                    className="mm-action__items"
                    /* 列数只决定 grid-template-columns，不搞三档类（`05` §4.8 第 17 条） */
                    style={{ gridTemplateColumns: `repeat(${page.columns}, 1fr)` }}
                  >
                    {group.list.map((item, itemIndex) => (
                      <Button
                        key={`${item.name}-${itemIndex}`}
                        className="mm-action__item"
                        title={item.alias ?? item.name}
                        /* 拖拽落点靠这三个属性选节点（`[data-action-item]`），别改名 */
                        data-action-item=""
                        data-group-index={groupIndex}
                        data-item-index={itemIndex}
                        onMouseDown={(event) =>
                          page.handleItemMouseDown(event, groupIndex, itemIndex)
                        }
                        onClick={(event) => {
                          /* 拖完那次 click 吞掉，否则「拖一下就执行了动作」 */
                          if (page.consumeDragClick()) return;
                          if (event.ctrlKey) {
                            page.notifyFreePanel();
                            return;
                          }
                          page.callAction(item);
                        }}
                        onContextMenu={(event) =>
                          page.openItemMenu(event, groupIndex, itemIndex, item)
                        }
                      >
                        {item.alias ?? item.name}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <StateHint empty={MSG.action.emptyGrid} />
                )
              ) : null}
            </div>
          ))}

          {page.groups.length === 0 ? <StateHint empty={MSG.action.emptyGrid} /> : null}
        </div>
      </div>

      <BottomBar>
        <BottomBarButton
          title={MSG.action.addGroup}
          name={ACTION_ICONS.addGroup}
          size={14}
          onClick={page.openAddGroup}
        />
        <BottomBarButton
          title={MSG.action.displayMode}
          name={ACTION_ICONS.columns}
          size={14}
          onClick={page.openColumnMenu}
        />
        <BottomBarButton
          title={MSG.action.importPreset}
          name={ACTION_ICONS.importPreset}
          size={14}
          onClick={page.openImportMenu}
        />
        <BottomBarButton
          title={MSG.action.exportPreset}
          name={ACTION_ICONS.exportPreset}
          size={14}
          onClick={page.openExportMenu}
        />
      </BottomBar>

      {page.menu ? (
        page.menu.kind === 'point' ? (
          <ContextMenu x={page.menu.x} y={page.menu.y} items={page.menu.items} onClose={page.closeMenu} />
        ) : (
          <ContextMenu anchor={page.menu.anchor} items={page.menu.items} onClose={page.closeMenu} />
        )
      ) : null}

      {page.addAction ? (
        <AddActionDialog
          actions={page.addAction.actions}
          onConfirm={page.confirmAddActions}
          onClose={page.closeAddAction}
        />
      ) : null}

      {page.dialog ? (
        <InputDialog
          title={DIALOG_TITLE[page.dialog.kind]}
          defaultValue={page.dialog.kind === 'addGroup' ? MSG.action.defaultGroupName : page.dialog.value}
          onSubmit={page.submitDialog}
          onClose={page.closeDialog}
        />
      ) : null}
    </div>
  );
}
