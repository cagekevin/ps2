/**
 * 模板库页（`/template`）
 *
 * 结构（对原版逐项对齐，见 `docs/plan/15` §2）：
 *   路径行 → 文件夹与条目（同一个网格）→ 底栏「共 N 个内容」+ 右下角常驻存入口
 *
 * 件全部是现成的：`StateHint` / `Spin` / `Button` / `IconButton` / `Portal` /
 * `ContextMenu` / `InputDialog` / `useConfirm`。本页只写一个私有网格（等高列）。
 *
 * **拖拽是模板库私有的**：`useTemplateDrag` 只在 `useTemplatePage` 里用，
 * 不对外、不进公共件清单、不许别的页面抄（那份文件头写明了）。
 */
import { Fragment } from 'react';
import { ContextMenu, type MenuItem } from '../../components/ContextMenu';
import { useConfirm } from '../../components/Confirm/useConfirm';
import { Icon } from '../../components/icons';
import { InputDialog } from '../../components/InputDialog';
import { Spin } from '../../components/Spin';
import { StateHint } from '../../components/StateHint';
import { Button } from '../../components/ui';
import { templateThumbUrl } from '../../repo/template-repo';
import { MSG } from '../../types/messages';
import { FolderCard } from './components/FolderCard';
import { FolderPicker } from './components/FolderPicker';
import { ImagePreview } from './components/ImagePreview';
import { TemplateCard } from './components/TemplateCard';
import { useTemplatePage } from './useTemplatePage';
import './TemplatePage.css';

export default function TemplatePage() {
  const page = useTemplatePage();
  const confirm = useConfirm();

  /* 大图显示的是当前层里的那条（切换文件夹时会先关掉大图） */
  const previewItem = page.preview === null ? null : page.items.find((item) => item.id === page.preview) ?? null;

  const isEmpty = page.folders.length === 0 && page.items.length === 0;
  const emptyText = page.crumb.length === 0 ? MSG.template.emptyLibrary : MSG.template.emptyFolder;

  /* 条目右键：6 项，两级分组；「移动到…」直接平铺候选文件夹（库小，比再弹一层省一次点击） */
  const item = page.menu?.kind === 'item' ? page.items.find((entry) => entry.id === page.menu?.id) : undefined;
  const itemMenu: MenuItem[] =
    item === undefined
      ? []
      : [
          { label: '重命名', onSelect: () => page.askRenameItem(item.id, item.name) },
          { label: '编辑源文件', onSelect: () => void page.editSource(item.id) },
          { label: '更新预览图', onSelect: () => void page.refreshThumb(item.id) },
          { label: '', separator: true },
          /* 只留一项：候选文件夹收进弹层 —— 平铺在菜单里会随文件夹数变长，10 个就溢出 */
          { label: '移动到…', onSelect: () => page.askMove(item.id) },
          { label: '', separator: true },
          { label: '打开库目录', onSelect: () => void page.openLibraryDir() },
          {
            label: '删除',
            danger: true,
            onSelect: () => {
              void (async () => {
                const agreed = await confirm({
                  title: '删除模板',
                  message: '会同时删掉库里的 PSD 与缩略图，不能撤销。',
                  confirmText: '删除'
                });
                if (agreed) await page.removeItem(item.id);
              })();
            }
          }
        ];

  /* 「移动到…」弹层要显示的那条（目标文件夹列表在弹层里，不在这里铺开） */
  const movingItem =
    page.moveTarget === null ? null : page.items.find((entry) => entry.id === page.moveTarget?.id) ?? null;

  /*
   * 文件夹右键：**2 项**（重命名 / 删除）。没有「新建子文件夹」——
   * 建文件夹统一走「空白处右键」，建在当前这一层（2026-10-31 用户裁定）。
   * 非空文件夹不给删（没有回收站，这是唯一的安全阀）。
   */
  const folder = page.menu?.kind === 'folder' ? page.folders.find((entry) => entry.id === page.menu?.id) : undefined;
  const folderMenu: MenuItem[] =
    folder === undefined
      ? []
      : [
          { label: '重命名', onSelect: () => page.askRenameFolder(folder) },
          {
            label: '删除',
            danger: true,
            disabled: page.countInFolder(folder.id) > 0 || page.folders.some((sub) => sub.parentId === folder.id),
            /* 与删条目同一条规矩：不可撤销的动作一律二次确认（原先这里点一下就删了） */
            onSelect: () => {
              void (async () => {
                const agreed = await confirm({
                  title: `删除文件夹「${folder.name}」？`,
                  message: '只删空文件夹，删了不能撤销。',
                  confirmText: '删除'
                });
                if (agreed) await page.removeFolder(folder.id);
              })();
            }
          }
        ];

  /* 空白处右键：只有一项 —— 在当前层新建文件夹 */
  const emptyMenu: MenuItem[] = [{ label: '新建文件夹', onSelect: () => page.askCreateFolder() }];

  return (
    <div className="mm-u-col mm-template">
      {/* 路径行：贴左挨着排（`.mm-u-tiles`），末级纯文本。
          拖到路径行 = 移回根目录（路径行末端是"这一层"，但落到这里当成根更符合直觉）。
          新建文件夹不放这里：在内容区**空白处右键**新建（见下面的 body） */}

      <div className="mm-u-tiles mm-template__crumb" {...page.drag.dropProps(null)}>
        <Icon name="iconwenjianjiaguanli" className="mm-template__crumb-icon" />
        <Button variant="ghost" onClick={() => page.openFolder(null)}>
          模板库
        </Button>
        {page.crumb.map((step, index) => (
          <Fragment key={step.id}>
            <span className="mm-template__crumb-sep">/</span>
            {index === page.crumb.length - 1 ? (
              <span className="mm-template__crumb-current">{step.name}</span>
            ) : (
              <Button variant="ghost" onClick={() => page.openFolder(step.id)}>
                {step.name}
              </Button>
            )}
          </Fragment>
        ))}
      </div>

      {/*
        * 内容区空白处右键 = 在当前这一层新建文件夹。
        * 卡片自己也在 `onContextMenu` 里 preventDefault 并弹菜单，事件会冒泡上来，
        * 所以这里先判「点的是不是卡片」——是卡片就不管（否则两个菜单会互相顶掉）。
        */}
      <div
        className="mm-template__body"
        ref={page.bodyRef}
        onContextMenu={(event) => {
          if (event.target instanceof HTMLElement && event.target.closest('.mm-template__card')) return;
          event.preventDefault();
          page.openEmptyMenu(event.clientX, event.clientY);
        }}
      >
        {page.loading ? <Spin tip="读取中" /> : null}

        {!page.loading && page.failure !== null ? (
          <StateHint result={page.failure} onRetry={page.reload} />
        ) : null}

        {!page.loading && page.failure === null && isEmpty ? <StateHint empty={emptyText} /> : null}

        {/*
          * 文件夹与条目在**同一个网格**里排（拆两个容器会变成两排各自算留白）。
          * 顺序：**条目在前、文件夹在后** —— 条目按 `createdAt` 倒序，所以刚存进来的那条
          * 永远在第一格，不用翻到最后去找；文件夹是固定设施，放后面当"出口"。
          */}
        {!page.loading && page.failure === null && !isEmpty ? (
          <div className="mm-template__grid">
            {page.items.map((entry) => (
              <TemplateCard
                key={entry.id}
                item={entry}
                version={page.imageVersion}
                highlighted={entry.id === page.highlightId}
                dragging={entry.id === page.drag.draggingId}
                onApply={() => void page.apply(entry.id)}
                onPreview={() => page.openPreview(entry.id)}
                onMenu={(x, y) => page.openMenu('item', entry.id, x, y)}
                dragProps={page.drag.itemProps(entry.id)}
              />
            ))}
            {page.folders.map((entry) => (
              <FolderCard
                key={entry.id}
                folder={entry}
                count={page.countInFolder(entry.id)}
                onEnter={() => page.openFolder(entry.id)}
                onMenu={(x, y) => page.openMenu('folder', entry.id, x, y)}
                dropProps={page.drag.dropProps(entry.id)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* 右下角常驻存入口（照原版：一个方块按钮，点一下就把当前图层存进当前文件夹） */}
      <button
        type="button"
        className="mm-template__fab"
        title={page.canSave ? '把当前图层存进模板库' : '先在 PS 里选中一个图层'}
        disabled={!page.canSave}
        onClick={() => void page.saveSelection()}
      >
        <Icon name="icondaoru" />
      </button>

      {/* 三种菜单：条目 / 文件夹 / 空白处。菜单指向的对象可能已被删掉（索引在别处变了）⇒ 空菜单不渲染 */}
      {(() => {
        if (page.menu === null) return null;
        const items =
          page.menu.kind === 'item' ? itemMenu : page.menu.kind === 'folder' ? folderMenu : emptyMenu;
        if (items.length === 0) return null;
        return (
          <ContextMenu x={page.menu.x} y={page.menu.y} items={items} onClose={page.closeMenu} />
        );
      })()}

      {movingItem === null ? null : (
        <FolderPicker
          x={page.moveTarget?.x ?? 0}
          y={page.moveTarget?.y ?? 0}
          folders={page.foldersAll}
          currentFolderId={movingItem.folderId}
          onPick={(folderId) => void page.pickFolder(folderId)}
          onClose={page.closeMove}
        />
      )}

      {page.dialog === null ? null : (
        <InputDialog
          title={page.dialog.title}
          defaultValue={page.dialog.value}
          onSubmit={(value) => void page.submitDialog(value)}
          onClose={page.closeDialog}
        />
      )}

      {previewItem === null ? null : (
        <ImagePreview
          src={`${templateThumbUrl(previewItem.id, previewItem.file)}?t=${page.imageVersion}`}
          alt={previewItem.name}
          onClose={page.closePreview}
        />
      )}
    </div>
  );
}
