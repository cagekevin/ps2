/**
 * 重命名页（`/rename`）
 *
 * 每个块都用**兄弟页现成的那一个件**，本页不新造皮肤：
 *   模式条      `.mm-tabs`（与样式页四库导航同一份）
 *   表达式位    `TextField` + `rightSlot={<IconButton className="mm-icon-btn--inline">}`（与字体管理搜索同一套）
 *   预设项      `Button`（与动作页动作项同一份 26 高按钮）+ 「加预设」用同一个 `Button`
 *   分组行      `GroupHead`（与动作页同一份）
 *   色块        `RenameSwatch` → `.mm-swatch`（与吸色弹窗同一份）
 *   分隔线      `.mm-divider`（全仓唯一画线的地方）
 *   底栏        `BottomBar`（与动作页同一份）
 *   间距        `.mm-u-col` 的 8，不写 padding / margin
 *
 * 结构顺序照 Vue 参考实现 `ps/src/pages/rename/index.vue`：模式条 → 输入 → 分组 → 分隔线 → 颜色 → 底栏。
 */

import { BottomBar, BottomBarButton } from '../../components/BottomBar';
import { ContextMenu } from '../../components/ContextMenu';
import { GroupHead } from '../../components/GroupHead';
import { IconButton } from '../../components/IconButton';
import { InputDialog } from '../../components/InputDialog';
import { StateHint } from '../../components/StateHint';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/ui';
import { MSG } from '../../types/messages';
import { RenameSwatch } from './components/RenameSwatch';
import { MODE_OPTIONS, RENAME_ICONS } from './rename-constants';
import { useRenamePage } from './useRenamePage';
import './RenamePage.css';

/** 三种输入弹窗的标题（官方逐字） */
const DIALOG_TITLE = {
  addGroup: MSG.rename.needGroupName,
  renameGroup: MSG.rename.needNewGroupName,
  addPreset: MSG.rename.needPresetText,
  changePreset: MSG.rename.needPresetText
} as const;

export default function RenamePage() {
  const page = useRenamePage();

  return (
    <div className="mm-rename">
      <div className="mm-rename__body">
        {/* 1. 模式条：与样式页四库导航同一份 `.mm-tabs`；右侧过滤用 `IconButton` */}
        <div className="mm-u-row">
          <div className="mm-tabs" role="tablist" aria-label={'重命名图层'}>
            {MODE_OPTIONS.map((option) => (
              <div key={option.value} className="mm-tabs__cell">
                <button
                  type="button"
                  role="tab"
                  aria-selected={option.value === page.mode}
                  className={
                    option.value === page.mode
                      ? 'mm-tabs__tab mm-tabs__tab--active'
                      : 'mm-tabs__tab'
                  }
                  onClick={() => page.pickMode(option.value)}
                >
                  {option.label}
                </button>
              </div>
            ))}
          </div>
          {/* 漏斗**不带 `active`**：原版它只有 hover（`.cursor.contextHover`），
              开关状态在下拉里那一项勾选上（`checked`）。挂 `active` 会变成「一直亮着」 */}
          <IconButton
            className="mm-icon-btn--inline"
            name={RENAME_ICONS.filter}
            title={'过滤子图层'}
            onClick={page.openFilterMenu}
          />
        </div>

        {/* 2. 表达式位：`TextField` 占满一行，✓ 走它的 `rightSlot`（同一个 IconButton） */}
        {page.mode === 'replace' ? (
          <div className="mm-u-row">
            <TextField
              title={'替换文字'}
              placeholder={'替换文字'}
              value={page.replaceFrom}
              onChange={page.setReplaceFrom}
              onSubmit={page.apply}
            />
            <TextField
              title={'新文字'}
              placeholder={'新文字'}
              value={page.replaceTo}
              onChange={page.setReplaceTo}
              onSubmit={page.apply}
              rightSlot={
                <IconButton
                  className="mm-icon-btn--inline"
                  name={RENAME_ICONS.apply}
                  title={'重命名图层'}
                  onClick={page.apply}
                />
              }
            />
          </div>
        ) : (
          /* 点输入区弹出标记菜单（原版 showTips）；`TextField` 没有 onClick，事件挂在行上 */
          <div className="mm-u-row" onClick={page.openExpressionMenu}>
            <TextField
              title={'重命名图层'}
              placeholder={'回车确认修改'}
              value={page.draft}
              onChange={page.setDraft}
              onSubmit={page.apply}
              rightSlot={
                <IconButton
                  className="mm-icon-btn--inline"
                  name={RENAME_ICONS.apply}
                  title={'重命名图层'}
                  onClick={page.apply}
                />
              }
            />
          </div>
        )}

        {page.failure ? (
          /* 失败提示走唯一入口 `StateHint`：文案取生产者的 `reason`、`detail` 挂 title、
             重试只在 `IO_ERROR` 出现（不是任何错都给重试 —— 把 bug 伪装成可重试更糟）。
             原先这里是手写的 `<span>` + `<Button>重试</Button>`，与其它 19 处形态不一致。 */
          <StateHint result={page.failure} onRetry={() => void page.reload()} />
        ) : page.dropped.length ? (
          <div className="mm-notice mm-notice--warn" title={page.dropped
            .slice(0, 3)
            .map((item) => `${item.path} · ${item.reason}${item.detail ? ` · ${item.detail}` : ''}`)
            .join('\n')}>
            {`${page.dropped.length} ${MSG.droppedSummary}`}
          </div>
        ) : null}

        {/* 3. 分组列表：组头 + 预设项（同动作页：组头右侧加号 + 26 高按钮） */}
        <div className="mm-rename__list" ref={page.listRef}>
          {page.preset.length === 0 ? (
            <StateHint empty={'还没有重命名预设'} />
          ) : (
            page.preset.map((group, groupIndex) => (
              <div key={`${group.name}-${groupIndex}`} className="mm-rename__group">
                <GroupHead
                  title={group.name}
                  open={group.show}
                  onToggle={() => page.toggleGroup(groupIndex)}
                  onContextMenu={(event) => page.openGroupMenu(event, groupIndex, group.name)}
                  onMouseDown={(event) => page.handleGroupMouseDown(event, groupIndex)}
                  data={{ 'data-group-head': '', 'data-group-index': groupIndex }}
                  trailing={
                    groupIndex === 0 ? undefined : (
                      <IconButton
                        className="mm-icon-btn--inline"
                        name={RENAME_ICONS.addPreset}
                        title={'添加预设'}
                        onClick={() => page.openAddPreset(groupIndex)}
                      />
                    )
                  }
                />

                {group.show ? (
                  group.list.length ? (
                    <div className="mm-u-tiles">
                      {group.list.map((text, itemIndex) => (
                        <Button
                          key={`${text}-${itemIndex}`}
                          title={text}
                          data-preset-item=""
                          data-group-index={groupIndex}
                          data-item-index={itemIndex}
                          onMouseDown={(event) =>
                            page.handleItemMouseDown(event, groupIndex, itemIndex)
                          }
                          onClick={() => {
                            if (page.consumeDragClick()) return;
                            page.applyPreset(text);
                          }}
                          onContextMenu={(event) =>
                            page.openItemMenu(event, groupIndex, itemIndex, text)
                          }
                        >
                          {text}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <StateHint empty={'该组还没有预设'} />
                  )
                ) : null}
              </div>
            ))
          )}
        </div>

        <div className="mm-divider" />

        {/* 5. 图层颜色标记：组头 + `.mm-swatch` 七色 + 清除 */}
        <GroupHead
          title={'图层颜色标记'}
          open={page.colorSignOpen}
          onToggle={page.toggleColorSign}
        />
        {page.colorSignOpen ? (
          <div className="mm-u-tiles">
            {page.layerColors.map((color, index) => (
              <RenameSwatch
                key={color}
                color={color}
                title={'设置图层颜色'}
                onPick={() => page.applyLayerColor(index + 1)}
              />
            ))}
            <RenameSwatch clear title={'清除图层颜色'} onPick={() => page.applyLayerColor(0)} />
          </div>
        ) : null}
      </div>

      <BottomBar>
        <BottomBarButton
          title={'添加分组'}
          name={RENAME_ICONS.addGroup}
          onClick={page.openAddGroup}
        />
        <div className="mm-divider mm-divider--vertical" />
        <BottomBarButton
          title={'导入预设'}
          name={RENAME_ICONS.importPreset}
          onClick={() => void page.doImport()}
        />
        <BottomBarButton
          title={'导出预设'}
          name={RENAME_ICONS.exportPreset}
          onClick={() => void page.doExport()}
        />
      </BottomBar>

      {page.menu ? (
        page.menu.kind === 'point' ? (
          <ContextMenu x={page.menu.x} y={page.menu.y} items={page.menu.items} onClose={page.closeMenu} />
        ) : (
          <ContextMenu anchor={page.menu.anchor} items={page.menu.items} onClose={page.closeMenu} />
        )
      ) : null}

      {page.dialog ? (
        <InputDialog
          title={DIALOG_TITLE[page.dialog.kind]}
          defaultValue={
            page.dialog.kind === 'addGroup' || page.dialog.kind === 'addPreset'
              ? ''
              : page.dialog.value
          }
          onSubmit={page.submitDialog}
          onClose={page.closeDialog}
        />
      ) : null}
    </div>
  );
}
