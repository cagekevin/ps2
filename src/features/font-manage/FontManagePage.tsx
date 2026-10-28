/**
 * 字体管理页：页头 → 搜索/筛选 → 我的标签 → 计数行 → 字体列表 → 底栏。
 *
 * 页面只做组装：动作在 `useFontManage`，单项在 `components/FontListItem`。
 */
import { StateHint } from '../../components/StateHint';
import { FontListItem } from './components/FontListItem';
import { CountRow } from './components/CountRow';
import { PageFooter } from './components/PageFooter';
import { FontHeader } from './components/FontHeader';
import { PreviewText } from './components/PreviewText';
import { SearchRow } from './components/SearchRow';
import { TagContextMenu } from './components/TagContextMenu';
import { TagCreator } from './components/TagCreator';
import { TagFilter } from './components/TagFilter';
import { TagMenu } from './components/TagMenu';
import { useFontManage } from './useFontManage';
import './FontManagePage.css';
import './FontList.css';
import './FontPopovers.css';

export default function FontManagePage() {
  const page = useFontManage();

  return (
    <div className="mm-font">
      <FontHeader previewMode={page.previewMode} onMenuSelect={page.onMenuSelect} />

      <div className="mm-font__toolbar">
        <SearchRow
          keyword={page.keyword}
          onKeyword={page.setKeyword}
          categories={page.categories}
          filterState={page.filterState}
          onFilterChange={page.setFilterState}
        />

        {page.showTextPanel ? (
          <div className="mm-font__text-panel">
            <PreviewText
              current={page.previewText}
              onApply={(value) => {
                page.setPreviewText(value);
                page.setShowTextPanel(false);
              }}
            />
          </div>
        ) : null}

        <TagFilter
          tags={page.tags}
          error={page.tagsError}
          activeTag={page.activeTag}
          onSelect={page.setActiveTag}
          onContext={page.openTagContext}
          onCreate={page.openTagCreator}
        />
      </div>

      <CountRow
        text={page.countText}
        activeTag={page.activeTag}
        onClear={() => page.setActiveTag('')}
      />

      <div className="mm-font__warnings">
        {page.dropped.length > 0 ? (
          <p className="mm-font__warning">{page.dropped.length} 个字体项无法识别</p>
        ) : null}
        {page.tagsDropped.length > 0 ? (
          <p className="mm-font__warning">{page.tagsDropped.length} 个标签无法识别</p>
        ) : null}
        {page.starsDropped.length > 0 ? (
          <p className="mm-font__warning">{page.starsDropped.length} 个评分无法识别</p>
        ) : null}
        {page.classificationError ? (
          <p className="mm-font__warning">{page.classificationError}（分类筛选已禁用）</p>
        ) : page.classificationEmpty ? (
          <p className="mm-font__warning">没有分类数据（分类筛选已禁用）</p>
        ) : null}
        {page.starsError ? (
          <p className="mm-font__warning">
            {page.starsError}：列表里的评分先按「未收藏」显示，不是你的评分丢了
          </p>
        ) : null}
      </div>

      {page.loadError ? (
        <div className="mm-font__state">
          <StateHint result={page.loadError} onRetry={page.refresh} />
        </div>
      ) : page.loading && !page.fonts.length ? (
        <div className="mm-font__state">
          <StateHint empty="正在读取系统字体…" />
        </div>
      ) : !page.visible.length ? (
        <div className="mm-font__state">
          <StateHint empty={page.hasFilter ? '没有匹配的字体' : '系统里没有可用字体'} />
          {page.hasFilter ? (
            <button type="button" className="mm-font__retry" onClick={page.clearFilters}>
              清除筛选
            </button>
          ) : null}
        </div>
      ) : (
        <ul ref={page.listRef} className="mm-font__list">
          {page.visible.map((font) => (
            <FontListItem
              key={`${font.family}::${font.postScriptNames[0] ?? ''}`}
              font={font}
              star={page.stars[font.family] ?? 0}
              active={page.activeFamily === font.family}
              previewMode={page.previewMode}
              sample={page.sampleOf(font)}
              previewFamily={page.previewFamilyOf(font)}
              currentWeight={page.currentWeight(font.family)}
              unavailableReason={page.faceErrorOf(font)}
              onApply={page.apply}
              onRate={page.rate}
              onOpenTags={page.openTagMenu}
            />
          ))}
          <li ref={page.sentinelRef} className="mm-font__sentinel" aria-hidden="true" />
        </ul>
      )}

      <PageFooter
        mode={page.previewMode}
        onMode={page.setPreviewMode}
        onToggleText={() => page.setShowTextPanel((value) => !value)}
      />

      {page.tagMenu ? (
        <TagMenu
          key={`${page.tagMenu.x}-${page.tagMenu.y}-${page.tagMenu.family}`}
          x={page.tagMenu.x}
          y={page.tagMenu.y}
          tags={page.tags}
          active={page.tagMenuActive}
          onToggle={(text) => page.toggleTagOf(text, page.tagMenu?.family ?? '')}
          onCreate={page.createTagFromMenu}
          onClose={page.closeTagMenu}
        />
      ) : null}

      {page.tagContext ? (
        <TagContextMenu
          x={page.tagContext.x}
          y={page.tagContext.y}
          onRename={() => page.startRename(page.tagContext?.tag ?? '')}
          onRemove={() => {
            void page.askDeleteTag(page.tagContext?.tag ?? '');
          }}
          onClose={page.closeTagContext}
        />
      ) : null}

      {page.tagCreator ? (
        <TagCreator
          key={`${page.tagCreator.mode}-${page.tagCreator.from}`}
          mode={page.tagCreator.mode}
          initial={page.tagCreator.initial}
          onSubmit={page.submitTag}
          onClose={page.closeTagCreator}
        />
      ) : null}
    </div>
  );
}
