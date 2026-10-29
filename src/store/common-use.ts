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
import { toTiles, type CommonUseTile } from '../domain/common-use';
import {
  missingOptionKeys,
  pickCommonUseOptions,
  type CommonUseOptions,
  type CommonUseSettingKey
} from '../domain/common-use-options';
import { readCommonUseFile, readCommonUseOptions } from '../repo/common-use-repo';
import type { Dropped } from '../types/decode-list';
import type { Failure } from '../types/result';

interface CommonUseState {
  tiles: CommonUseTile[];
  /** 文件里认不出而跳过的项（缺 id / 不是对象）；页面必须显示出来，不许只写日志 */
  dropped: Dropped[];
  options: CommonUseOptions;
  /**
   * 文件里**没有**的设置键（用官方默认值补上了，但缺这件事必须看得见）。
   *
   * 以前缺键与「用户选了默认值」在读取侧完全一样（命令层各自 `?? false`），
   * 排查「明明设了却没生效」时分不清是文件没写进去还是读错。原始记录仍在 repo 层。
   */
  missingOptions: CommonUseSettingKey[];
  /**
   * 两个来源各自的失败，`null` = 这一类读成功。
   *
   * 存 `Result` 而不是一句字符串：失败提示要交给 `StateHint`，由**码**决定说什么、
   * 要不要给重试（`IO_ERROR` 才给）——存成字符串就只能自己拼文案，等于第二套提示。
   */
  reasons: { tiles: Failure | null; options: Failure | null };
  /** 只读 repo + prefs，不写任何文件 */
  load: () => void;
  /**
   * 「开启智能参考线」开关（界面开关，**不落盘**）。
   *
   * 原版是组件本地 state，所以这里也不进 `sj_set.json`。放 store 是因为
   * `app/common-use-watcher` 要按它订阅 / 退订事件——开关留在面板里，watcher 就看不到。
   */
  guideOn: boolean;
  setGuideOn: (on: boolean) => void;
}

export const useCommonUseStore = create<CommonUseState>()((set, get) => ({
  /* 首屏按官方种子渲染，避免「文件还没读到就先白一下」 */
  tiles: toTiles(null),
  dropped: [],
  options: pickCommonUseOptions({}),
  missingOptions: [],
  reasons: { tiles: null, options: null },
  guideOn: false,

  load() {
    const previous = get();
    const file = readCommonUseFile();
    const options = readCommonUseOptions();
    /* 只在读成功时算：读失败时「缺键」没有意义（整份都没读到） */
    const missing = options.status === 'ok' ? missingOptionKeys(options.value) : previous.missingOptions;

    set({
      tiles: file.status === 'ok' ? toTiles(file.value.records) : previous.tiles,
      dropped: file.status === 'ok' ? file.value.dropped : [],
      options: options.status === 'ok' ? options.value : previous.options,
      missingOptions: missing,
      reasons: {
        tiles: file.status === 'error' ? file : null,
        options: options.status === 'error' ? options : null
      }
    });

    if (file.status === 'error') {
      log.warn('读取常用功能失败', { code: file.code, reason: file.reason });
    } else if (file.value.dropped.length) {
      /* 每条都带上 code / reason / detail：只记 count 与 path 时，看不出「坏在哪个字段」 */
      log.warn('常用功能有项无法识别，已跳过', {
        count: file.value.dropped.length,
        items: file.value.dropped.map((item) => ({
          path: item.path,
          code: item.code,
          reason: item.reason,
          detail: item.detail
        }))
      });
    }
    if (options.status === 'error') {
      log.warn('读取常用页设置失败', { code: options.code, reason: options.reason });
    } else if (missing.length) {
      log.warn('常用页设置有键缺失，已用官方默认值', { missing });
    }
  },

  setGuideOn(guideOn) {
    set({ guideOn });
  }
}));
