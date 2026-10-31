/**
 * 字体管理页的动作与交互状态。
 *
 * 页面只做组装：读数据走 store（repo 投影），写操作走 commands，
 * 命令成功后自己重读受影响的投影（不订阅 onChange）。
 *
 * 标签相关（弹层 / 右键 / 新建改名 / 导入导出）在 `useTagActions.ts`；
 * 本文件负责数据、筛选、分页、应用与预览。
 */
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useRunCommand } from '../../hooks/useRunCommand';
import {
  applyFontFaceToLayer,
  loadFontList,
  rateFont,
  type FontListRead
} from '../../commands/font';
import { resolveFontFace, type FontItem } from '../../domain/font-item';
import {
  filterFonts,
  hasActiveFilter,
  usableCategories as usableCategoriesOf,
  type FilterState
} from '../../domain/font-filter';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { usePagedList } from '../../hooks/usePagedList';
import { defaultPreviewText, useFontStore } from '../../store/font';
import { ok, type Failure, type Result } from '../../types/result';
import type { FontMenuAction } from './components/FontMenu';
import { useTagActions } from './useTagActions';

export function useFontManage() {
  const runCommand = useRunCommand();

  const tags = useFontStore((state) => state.tags);
  const failures = useFontStore((state) => state.failures);
  const droppedBySource = useFontStore((state) => state.dropped);
  const stars = useFontStore((state) => state.stars);

  const classification = useFontStore((state) => state.classification);

  const previewMode = useFontStore((state) => state.previewMode);
  const previewText = useFontStore((state) => state.previewText);
  const loadTags = useFontStore((state) => state.loadTags);
  const loadStars = useFontStore((state) => state.loadStars);
  const loadClassification = useFontStore((state) => state.loadClassification);
  const setPreviewMode = useFontStore((state) => state.setPreviewMode);
  const setPreviewText = useFontStore((state) => state.setPreviewText);
  const cyclePreview = useFontStore((state) => state.cyclePreview);

  const [loadResult, setLoadResult] = useState<Result<FontListRead> | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [filterState, setFilterState] = useState<FilterState>({});
  const [activeFamily, setActiveFamily] = useState('');
  const [weightIndex, setWeightIndex] = useState<Record<string, number>>({});
  const [showTextPanel, setShowTextPanel] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const aliveRef = useRef(true);
  const requestSeq = useRef(0);
  const applyingRef = useRef(false);

  /* 字重索引用 ref 读：让 `apply` 的引用稳定，列表行不会因一次应用全部重渲染 */
  const weightIndexRef = useRef(weightIndex);
  useEffect(() => {
    weightIndexRef.current = weightIndex;
  }, [weightIndex]);

  const fonts = useMemo(
    () => (loadResult?.status === 'ok' ? loadResult.value.fonts : []),
    [loadResult]
  );
  const dropped = loadResult?.status === 'ok' ? loadResult.value.dropped : [];
  /* 失败态单独给出去：`StateHint` 的类型要求「有 result 就是 Error」，不再收 `Result | null` */
  const loadError = loadResult?.status === 'error' ? loadResult : null;

  const runLoad = useCallback(async (force = false) => {
    const seq = ++requestSeq.current;
    setLoading(true);

    /* 浏览器里没有 PS，系统字体必然读不到；dev 下换假数据，才看得到列表的真实排版 */
    const result = import.meta.env.DEV
      ? ok({ fonts: (await import('../../dev/preview')).PREVIEW_FONTS, dropped: [] })
      : await loadFontList(force);

    if (!aliveRef.current || seq !== requestSeq.current) return;

    setLoadResult(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    void runLoad();
    loadTags();
    loadStars();
    loadClassification();

    return () => {
      aliveRef.current = false;
    };
  }, [runLoad, loadTags, loadStars, loadClassification]);

  const tagMap = useMemo(() => new Map(tags.map((tag) => [tag.text, tag.arr])), [tags]);
  /* 1000+ 字体时不让每次按键都阻塞输入（Chromium 103 支持 useDeferredValue） */
  const deferredKeyword = useDeferredValue(keyword);

  const filtered = useMemo(
    () =>
      filterFonts(fonts, {
        keyword: deferredKeyword,
        tag: activeTag,
        tagFonts: activeTag ? tagMap.get(activeTag) : undefined,
        state: filterState
      }),
    [fonts, deferredKeyword, activeTag, tagMap, filterState]
  );

  const resetKey = `${deferredKeyword}\u0000${activeTag}\u0000${JSON.stringify(filterState)}`;
  const { visible, hasMore, loadMore } = usePagedList(filtered, resetKey);
  const sentinelRef = useInfiniteScroll({
    root: listRef,
    onReach: loadMore,
    enabled: hasMore
  });

  const categories = useMemo(() => usableCategoriesOf(classification), [classification]);
  const hasFilter = hasActiveFilter({ keyword, tag: activeTag, state: filterState });

  /**
   * 统一的失败出口：**实现委托给 `runCommand`**，这里只把 `Result` 折成 `boolean`
   * （十几个调用点靠它决定要不要继续，签名不动；提示与留痕全在 hook 里）。
   */
  const notify = useCallback(
    async (task: Promise<Result<unknown>>, success: string): Promise<boolean> => {
      const result = await runCommand(() => task, { spin: false, success });
      return result.status === 'ok';
    },
    [runCommand]
  );

  const currentWeight = useCallback(
    (family: string) => weightIndex[family] ?? 0,
    [weightIndex]
  );

  const sampleOf = useCallback(
    (font: FontItem) => previewText || defaultPreviewText(font.family),
    [previewText]
  );

  /* 灰态与点击共用同一个判据：现在这个字重能不能应用 */
  const faceErrorOf = useCallback(
    (font: FontItem) => {
      const face = resolveFontFace(font, weightIndex[font.family] ?? 0);
      return face.status === 'error' ? face.reason : '';
    },
    [weightIndex]
  );

  const apply = useCallback(
    async (font: FontItem, variantIndex?: number) => {
      /* 一次只发一条 ztgl_setFont：连点不会排一串重复调用 */
      if (applyingRef.current) return;
      applyingRef.current = true;

      const index = variantIndex ?? weightIndexRef.current[font.family] ?? 0;

      try {
        /* 文案取同一判据；失败原因由命令层原样返回，这里不预判 */
        const face = resolveFontFace(font, index);
        const suffix = face.status === 'ok' ? ` · ${face.value.weight}` : '';
        const ok = await notify(applyFontFaceToLayer(font, index), `已应用 ${font.family}${suffix}`);
        if (!ok) return;

        setWeightIndex((current) => ({ ...current, [font.family]: index }));
        setActiveFamily(font.family);
      } finally {
        applyingRef.current = false;
      }
    },
    [notify]
  );

  const rate = useCallback(
    async (family: string, value: number) => {
      const ok = await notify(rateFont(family, value), '已更新评分');
      if (ok) loadStars();
    },
    [notify, loadStars]
  );

  const refresh = useCallback(() => {
    void runLoad(true);
  }, [runLoad]);

  const clearFilters = useCallback(() => {
    setKeyword('');
    setActiveTag('');
    setFilterState({});
  }, []);

  const tagActions = useTagActions({
    tags,
    activeTag,
    setActiveTag,
    loadTags,
    loadStars,
    notify
  });

  const { handleImportTags, handleExportTags } = tagActions;

  const onMenuSelect = useCallback(
    (action: FontMenuAction) => {
      if (action === 'refresh') refresh();
      else if (action === 'preview') cyclePreview();
      else if (action === 'import-tags') void handleImportTags();
      else if (action === 'export-tags') void handleExportTags();
    },
    [refresh, cyclePreview, handleImportTags, handleExportTags]
  );

  /** 失败原因只有一个出口（标签、评分、分类共用） */
  /**
   * 收原因：三个来源现在都是**失败臂**（`Failure | null`），这里只取一句话。
   *
   * 以前 `tagsRead` / `starsRead` 存整条 `Result`，这个函数得同时收 `Result` 与 `Failure` 两种
   * （父类型 + 子类型），等于一个函数干两件事（`TD-05-2`）。
   */
  function reasonOf(failure: Failure | null): string {
    return failure ? failure.reason : '';
  }

  const tagsDropped = droppedBySource.tags;
  const starsDropped = droppedBySource.stars;

  return {
    loadResult,
    loading,
    loadError,
    fonts,
    visible,
    sentinelRef,
    listRef,
    dropped,
    keyword,
    setKeyword,
    activeTag,
    setActiveTag,
    filterState,
    setFilterState,
    categories,
    hasFilter,
    clearFilters,
    activeFamily,
    currentWeight,
    sampleOf,
    faceErrorOf,
    previewMode,
    previewText,
    setPreviewMode,
    setPreviewText,
    showTextPanel,
    setShowTextPanel,
    apply,
    rate,
    refresh,
    tags,
    tagsError: reasonOf(failures.tags),
    tagsDropped,
    starsError: reasonOf(failures.stars),
    starsDropped,
    stars,
    /* 读失败与「读到 0 个分类」是两件事：前者给原因，后者给一句独立的说明 */
    classificationError: reasonOf(failures.classification),
    classificationEmpty: classification.categories.length === 0,
    ...tagActions,
    onMenuSelect
  };
}
