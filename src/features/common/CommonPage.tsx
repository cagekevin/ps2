/**
 * 常用页（`/common`）：缩放区 → 变换区 → 分隔线 → 14 项功能网格。
 * **没有页头**：标题已去掉（导航上已有页名），内容区从第一行开始，与字体管理页同一处理。
 *
 * 结构照 `docs/plan/03-常用-2026-10-27.md` §5。**本页不做折叠**（2026-10-29 决定）：
 * 三块区域的折叠只省高度，但要额外维护一份本地偏好，收益不抵；需要「一行标题开合一块内容」
 * 时用 `IconPanel` + `sectionTrigger`（唯一实现，`Collapse` 组件已删除）。
 * 两块区域的显隐来自 `sj_set.json` 的 `cyShowZoom` / `cyShowTransformation`（走 `domain.booleanOptionOf`）。
 *
 * 本页不写底层：命令走 `commands/common-use`，状态走 `store/common-use`，
 * 图标与控件走 `components/*`。手势只有三层（左键执行 / 右键与左键一样开面板 / Ctrl+右键进自由面板），
 * v1 只做前两层里的左键，右键展开随子面板在 M3 接。
 */

import type { ReactNode } from 'react';
import { Chevron } from '../../components/Chevron';
import { IconButton } from '../../components/IconButton';
import { IconPanel, IconPanelGroup } from '../../components/IconPanel';
import { MSG } from '../../types/messages';
import { StateHint } from '../../components/StateHint';
import { Icon, type IconName } from '../../components/icons';
import type { CommonUseTile } from '../../domain/common-use';
import { AUTO_FILL_TILE_ID, FLIP_ITEMS, TILE_COMMANDS, ZOOM_LEVELS } from './common-constants';
import { CustomTransformPanel } from './components/CustomTransformPanel';
import { EmbedPanel } from './components/EmbedPanel';
import { ExportPanel } from './components/ExportPanel';
import { ImportPanel } from './components/ImportPanel';
import { OptimizePanel } from './components/OptimizePanel';
import { ReferencePanel } from './components/ReferencePanel';
import { SpacingPanel } from './components/SpacingPanel';
import { TileButton } from './components/TileButton';
import { useCommonPage } from './useCommonPage';
import './CommonPage.css';

/** 每行 3 个（原版每格占宽 33%）；面板落在该行之后 */
const COLUMNS = 3;

/**
 * `comName` → 子面板。
 *
 * **7 个全部已接**：间距 / 参考线（v1）+ 嵌入 / 导入 / 优化 / 导出 / 自定义变换（v2）。
 * 唯一没有面板的是 v2 未做的子面板（`comembed` 之外的 5 个都已接）——返回 undefined 即「这一项没有面板」。
 */
function panelOf(tile: CommonUseTile): ReactNode {
  if (tile.comName === 'comspacing') return <SpacingPanel />;
  if (tile.comName === 'comreference') return <ReferencePanel />;
  if (tile.comName === 'comembed') return <EmbedPanel />;
  if (tile.comName === 'comimport') return <ImportPanel />;
  if (tile.comName === 'comoptimization') return <OptimizePanel />;
  if (tile.comName === 'comexport') return <ExportPanel />;
  if (tile.comName === 'comcustomChange') return <CustomTransformPanel />;
  return undefined;
}

/** 按 3 个一行切分（视图顺序，不是文件下标） */
function toRows(tiles: CommonUseTile[]): CommonUseTile[][] {
  const rows: CommonUseTile[][] = [];
  for (let index = 0; index < tiles.length; index += COLUMNS) {
    rows.push(tiles.slice(index, index + COLUMNS));
  }
  return rows;
}

/** 一个缩放档位按钮：宽度由容器决定（行内 4 等分 / 抽屉里 5 列），自己不写宽 */
function ZoomPreset({ value, onClick }: { value: number; onClick: () => void }) {
  return (
    <button
      type="button"
      className="mm-btn mm-btn--numeric mm-common__preset"
      title={String(value)}
      onClick={onClick}
    >
      {value}
    </button>
  );
}

/**
 * 一行缩放：「放大 / 缩小」下拉 + 4 个常用档位。
 *
 * 下拉是 `IconPanel` 的抽屉（公共件，整宽推开后续内容），不是自绘浮层；
 * 点档位后由 `close()` 收起，否则用户得再点一次触发器才能继续操作。
 * 两行共用页面级的 `expandedId`，所以它与功能格的抽屉也互斥——同一时刻只开一个。
 */
function ZoomRow({
  id,
  icon,
  label,
  quick,
  all,
  openId,
  onOpenChange,
  onPick
}: {
  id: string;
  icon: IconName;
  label: string;
  quick: readonly number[];
  all: readonly number[];
  openId: string;
  onOpenChange: (openId: string) => void;
  onPick: (value: number) => void;
}) {
  return (
    <IconPanelGroup
      className="mm-common__zoom-row"
      openId={openId}
      onOpenChange={onOpenChange}
    >
      <IconPanel
        id={id}
        title={label}
        trigger={(handlers) => (
          <button
            type="button"
            className="mm-common__zoom-trigger"
            aria-expanded={handlers['aria-expanded']}
            aria-controls={handlers['aria-controls']}
            onClick={handlers.toggle}
          >
            <Icon name={icon} />
            <span className="mm-common__zoom-label">{label}</span>
            <Chevron open={handlers.active} />
          </button>
        )}
        panel={(close) => (
          <div className="mm-common__zoom-all">
            {all.map((value) => (
              <ZoomPreset
                key={value}
                value={value}
                onClick={() => {
                  onPick(value);
                  close();
                }}
              />
            ))}
          </div>
        )}
      />
      <div className="mm-common__zoom-quick">
        {quick.map((value) => (
          <ZoomPreset key={value} value={value} onClick={() => onPick(value)} />
        ))}
      </div>
    </IconPanelGroup>
  );
}

export default function CommonPage() {
  const page = useCommonPage();
  const visibleTiles = page.tiles.filter((tile) => tile.visible);

  return (
    <div className="mm-common">
      {/*
       * **没有页头**：标题（原「常用功能页」）已去掉，与字体管理页同一处理 —— 导航上已经写着页名，
       * 再占 40 高只是白扔一行。两个曾有归口的入口仍然不是页头的，别借机加回来：
       *   - 「打开所在目录」属导出面板（官方 `cy_openDirectory` 两处调用都在那里）；
       *   - 「重置常用功能排序」在**设置页**（官方 `:1991384`，同一区还有 14 项显隐）。
       */}
      <div className="mm-common__body">
        {page.reasons.tiles ? <StateHint result={page.reasons.tiles} onRetry={page.reload} /> : null}
        {page.reasons.options ? (
          <StateHint result={page.reasons.options} onRetry={page.reload} />
        ) : null}
        {page.dropped.length ? (
          <div
            className="mm-common__warning"
            title={page.dropped
              .slice(0, 3)
              .map((item) => `${item.path} · ${item.reason}${item.detail ? ` · ${item.detail}` : ''}`)
              .join('\n')}
          >
            {page.dropped.length} {MSG.droppedSummary}
          </div>
        ) : null}

        {/* 缩放 / 变换**不折叠**：各自只有一两行，折叠标题比内容还占地方 */}
        {page.showZoom ? (
          <div className="mm-u-col mm-common__zoom">
            <ZoomRow
              id="zoom-enlarge"
              icon="iconfangda"
              label={'放大'}
              quick={ZOOM_LEVELS.enlargePart}
              all={ZOOM_LEVELS.enlargeAll}
              openId={page.expandedId}
              onOpenChange={page.setExpandedId}
              onPick={page.zoomTo}
            />
            <ZoomRow
              id="zoom-narrow"
              icon="iconshousuo"
              label={'缩小'}
              quick={ZOOM_LEVELS.narrowPart}
              all={ZOOM_LEVELS.narrowAll}
              openId={page.expandedId}
              onOpenChange={page.setExpandedId}
              onPick={page.zoomTo}
            />
          </div>
        ) : null}

        {page.showTransformation ? (
          <div className="mm-u-row mm-u-row--wrap mm-common__flips">
            {FLIP_ITEMS.map((item) => (
              <IconButton
                key={item.direction}
                name={item.icon}
                title={item.title}
                onClick={() => page.flipTo(item.direction)}
              />
            ))}
          </div>
        ) : null}

        <div className="mm-common__divider" />

        {visibleTiles.length ? (
          <div className="mm-u-col mm-common__grid" ref={page.gridRef}>
            {toRows(visibleTiles).map((row, rowIndex) => (
                <IconPanelGroup
                  /* key 用行首项的 id：顺序会变，用行号会让面板挂到错的组上 */
                  key={row[0]?.id ?? `row-${rowIndex}`}
                  className="mm-common__tile-row"
                  exclusive
                  openId={page.expandedId}
                  onOpenChange={page.setExpandedId}
                >
                  {row.map((tile) => {
                    const panel = panelOf(tile);
                    const command = TILE_COMMANDS[tile.id];
                    /* 有命令 = 左键执行（有面板也执行，右键展开）；只有面板 = 左键展开；
                       「自动填充颜色」是开关（不在 `TILE_COMMANDS` 里），单独算可点；都没有 = 灰态 */
                    const enabled =
                      panel !== undefined || command !== undefined || tile.id === AUTO_FILL_TILE_ID;
                    return (
                      <IconPanel
                        key={tile.id}
                        id={tile.id}
                        title={tile.title || tile.name}
                        panel={panel}
                        onPrimary={command ? () => page.activate(tile) : undefined}
                        trigger={(handlers) => (
                          <TileButton
                            tile={tile}
                            index={tile.index}
                            disabled={!enabled}
                            active={handlers.active}
                            onClick={handlers.onClick}
                            onContextMenu={handlers.onContextMenu}
                            onMouseDown={(event) => page.startDrag(event, tile.index)}
                          />
                        )}
                      />
                    );
                  })}
                </IconPanelGroup>
              ))}
            </div>
          ) : (
            <StateHint empty={MSG.emptyCommonGrid} />
          )}
      </div>
    </div>
  );
}
