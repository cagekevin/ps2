/**
 * 字体面板页（`/font`）
 *
 * 页面只做组装：快选区 → 属性区 → 图标行 → 对齐区 → 层级区。
 * 所有 PS 写入在 `commands/font-set.ts`，配置从 `store/font-set` 读，页面不碰底层。
 *
 * 顶部 6 个图标的开合全部交给 `IconPanelGroup`（互斥由它管，页面不持有 panel 状态）：
 *   拆分 = 左键开面板
 *   生成按钮 / 粘贴文字属性 = 左键执行，右键开设置面板
 *   翻译 = 一直禁用（方案未定）
 */

import { Icon } from '../../components/icons';
import { IconButton } from '../../components/IconButton';
import { IconPanel, IconPanelGroup } from '../../components/IconPanel';
import { InputDialog } from '../../components/InputDialog';
import { useFontPanel } from './useFontPanel';
import { CreateButtonPanel } from './components/CreateButtonPanel';
import { DistributionHelp } from './components/DistributionHelp';
import { FontColor } from './components/FontColor';
import { FontHierarchy } from './components/FontHierarchy';
import { FontQuick } from './components/FontQuick';
import { PasteFontPanel } from './components/PasteFontPanel';
import { SplitPanel } from './components/SplitPanel';
import {
  BOTTOM_ICONS_FOUR,
  BOTTOM_ICONS_ONE,
  BOTTOM_ICONS_THREE,
  BOTTOM_ICONS_TWO,
  BOTTOM_TITLES_FOUR,
  BOTTOM_TITLES_ONE,
  BOTTOM_TITLES_THREE,
  BOTTOM_TITLES_TWO,
  TOP_BADGES_ONE,
  TOP_BADGES_TWO,
  TOP_ICONS_ONE,
  TOP_ICONS_TWO,
  TOP_TITLES_ONE,
  TOP_TITLES_TWO
} from './font-panel-constants';
import './FontPanelPage.css';

export default function FontPanelPage() {
  const page = useFontPanel();

  return (
    <div className="mm-font-panel">
      {page.settings.ztShowQuick ? (
        <FontQuick
          fonts={page.quickFonts.list}
          index={page.quickFonts.index}
          onSelect={page.onQuickSelect}
          onApply={page.onQuickApply}
          onAdd={page.onQuickAdd}
          onRemove={page.onQuickRemove}
        />
      ) : null}

      <hr className="mm-font-panel__line" />

      {page.info ? (
        <FontColor
          info={page.info}
          error={page.textError}
          fonts={page.fonts}
          fontsLoading={page.fontsLoading}
          defaults={{
            size: page.settings.ztDefaultSize,
            leading: page.settings.ztDefaultLeading,
            tracking: page.settings.ztDefaultTracking
          }}
          onFontName={page.onFontName}
          onSize={page.onSize}
          onLeading={page.onLeading}
          onTracking={page.onTracking}
          onColor={page.onColor}
          onStyle={page.onStyle}
          onAlign={page.onTextAlign}
        />
      ) : (
        /* 还没读到属性就不摆默认数字：把「12 点 / 白色」当成真实属性是骗人 */
        <p className="mm-font-panel__state">{page.textError || '正在读取文字属性…'}</p>
      )}

      <div className="mm-font-panel__icons">
        <IconPanelGroup exclusive>
          <div className="mm-font-panel__icon-row">
            {TOP_ICONS_ONE.map((icon, index) => (
              <IconPanel
                key={icon}
                id={`top-one-${index}`}
                icon={icon}
                title={TOP_TITLES_ONE[index] ?? ''}
                badge={TOP_BADGES_ONE.includes(index)}
                disabled={index === 0}
                onPrimary={
                  index === 2 ? (event) => (event.ctrlKey ? page.onCtrlClick() : page.onApplyCreateButton()) : undefined
                }
                panel={
                  index === 1 ? (
                    <SplitPanel onSplit={page.onSplit} />
                  ) : index === 2 ? (
                    <CreateButtonPanel
                      config={page.settings.ztCreateButton}
                      onChange={page.onChangeCreateButton}
                      onApply={page.onApplyCreateButton}
                    />
                  ) : undefined
                }
              />
            ))}

            <span className="mm-font-panel__divider" />

            {TOP_ICONS_TWO.map((icon, index) => (
              <IconPanel
                key={icon}
                id={`top-two-${index}`}
                icon={icon}
                title={TOP_TITLES_TWO[index] ?? ''}
                badge={TOP_BADGES_TWO.includes(index)}
                onPrimary={
                  index === 0
                    ? () => page.onCopyFont()
                    : index === 1
                      ? (event) => (event.ctrlKey ? page.onCtrlClick() : page.onPasteFont())
                      : () => page.onSwitchDirection()
                }
                panel={
                  index === 1 ? (
                    <PasteFontPanel
                      keeps={page.settings.ztPasteFont}
                      onChange={page.onChangePasteFont}
                      onReset={page.onResetPasteFont}
                    />
                  ) : undefined
                }
              />
            ))}
          </div>
        </IconPanelGroup>
      </div>

      <hr className="mm-font-panel__line mm-font-panel__line--set" />

      <div className="mm-font-panel__icons">
        <div className="mm-font-panel__icon-row">
          {BOTTOM_ICONS_ONE.map((icon, index) => (
            <IconButton
              key={icon}
              name={icon}
              title={BOTTOM_TITLES_ONE[index] ?? ''}
              onClick={() => page.onAlign('h', index)}
            />
          ))}

          <span className="mm-font-panel__divider" />

          {BOTTOM_ICONS_TWO.map((icon, index) => (
            <IconButton
              key={icon}
              name={icon}
              title={BOTTOM_TITLES_TWO[index] ?? ''}
              onClick={() =>
                index === 0 ? page.onAlign('bg-h') : page.openDistribution(1, BOTTOM_TITLES_TWO[1])
              }
            />
          ))}
        </div>

        <div className="mm-font-panel__icon-row mm-font-panel__icon-row--after">
          {BOTTOM_ICONS_THREE.map((icon, index) => (
            <IconButton
              key={icon}
              name={icon}
              title={BOTTOM_TITLES_THREE[index] ?? ''}
              onClick={() => page.onAlign('v', index)}
            />
          ))}

          <span className="mm-font-panel__divider" />

          {BOTTOM_ICONS_FOUR.map((icon, index) => (
            <IconButton
              key={icon}
              name={icon}
              title={BOTTOM_TITLES_FOUR[index] ?? ''}
              onClick={() =>
                index === 0 ? page.onAlign('bg-v') : page.openDistribution(2, BOTTOM_TITLES_FOUR[1])
              }
            />
          ))}
        </div>
      </div>

      {page.settings.ztShowCustom ? (
        <>
          <hr className="mm-font-panel__line" />
          <FontHierarchy
            levels={page.settings.ztHierarych}
            presets={page.hierarchy.list}
            presetIndex={page.hierarchy.index}
            onApplyLevel={page.onApplyLevel}
            onUpdateLevels={page.onUpdateLevels}
            onSelectPreset={page.onSelectPreset}
            onSavePreset={page.onSavePreset}
            onCreatePreset={page.onCreatePreset}
            onRenamePreset={page.onRenamePreset}
            onDeletePreset={page.onDeletePreset}
          />
        </>
      ) : null}

      {page.distribution ? (
        <InputDialog
          title={page.distribution.title}
          extraHeader={
            <button
              type="button"
              className={`mm-font-panel__pin${
                page.settings.ztDistributedIsFixed ? ' mm-font-panel__pin--on' : ''
              }`}
              title="固定弹窗"
              aria-pressed={page.settings.ztDistributedIsFixed}
              onClick={() => page.onPinDistribution(!page.settings.ztDistributedIsFixed)}
            >
              <Icon name="icongudingxuanxiangye" size={14} />
            </button>
          }
          extra={<DistributionHelp />}
          onSubmit={(value) => {
            page.onDistribute(value);
            /* 原版：没勾「固定」就提交后自动关，勾了留着连续输 */
            if (!page.settings.ztDistributedIsFixed) page.closeDistribution();
          }}
          onClose={page.closeDistribution}
        />
      ) : null}
    </div>
  );
}
