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
import { Collapse } from '../../components/Collapse';
import { Icon } from '../../components/icons';
import { IconButton } from '../../components/IconButton';
import { IconPanel, IconPanelGroup } from '../../components/IconPanel';
import { StateHint } from '../../components/StateHint';
import { TextField } from '../../components/TextField';
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

/** 一个缩放档位按钮（四颗 / 十颗两种宽度） */
function ZoomPreset({
  value,
  wide,
  onClick
}: {
  value: number;
  wide: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`mm-common__preset${wide ? ' mm-common__preset--tenth' : ' mm-common__preset--quarter'}`}
      title={String(value)}
      onClick={onClick}
    >
      {value}
    </button>
  );
}

export default function CommonPage() {
  const page = useCommonPage();
  const visibleTiles = page.tiles.filter((tile) => tile.visible);

  return (
    <div className="mm-common">
      <header className="mm-common__header">
        <h1 className="mm-common__title">常用功能页</h1>
        {/* 计划 §1.1 的 12 类基础按钮里，只有这两个不落在网格上 */}
        <IconButton
          name="iconwenjianjiamulu"
          title="打开所在目录"
          size={14}
          onClick={page.openDataDirectory}
        />
        <IconButton name="iconshuaxin" title="重置常用项" size={14} onClick={page.resetTiles} />
      </header>

      <div className="mm-common__body">
        {page.reasons.tiles ? <StateHint result={page.reasons.tiles} onRetry={page.reload} /> : null}
        {page.reasons.options ? (
          <StateHint result={page.reasons.options} onRetry={page.reload} />
        ) : null}

        {page.showZoom ? (
          <Collapse
            title="缩放"
            open={!page.collapsed.zoom}
            onToggle={() => page.toggleSection('zoom')}
          >
            <div className="mm-common__row">
              <TextField
                variant="half"
                icon="iconfangda"
                title="放大倍数"
                placeholder="105"
                inputMode="decimal"
                value={page.enlarge}
                onChange={page.setEnlarge}
                onSubmit={(text) => page.submitScale(text)}
              />
              <TextField
                variant="half"
                icon="iconsuoxiao"
                title="缩小倍数"
                placeholder="95"
                inputMode="decimal"
                value={page.narrow}
                onChange={page.setNarrow}
                onSubmit={(text) => page.submitScale(text)}
              />
            </div>

            <div className="mm-common__presets">
              {ZOOM_LEVELS.enlargePart.map((value) => (
                <ZoomPreset key={`enlarge-${value}`} value={value} wide={false} onClick={() => page.zoomTo(value)} />
              ))}
              {ZOOM_LEVELS.narrowPart.map((value) => (
                <ZoomPreset key={`narrow-${value}`} value={value} wide={false} onClick={() => page.zoomTo(value)} />
              ))}
            </div>

            <div className="mm-common__presets">
              {ZOOM_LEVELS.enlargeAll.map((value) => (
                <ZoomPreset key={`enlarge-all-${value}`} value={value} wide onClick={() => page.zoomTo(value)} />
              ))}
            </div>

            <div className="mm-common__presets">
              {ZOOM_LEVELS.narrowAll.map((value) => (
                <ZoomPreset key={`narrow-all-${value}`} value={value} wide onClick={() => page.zoomTo(value)} />
              ))}
            </div>
          </Collapse>
        ) : null}

        {page.showTransformation ? (
          <Collapse
            title="变换"
            open={!page.collapsed.transformation}
            onToggle={() => page.toggleSection('transformation')}
          >
            <div className="mm-common__flips">
              {FLIP_ITEMS.map((item) => (
                <button
                  key={item.direction}
                  type="button"
                  className="mm-common__flip"
                  title={item.title}
                  aria-label={item.title}
                  onClick={() => page.flipTo(item.direction)}
                >
                  <Icon name={item.icon} size={18} />
                </button>
              ))}
            </div>
          </Collapse>
        ) : null}

        <div className="mm-common__divider" />

        <Collapse
          title="常用功能"
          open={!page.collapsed.grid}
          onToggle={() => page.toggleSection('grid')}
        >
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
        </Collapse>
      </div>
    </div>
  );
}
