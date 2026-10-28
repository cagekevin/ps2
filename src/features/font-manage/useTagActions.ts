/**
 * 字体页的标签动作：标签弹层 / 右键菜单 / 新建改名弹窗 / 导入导出。
 *
 * 从 `useFontManage` 拆出来（原来单文件 425 行）。只做标签相关，
 * 数据读取、筛选、应用字面仍在 `useFontManage`。
 */
import { useCallback, useMemo, useState, type MouseEvent } from 'react';
import { useConfirm } from '../../components/Confirm/useConfirm';
import { useToast } from '../../components/Toast';
import { useRunCommand } from '../../hooks/useRunCommand';
import {
  createTag,
  deleteTag,
  exportFontTags,
  importFontTags,
  renameTag,
  toggleTag
} from '../../commands/font';
import type { FontTag } from '../../domain/font-meta';
import type { Result } from '../../types/result';

interface TagMenuState {
  x: number;
  y: number;
  family: string;
}

interface TagCreatorState {
  mode: 'create' | 'rename';
  from: string;
  initial: string;
}

interface TagContextState {
  x: number;
  y: number;
  tag: string;
}

interface Inputs {
  tags: FontTag[];
  activeTag: string;
  setActiveTag: (value: string) => void;
  loadTags: () => void;
  loadStars: () => void;
  notify: (task: Promise<Result<unknown>>, success: string) => Promise<boolean>;
}

export function useTagActions({
  tags,
  activeTag,
  setActiveTag,
  loadTags,
  loadStars,
  notify
}: Inputs) {
  const toast = useToast();
  const confirm = useConfirm();
  /* 导入导出走统一入口：失败留痕（log.warn + toast）由 hook 负责，`CANCELLED` 静默 */
  const run = useRunCommand();

  const [tagMenu, setTagMenu] = useState<TagMenuState | null>(null);
  const [tagContext, setTagContext] = useState<TagContextState | null>(null);
  const [tagCreator, setTagCreator] = useState<TagCreatorState | null>(null);

  const tagMenuActive = useMemo(() => {
    if (!tagMenu) return [];
    return tags.filter((tag) => tag.arr.includes(tagMenu.family)).map((tag) => tag.text);
  }, [tagMenu, tags]);

  const openTagMenu = useCallback((event: MouseEvent<HTMLElement>, family: string) => {
    event.preventDefault();
    setTagMenu({ x: event.clientX, y: event.clientY, family });
  }, []);

  const toggleTagOf = useCallback(
    async (tagText: string, family: string) => {
      const ok = await notify(toggleTag(tagText, family), '已更新标签');
      if (ok) loadTags();
    },
    [notify, loadTags]
  );

  const openTagContext = useCallback((event: MouseEvent<HTMLElement>, tag: string) => {
    event.preventDefault();
    setTagContext({ x: event.clientX, y: event.clientY, tag });
  }, []);

  const submitTag = useCallback(
    async (value: string) => {
      if (!tagCreator) return;
      if (!value) {
        toast.error('标签名不能为空');
        return;
      }
      if (tags.some((tag) => tag.text === value && tag.text !== tagCreator.from)) {
        toast.error(`标签「${value}」已存在`);
        return;
      }

      if (tagCreator.mode === 'create') {
        const ok = await notify(createTag(value), `已新建标签「${value}」`);
        if (!ok) return;
        loadTags();
        setTagCreator(null);
        return;
      }

      if (value === tagCreator.from) {
        setTagCreator(null);
        return;
      }

      const ok = await notify(renameTag(tagCreator.from, value), `已重命名为「${value}」`);
      if (!ok) return;

      if (activeTag === tagCreator.from) setActiveTag(value);
      loadTags();
      setTagCreator(null);
    },
    [tagCreator, tags, toast, notify, loadTags, activeTag, setActiveTag]
  );

  const askDeleteTag = useCallback(
    async (tag: string) => {
      const count = tags.find((item) => item.text === tag)?.arr.length ?? 0;
      const extra = count ? `该标签下有 ${count} 个字体。` : '';
      const ok = await confirm({
        title: '删除标签',
        message: `确定删除标签「${tag}」？${extra}`,
        confirmText: '删除'
      });
      if (!ok) return;

      const done = await notify(deleteTag(tag), `已删除标签「${tag}」`);
      if (!done) return;

      if (activeTag === tag) setActiveTag('');
      loadTags();
    },
    [tags, confirm, notify, loadTags, activeTag, setActiveTag]
  );

  const handleImportTags = useCallback(async () => {
    const ok = await confirm({
      title: '导入标签',
      message: '导入标签，会覆盖原来的标签及评分，是否继续？',
      confirmText: '导入'
    });
    if (!ok) return;

    const result = await run(() => importFontTags(), { spin: false, quiet: ['CANCELLED'] });
    if (result.status === 'error') return;

    toast.info(`已导入标签（${result.value.tags} 个）`);
    loadTags();
    loadStars();
  }, [confirm, run, toast, loadTags, loadStars]);

  const handleExportTags = useCallback(async () => {
    const ok = await confirm({
      title: '导出标签',
      message: '导出标签，不包含字体文件，仅导出标签及评分，是否继续？',
      confirmText: '导出'
    });
    if (!ok) return;

    const result = await run(() => exportFontTags(), { spin: false, quiet: ['CANCELLED'] });
    if (result.status === 'error') return;

    toast.info('已导出标签');
  }, [confirm, run, toast]);

  const createTagFromMenu = useCallback(
    (text: string) => {
      void (async () => {
        const ok = await notify(createTag(text), `已新建标签「${text}」`);
        if (ok) loadTags();
      })();
    },
    [notify, loadTags]
  );

  return {
    tagMenu,
    tagMenuActive,
    openTagMenu,
    closeTagMenu: () => setTagMenu(null),
    toggleTagOf,
    tagContext,
    openTagContext,
    closeTagContext: () => setTagContext(null),
    tagCreator,
    openTagCreator: () => setTagCreator({ mode: 'create', from: '', initial: '' }),
    closeTagCreator: () => setTagCreator(null),
    startRename: (tag: string) => setTagCreator({ mode: 'rename', from: tag, initial: tag }),
    submitTag,
    askDeleteTag,
    createTagFromMenu,
    handleImportTags,
    handleExportTags
  };
}
