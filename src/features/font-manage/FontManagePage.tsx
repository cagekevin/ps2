/**
 * 字体管理页：工具行（搜索 / 筛选 / 更多）→ 我的标签 → 计数行 → 字体列表 → 底栏。
 *
 * **没有标题行**：原版字体管理页也没有，「我的字体」这个标题随页头一起去掉了；
 * 「更多」菜单与筛选漏斗同排（`SearchRow` 的 `trailing`）。
 *
 * 页面只做组装：动作在 `useFontManage`，单项在 `components/FontListItem`。
 */
import { MessageBar, failureMessage, mergeMessages, type MessageItem } from '../../components/MessageBar';
import { FontListItem } from './components/FontListItem';
import { PageFooter } from './components/PageFooter';
import { FontMenu } from './components/FontMenu';
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

  /*
   * 页面状态话全仓唯一出口 = 底部消息行（常驻零位移）：读取失败、降级的数据健康、
   * 列表态收敛到这一行，优先级 error > warn > info（`mergeMessages`）。
   * 列表态互斥（失败 / 加载中 / 空列表只说一句），与旧三元链同构——
   * 不拆成平级三条，否则初次加载时「正在读取…」和「没有可用字体」会拼在一起。
   */
  const listState: MessageItem | null = page.loadError
    ? failureMessage(page.loadError, page.refresh)
    : page.loading && !page.fonts.length
      ? { kind: 'info', text: '正在读取系统字体…' }
      : !page.visible.length
        ? {
            kind: 'info',
            text: page.hasFilter ? '没有匹配的字体' : '系统里没有可用字体',
            action: page.hasFilter ? { label: '清除筛选', onClick: page.clearFilters } : undefined
          }
        : null;
  const message = mergeMessages([
    listState,
    page.dropped.length
      ? { kind: 'warn' as const, text: `${page.dropped.length} 个字体项无法识别` }
      : null,
    page.tagsDropped.length
      ? { kind: 'warn' as const, text: `${page.tagsDropped.length} 个标签无法识别` }
      : null,
    page.starsDropped.length
      ? { kind: 'warn' as const, text: `${page.starsDropped.length} 个评分无法识别` }
      : null,
    page.classificationError
      ? { kind: 'warn' as const, text: `${page.classificationError}（分类筛选已禁用）` }
      : page.classificationEmpty
        ? { kind: 'warn' as const, text: '没有分类数据（分类筛选已禁用）' }
        : null,
    page.starsError
      ? {
          kind: 'warn' as const,
          text: `${page.starsError}：列表里的评分先按「未收藏」显示，不是你的评分丢了`
        }
      : null,
    page.tagsError
      ? { kind: 'warn' as const, text: `${page.tagsError}（标签读取失败，字体列表不受影响）` }
      : null
  ]);

  return (
    <div className="mm-font">
      <div className="mm-font__toolbar">
        <SearchRow
          keyword={page.keyword}
          onKeyword={page.setKeyword}
          categories={page.categories}
          filterState={page.filterState}
          onFilterChange={page.setFilterState}
          trailing={
            <FontMenu previewMode={page.previewMode} onMenuSelect={page.onMenuSelect} />
          }
        />

        {page.showTextPanel ? (
          <div>
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
          activeTag={page.activeTag}
          onSelect={page.setActiveTag}
          onClear={() => page.setActiveTag('')}
          onContext={page.openTagContext}
          onCreate={page.openTagCreator}
        />
      </div>

      {/*
        * 列表容器**常驻**（flex:1 撑住高度）：失败 / 加载 / 空列表时里面没有条目，
        * 但容器高度不变 —— PageFooter 与底部消息行不跳。状态话在底部消息行。
        */}
      <div ref={page.listRef} className="mm-font__list">
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
        <div ref={page.sentinelRef} className="mm-font__sentinel" aria-hidden="true" />
      </div>

      {/* 消息行常驻在列表与底栏之间：行高锁死，出现 / 消失都不挤动上方内容 */}
      <MessageBar message={message} />

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
