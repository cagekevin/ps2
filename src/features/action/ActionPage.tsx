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

import type { CSSProperties } from 'react';
import { BottomBar, BottomBarButton } from '../../components/BottomBar';
import { IconButton } from '../../components/IconButton';
import { ContextMenu } from '../../components/ContextMenu';
import { GroupHead } from '../../components/GroupHead';
import { InputDialog } from '../../components/InputDialog';
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
  alias: '请输入别名'
} as const;

export default function ActionPage() {
  const page = useActionPage();

  return (
    <div className="mm-action">
      {/* 没有页头：导航上已写着「动作管理」，标题行白占 40 高（与字体管理、常用功能一致） */}
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
                    className="mm-icon-btn--inline"
                    name={ACTION_ICONS.addGroup}
                    title={'添加动作'}
                    onClick={() => void page.openAddAction(groupIndex)}
                  />
                }
              />

              {group.show ? (
                group.list.length ? (
                  <div
                    className="mm-action__items"
                    /* 列数是运行时值：只注入 CSS 变量，`grid-template-columns` 写在 ActionPage.css */
                    style={{ '--mm-action-columns': String(page.columns) } as CSSProperties}
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
                  <StateHint empty={'该动作组空空如也'} />
                )
              ) : null}
            </div>
          ))}

          {page.groups.length === 0 ? <StateHint empty={'该动作组空空如也'} /> : null}
        </div>
      </div>

      <BottomBar>
        <BottomBarButton
          title={'添加分组'}
          name={ACTION_ICONS.addGroup}
          onClick={page.openAddGroup}
        />
        <BottomBarButton
          title={'显示方式'}
          name={ACTION_ICONS.columns}
          onClick={page.openColumnMenu}
        />
        <BottomBarButton
          title={'导入预设'}
          name={ACTION_ICONS.importPreset}
          onClick={page.openImportMenu}
        />
        <BottomBarButton
          title={'导出预设'}
          name={ACTION_ICONS.exportPreset}
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
          defaultValue={page.dialog.kind === 'addGroup' ? '未命名分组' : page.dialog.value}
          onSubmit={page.submitDialog}
          onClose={page.closeDialog}
        />
      ) : null}
    </div>
  );
}
