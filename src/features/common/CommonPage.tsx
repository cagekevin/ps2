/**
 * 常用页（`/common`）：缩放区 → 变换区 → 分隔线 → 14 项功能网格。
 *
 * 结构照 `docs/plan/03-常用-2026-10-27.md` §5。三处折叠（缩放 / 变换 / 常用功能）的折叠态存
 * `core/prefs`，两块区域的显隐来自 `sj_set.json` 的 `cyShowZoom` / `cyShowTransformation`——
 * **这是两件事**：折叠是本地偏好，显隐是官方设置文件。
 *
 * 本页不写底层：命令走 `commands/common-use`，状态走 `store/common-use`，
 * 图标与控件走 `components/*`。手势只有三层（左键执行 / 右键与左键一样开面板 / Ctrl+右键进自由面板），
 * v1 只做前两层里的左键，右键展开随子面板在 M3 接。
 */

import type { ReactNode } from 'react';
import { IconButton } from '../../components/IconButton';
import { IconPanel, IconPanelGroup } from '../../components/IconPanel';
import { PageHeader } from '../../components/PageHeader';
import { StateHint } from '../../components/StateHint';
import { Icon, type IconName } from '../../components/icons';
import type { CommonUseTile } from '../../domain/common-use';
import { FLIP_ITEMS, TILE_COMMANDS, ZOOM_LEVELS } from './common-constants';
import { ReferencePanel } from './components/ReferencePanel';
import { SpacingPanel } from './components/SpacingPanel';
import { TileButton } from './components/TileButton';
import { useCommonPage } from './useCommonPage';
import './CommonPage.css';

/** 每行 3 个（原版每格占宽 33%）；面板落在该行之后 */
const COLUMNS = 3;

/** `comName` → 子面板。v1 只有两个；其余 5 个是 v2，返回 undefined 即「这一项没有面板」 */
function panelOf(tile: CommonUseTile): ReactNode {
  if (tile.comName === 'comspacing') return <SpacingPanel />;
  if (tile.comName === 'comreference') return <ReferencePanel />;
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
    <button type="button" className="mm-common__preset" title={String(value)} onClick={onClick}>
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
            <Icon name={icon} size={14} />
            <span className="mm-common__zoom-label">{label}</span>
            <Icon name="iconxiala" size={12} className="mm-common__zoom-arrow" />
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
      <PageHeader title="常用功能页">
        {/* 计划 §1.1 的 12 类基础按钮里，只有这两个不落在网格上 */}
        <IconButton
          name="iconwenjianjiamulu"
          title="打开所在目录"
          size={14}
          onClick={page.openDataDirectory}
        />
        <IconButton name="iconshuaxin" title="重置常用项" size={14} onClick={page.resetTiles} />
      </PageHeader>

      <div className="mm-common__body">
        {page.reasons.tiles ? <StateHint result={page.reasons.tiles} onRetry={page.reload} /> : null}
        {page.reasons.options ? (
          <StateHint result={page.reasons.options} onRetry={page.reload} />
        ) : null}
        {page.dropped.length ? (
          <div className="mm-common__warning">{page.dropped.length} 项无法识别，已跳过</div>
        ) : null}

        {/* 缩放 / 变换**不折叠**：各自只有一两行，折叠标题比内容还占地方 */}
        {page.showZoom ? (
          <div className="mm-common__zoom">
            <ZoomRow
              id="zoom-enlarge"
              icon="iconfangda"
              label="放大"
              quick={ZOOM_LEVELS.enlargePart}
              all={ZOOM_LEVELS.enlargeAll}
              openId={page.expandedId}
              onOpenChange={page.setExpandedId}
              onPick={page.zoomTo}
            />
            <ZoomRow
              id="zoom-narrow"
              icon="iconshousuo"
              label="缩小"
              quick={ZOOM_LEVELS.narrowPart}
              all={ZOOM_LEVELS.narrowAll}
              openId={page.expandedId}
              onOpenChange={page.setExpandedId}
              onPick={page.zoomTo}
            />
          </div>
        ) : null}

        {page.showTransformation ? (
          <div className="mm-common__flips">
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
          <div className="mm-common__grid" ref={page.gridRef}>
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
                    /* 有面板 = 左键展开；有命令 = 左键执行；都没有 = 灰态（v2 才接） */
                    const enabled = panel !== undefined || command !== undefined;
                    return (
                      <IconPanel
                        key={tile.id}
                        id={tile.id}
                        title={tile.title || tile.name}
                        panel={panel}
                        onPrimary={
                          panel === undefined && command ? () => page.activate(tile) : undefined
                        }
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
            <StateHint empty="没有可显示的常用功能" />
          )}
      </div>
    </div>
  );
}
