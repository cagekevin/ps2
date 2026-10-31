/**
 * 字面板的动作与交互状态
 *
 * 页面只做组装：配置从 `store/font-set` 读，文字属性从 `store/text` 读，写入走 `commands/font-set`。
 *
 * 三条约定：
 *   1. 设置**先本地生效再落盘**（界面不等 IO）；落盘失败只提示，不回滚输入——回滚会让
 *      用户看到自己刚点的档位跳回去，而文件里到底哪份是旧的说不清
 *   2. 命令失败一律 `toast.error(reason)`；成功只有计划 §4.1 定过文案的动作才提示，
 *      没定文案的（对齐 / 拆分 / 分布 / 快选 / 层级）成功时静默
 *   3. PS 写成功才 `patch` 本地属性：失败还改面板，用户会以为已经生效
 *
 * 翻译按钮 v1 始终禁用（方案未定），本 hook 不提供翻译动作。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../../components/Toast';
import { MSG } from '../../types/messages';
import { useRunCommand } from '../../hooks/useRunCommand';
import { align as alignCommand } from '../../commands/font-set';
import {
  applyFontName,
  copyFont,
  createButton,
  distribute as distributeCommand,
  hierarchyPreset,
  pasteFont,
  pickColor,
  quickFont,
  saveSettings,
  setFontSize,
  setHierarchySize,
  setLeading,
  setStyle,
  setTracking,
  split as splitCommand,
  switchDirection,
  textAlign
} from '../../commands/font-set';
import type { AlignAxis } from '../../commands/font-set';
import { loadFontList } from '../../commands/font';
import type { FontItem } from '../../domain/font-item';
import type { CreateButtonConfig, FontSetSettings, PasteFontConfig } from '../../domain/font-set';
import type { QuickFont } from '../../domain/quick-font';
import { useAppStore } from '../../store/app';
import { useFontSetStore } from '../../store/font-set';
import { useTextStore } from '../../store/text';
import type { Result } from '../../types/result';

interface Distribution {
  /** 1 垂直分布元素 / 2 水平分布元素 */
  axis: 1 | 2;
  title: string;
}

export function useFontPanel() {
  const toast = useToast();
  /* 本地那个 `run` 把它折成 `boolean`；提示与留痕都在这一个出口 */
  const runCommand = useRunCommand();

  const settings = useFontSetStore((state) => state.settings);
  const quickFonts = useFontSetStore((state) => state.quickFonts);
  const hierarchy = useFontSetStore((state) => state.hierarchy);
  const loadFontSet = useFontSetStore((state) => state.load);
  const setLocalSettings = useFontSetStore((state) => state.setLocalSettings);

  const info = useTextStore((state) => state.info);
  /*
   * 订阅 `failure`：文字属性读失败时 `info` 保留旧值（否则面板会闪成默认值），
   * 页面必须把这条失败显示出来，否则用户看到的是**上一次的属性当当前值**。
   * 注意：`refresh()` 是直接调用的（`:94` `void refreshText()`），**不走 `run`**，
   * 所以「只走 toast」不成立 —— 那条路没有 toast。
   */
  const textFailure = useTextStore((state) => state.failure);
  const refreshText = useTextStore((state) => state.refresh);
  const patchText = useTextStore((state) => state.patch);

  const layerKind = useAppStore((state) => state.layerKind);
  const layerName = useAppStore((state) => state.layerName);

  const [distribution, setDistribution] = useState<Distribution | null>(null);
  const [fonts, setFonts] = useState<FontItem[]>([]);
  const [fontsLoading, setFontsLoading] = useState(true);

  const aliveRef = useRef(true);

  /**
   * 文字属性跟着活动图层走（原版靠 PS 选区事件调 `selectLayer`）。
   *
   * 少了这一步，在非文字图层上进面板会一直挂着「当前图层不是文字图层」，
   * 用户换成文字图层也不会自己回来——那句话就成了假话。
   * 进页面时 `lastLayerKey` 是空串，等于无条件读一次。
   */
  const layerKey = `${layerKind ?? ''}|${layerName}`;
  const lastLayerKey = useRef('');
  useEffect(() => {
    if (lastLayerKey.current === layerKey) return;
    lastLayerKey.current = layerKey;
    void refreshText();
  }, [layerKey, refreshText]);

  /* 进页面：设置 / 快选 / 层级 / 最近字体读一次，字体列表读一次（文字属性见上）。
     字体列表可能触发 jsx 扫描（首次），不阻塞其余区块渲染。 */
  useEffect(() => {
    aliveRef.current = true;
    loadFontSet();

    setFontsLoading(true);
    void runCommand(() => loadFontList(), { spin: false }).then((result) => {
      if (!aliveRef.current) return;
      setFontsLoading(false);
      setFonts(result.status === 'ok' ? result.value.fonts : []);
    });

    return () => {
      aliveRef.current = false;
    };
  }, [loadFontSet, runCommand, toast]);

  /**
   * 统一的失败出口：**实现委托给 `runCommand`**，这里只把 `Result` 折成 `boolean`。
   *
   * 20 多处调用点靠这个 `boolean` 决定「要不要继续往下走」，签名不动；
   * 提示与留痕（`log.warn(code, detail)`）全在 `runCommand` 里，本函数不再自己弹 toast。
   */
  const run = useCallback(
    async (task: () => Promise<Result<unknown>>, successText?: string): Promise<boolean> => {
      const result = await runCommand(task, { spin: false, success: successText });
      return result.status === 'ok';
    },
    [runCommand]
  );

  const persist = useCallback(
    (patch: Partial<FontSetSettings>) => {
      setLocalSettings(patch);
      /*
       * 不再自己给提示加「设置未保存：」前缀 —— 那是消费者替生产者下结论。
       * 落盘失败的原因由 `saveSettings` 的 `reason` 给（`core` 只给码时由 `MSG.codeReason` 兜）。
       */
      void runCommand(() => saveSettings(patch), { spin: false });
    },
    [setLocalSettings, runCommand]
  );

  /* ---------- 顶部：拆分 / 生成按钮 / 复制 / 粘贴 / 方向 ---------- */

  const onSplit = useCallback(
    (mode: 1 | 2 | 3 | 4) => {
      void run(() => splitCommand(mode));
    },
    [run]
  );

  const onApplyCreateButton = useCallback(() => {
    void run(() => createButton(settings.ztCreateButton), '生成按钮');
  }, [run, settings.ztCreateButton]);

  const onCopyFont = useCallback(() => {
    void run(() => copyFont(), '复制成功');
  }, [run]);

  /* 字体应用秒级内：本地 run 已 spin:false，不再包 loading.run（那个才会弹全屏遮罩） */
  const onPasteFont = useCallback(() => {
    void run(() => pasteFont(settings.ztPasteFont), '应用字体设置').then((applied) => {
      if (applied) void refreshText();
    });
  }, [run, settings.ztPasteFont, refreshText]);

  const onSwitchDirection = useCallback(() => {
    void run(() => switchDirection(), '切换文本方向');
  }, [run]);

  /* ---------- 底部：对齐 / 分布 ---------- */

  const onAlign = useCallback(
    (axis: AlignAxis, index?: number) => {
      void run(() => alignCommand(axis, index));
    },
    [run]
  );

  const openDistribution = useCallback((axis: 1 | 2, title: string) => {
    setDistribution({ axis, title });
  }, []);

  const closeDistribution = useCallback(() => {
    setDistribution(null);
  }, []);

  const onDistribute = useCallback(
    (value: string) => {
      if (!distribution) return;
      void run(() => distributeCommand(distribution.axis, value, settings.ztDistributionFilter));
    },
    [distribution, run, settings.ztDistributionFilter]
  );

  const onPinDistribution = useCallback(
    (value: boolean) => {
      persist({ ztDistributedIsFixed: value });
    },
    [persist]
  );

  /* ---------- 设置面板里的局部改动 ---------- */

  const onChangePasteFont = useCallback(
    (patch: Partial<PasteFontConfig>) => {
      persist({ ztPasteFont: { ...settings.ztPasteFont, ...patch } });
    },
    [persist, settings.ztPasteFont]
  );

  const onResetPasteFont = useCallback(() => {
    persist({
      ztPasteFont: {
        scriptFamily: true,
        color: true,
        opacity: true,
        size: true,
        leading: true,
        tracking: true
      }
    });
  }, [persist]);

  const onChangeCreateButton = useCallback(
    (patch: Partial<CreateButtonConfig>) => {
      persist({ ztCreateButton: { ...settings.ztCreateButton, ...patch } });
    },
    [persist, settings.ztCreateButton]
  );

  /* ---------- 字体快选 ---------- */

  const currentQuickFont: QuickFont | null = quickFonts.list[quickFonts.index] ?? null;

  const onQuickSelect = useCallback(
    (index: number) => {
      void run(() => quickFont({ action: 'select', index })).then((done) => {
        if (done) loadFontSet();
      });
    },
    [run, loadFontSet]
  );

  const onQuickApply = useCallback(
    (weightIndex: number) => {
      if (!currentQuickFont) return;
      void run(() => quickFont({ action: 'apply', font: currentQuickFont, weightIndex })).then(
        (done) => {
          if (done) void refreshText();
        }
      );
    },
    [run, currentQuickFont, refreshText]
  );

  const onQuickAdd = useCallback(() => {
    void run(() => quickFont({ action: 'add' })).then((done) => {
      if (done) loadFontSet();
    });
  }, [run, loadFontSet]);

  const onQuickRemove = useCallback(
    (index: number) => {
      void run(() => quickFont({ action: 'delete', index })).then((done) => {
        if (done) loadFontSet();
      });
    },
    [run, loadFontSet]
  );

  /* ---------- 层级字号 ---------- */

  const onApplyLevel = useCallback(
    (value: number) => {
      void run(() => setHierarchySize(value)).then((done) => {
        if (done) patchText({ size: String(value) });
      });
    },
    [run, patchText]
  );

  const onUpdateLevels = useCallback(
    (levels: number[]) => {
      persist({ ztHierarych: levels });
    },
    [persist]
  );

  const onSelectPreset = useCallback(
    (index: number) => {
      const preset = hierarchy.list[index];
      if (!preset) return;

      persist({ ztHierarych: [...preset.data] });
      void run(() => hierarchyPreset({ action: 'select', index })).then((done) => {
        if (done) loadFontSet();
      });
    },
    [hierarchy.list, persist, run, loadFontSet]
  );

  const onSavePreset = useCallback(
    (levels: number[]) => {
      persist({ ztHierarych: levels });
      void run(() => hierarchyPreset({ action: 'save', levels }), '更新成功').then((done) => {
        if (done) loadFontSet();
      });
    },
    [persist, run, loadFontSet]
  );

  const onCreatePreset = useCallback(
    (name: string, levels: number[]) => {
      persist({ ztHierarych: levels });
      void run(() => hierarchyPreset({ action: 'create', name, levels }), '添加成功').then(
        (done) => {
          if (done) loadFontSet();
        }
      );
    },
    [persist, run, loadFontSet]
  );

  const onRenamePreset = useCallback(
    (index: number, name: string) => {
      void run(() => hierarchyPreset({ action: 'rename', index, name }), '重命名成功').then(
        (done) => {
          if (done) loadFontSet();
        }
      );
    },
    [run, loadFontSet]
  );

  const onDeletePreset = useCallback(
    (index: number) => {
      void run(() => hierarchyPreset({ action: 'delete', index }), '删除成功').then((done) => {
        if (done) loadFontSet();
      });
    },
    [run, loadFontSet]
  );

  /* ---------- 属性面板 ---------- */

  const onFontName = useCallback(
    (input: { postScriptName: string; name: string; weight: string; family: string }) => {
      void run(() => applyFontName(input)).then((done) => {
        if (done) void refreshText();
      });
    },
    [run, refreshText]
  );

  const onSize = useCallback(
    (value: number) => {
      void run(() => setFontSize(value)).then((done) => {
        if (done) patchText({ size: String(value) });
      });
    },
    [run, patchText]
  );

  const onLeading = useCallback(
    (value: number) => {
      void run(() => setLeading(value)).then((done) => {
        /* 显式设了行距 = 自动行距被取消；不一起改，面板会一直显示「(自动)」 */
        if (done) patchText({ leading: value, useAutoLeading: false });
      });
    },
    [run, patchText]
  );

  const onTracking = useCallback(
    (value: number) => {
      void run(() => setTracking(value)).then((done) => {
        if (done) patchText({ tracking: value });
      });
    },
    [run, patchText]
  );

  const onColor = useCallback(() => {
    void runCommand(() => pickColor(), { spin: false }).then((result) => {
      if (result.status === 'ok') patchText({ color: result.value });
    });
  }, [runCommand, patchText]);

  const onStyle = useCallback(
    (kind: 'caps' | 'kerning' | 'italic' | 'bold', value: boolean) => {
      void run(() => setStyle(kind, value)).then((done) => {
        if (!done) return;
        if (kind === 'caps') patchText({ capitalization: value ? 'allCaps' : 'Nrml' });
        else if (kind === 'kerning') {
          patchText({ autoKerning: value ? 'opticalKern' : 'manual' });
        } else if (kind === 'italic') patchText({ fauxItalic: value });
        else patchText({ fauxBold: value });
      });
    },
    [run, patchText]
  );

  const onTextAlign = useCallback(
    (input: { index: number; shift: boolean; paragraph: boolean }) => {
      void run(() =>
        textAlign(input.index, { paragraph: input.paragraph, shift: input.shift })
      ).then((done) => {
        if (!done) return;
        /* 段落对齐与点对齐共用这三个图标；段落对齐时不改 justification 的图标态 */
        if (!input.paragraph) {
          patchText({
            justification: input.index === 0 ? 'left' : input.index === 1 ? 'center' : 'right'
          });
        }
      });
    },
    [run, patchText]
  );

  /** Ctrl+点击：自由面板 v1 不上线，只提示，不写任何文件 */
  const onCtrlClick = useCallback(() => {
    toast.info(MSG.freePanelOffline);
  }, [toast]);

  return {
    settings,
    distribution,
    textFailure,
    refreshText,
    fonts,
    fontsLoading,
    info,
    quickFonts,
    hierarchy,
    currentQuickFont,
    persist,
    onSplit,
    onApplyCreateButton,
    onCopyFont,
    onPasteFont,
    onSwitchDirection,
    onAlign,
    openDistribution,
    closeDistribution,
    onDistribute,
    onPinDistribution,
    onChangePasteFont,
    onResetPasteFont,
    onChangeCreateButton,
    onQuickSelect,
    onQuickApply,
    onQuickAdd,
    onQuickRemove,
    onApplyLevel,
    onUpdateLevels,
    onSelectPreset,
    onSavePreset,
    onCreatePreset,
    onRenamePreset,
    onDeletePreset,
    onFontName,
    onSize,
    onLeading,
    onTracking,
    onColor,
    onStyle,
    onTextAlign,
    onCtrlClick
  };
}
