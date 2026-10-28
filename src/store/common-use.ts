/**
 * 【范本】常用页切片：**只读投影**
 *
 * 读 repo + prefs，不 import `commands`（依赖表禁止）。写操作由页面经
 * `commands/common-use` 执行，成功后命令内部调 `load()` 重读（规则只有一处，页面不用记）。
 *
 * 失败处理：两个来源各留各的原因，**不许后跑的覆盖前一个**——网格读不到和设置读不到
 * 是两件事，用户需要分别知道。读失败保留上一份值（网格缺文件本来就等于种子），
 * 真正需要用户处理的失败（写盘）由命令返回 `CORRUPT` / `IO_ERROR`，页面 toast。
 */

import { create } from 'zustand';
import { log } from '../core/logger';
import { getPref } from '../core/prefs';
import {
  normalizeCollapsed,
  toTiles,
  type CommonSection,
  type CommonUseTile
} from '../domain/common-use';
import { pickCommonUseOptions, type CommonUseOptions } from '../domain/common-use-options';
import { readCommonUseFile, readCommonUseOptions } from '../repo/common-use-repo';
import type { Dropped } from '../types/decode-list';
import type { Result } from '../types/result';

/** 折叠态存 `core/prefs` 的 `common.collapsed`；键与归一化规则在 domain（唯一判据） */
type Collapsed = Record<CommonSection, boolean>;

/** 三个区域的键由 domain 定义，这里只转出去给页面与命令用 */
export type { CommonSection };

function readCollapsed(): Collapsed {
  return normalizeCollapsed(getPref<unknown>('common.collapsed', null));
}

interface CommonUseState {
  tiles: CommonUseTile[];
  /** 文件里认不出而跳过的项（缺 id / 不是对象）；页面必须显示出来，不许只写日志 */
  dropped: Dropped[];
  options: CommonUseOptions;
  collapsed: Collapsed;
  /**
   * 两个来源各自的失败，`null` = 这一类读成功。
   *
   * 存 `Result` 而不是一句字符串：失败提示要交给 `StateHint`，由**码**决定说什么、
   * 要不要给重试（`IO_ERROR` 才给）——存成字符串就只能自己拼文案，等于第二套提示。
   */
  reasons: { tiles: Result<CommonUseTile[]> | null; options: Result<CommonUseOptions> | null };
  /** 只读 repo + prefs，不写任何文件 */
  load: () => void;
  /**
   * 只改折叠态，**不重读文件**。
   *
   * 折叠是高频操作（每点一次区域一次），走 `load()` 会把两个 JSON 各读一遍；
   * 折叠值本来就在 prefs 里，命令层写完直接把新值推过来即可。
   */
  setCollapsed: (collapsed: Record<CommonSection, boolean>) => void;
}

export const useCommonUseStore = create<CommonUseState>()((set, get) => ({
  /* 首屏按官方种子渲染，避免「文件还没读到就先白一下」 */
  tiles: toTiles(null),
  dropped: [],
  options: pickCommonUseOptions({}),
  collapsed: normalizeCollapsed(null),
  reasons: { tiles: null, options: null },

  load() {
    const previous = get();
    const file = readCommonUseFile();
    const options = readCommonUseOptions();

    set({
      tiles: file.status === 'ok' ? toTiles(file.value.records) : previous.tiles,
      dropped: file.status === 'ok' ? file.value.dropped : [],
      options: options.status === 'ok' ? options.value : previous.options,
      collapsed: readCollapsed(),
      reasons: {
        tiles: file.status === 'error' ? file : null,
        options: options.status === 'error' ? options : null
      }
    });

    if (file.status === 'error') {
      log.warn('读取常用功能失败', { code: file.code, reason: file.reason });
    } else if (file.value.dropped.length) {
      log.warn('常用功能有项无法识别，已跳过', {
        count: file.value.dropped.length,
        paths: file.value.dropped.map((item) => item.path)
      });
    }
    if (options.status === 'error') {
      log.warn('读取常用页设置失败', { code: options.code, reason: options.reason });
    }
  },

  setCollapsed(collapsed) {
    set({ collapsed });
  }
}));
