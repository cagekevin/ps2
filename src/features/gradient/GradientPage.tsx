/**
 * 渐变面板（`/gradient`）：两个颜色 + 过渡方式 → 算出中间色标 → 写成 PS 渐变。
 *
 * 一句话链路：`domain/gradient.sampleStops` 算色标 → `domain/image-color.createGradientItem`
 * 变成 PS 认的载荷 → `commands/style` 应用 / 入库。**本页不碰 jsx、不写文件、不判空**。
 *
 * 三处刻意的取舍（改之前先读 `docs/plan/24-渐变面板-2026-11-14.md`）：
 * 1. **颜色只由色环拖点决定**。起始色初值取 PS 前景色，结束色是它的反色 —— vendor 没有
 *    「读背景色」的函数，不为一个初值开能力表行。
 * 2. **不开放角度 / 形状 / 反转**。普通图层的 `Style_setGradient` 把这三个字段写死
 *    （`vendor.jsx:6079-6083`），给了控件就是「提示成功但没效果」。
 * 3. **预览按「精度」渲染**，不是按固定采样数。PS 只在色标之间做直线插值，
 *    预览与烘焙必须是同一份数据，用户才看得出 4 与 32 的差别（4 会硬，2 会退化成直线）。
 *
 * 应用走调度通道，**返回值恒为 1，判不了成败**（`CONVENTIONS` §4.7）：toast 说的是
 * 「已应用到图层」而不是「成功」，真失败只有 PS 侧弹窗（`TD-01-32`，与样式页同一姿态）。
 */

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Button, Input } from '../../components/ui';
import { MessageBar, mergeMessages } from '../../components/MessageBar';
import { Segment, type SegmentOption } from '../../components/Segment';
import type { SelectBoxOption } from '../../components/SelectBox';
import { useReportFailure, useRunCommand } from '../../hooks/useRunCommand';
import { useStyleLibraryStore } from '../../store/style-library';
import { useAppStore } from '../../store/app';
import { addGradientToGroup, applyGradientToLayer, readForegroundHex } from '../../commands/style';
import { createGradientItem } from '../../domain/image-color';
import { partnerOf, sampleStops, type GradientRoute } from '../../domain/gradient';
import { MSG } from '../../types/messages';
import { ColorWheel } from './components/ColorWheel';
import { LightnessBar } from './components/LightnessBar';
import { SaveDialog } from './components/SaveDialog';
import './GradientPage.css';

/** 三档过渡方式：名字与网站一致（用户认的就是这三个词） */
const ROUTES: SegmentOption<GradientRoute>[] = [
  { value: 'direct', label: '直接过渡', title: '红绿蓝直接混合，就是 PS 自己会做的事' },
  { value: 'short', label: '短路线', title: '沿色相较近的一侧过渡' },
  { value: 'long', label: '长路线', title: '绕另一侧，经过更多颜色' }
];

/** 精度上下限：**含两端**。低于 4 只剩几段直线，路线等于白选；2 更是退化成两端直连 */
const MIN_STOPS = 4;
const MAX_STOPS = 32;
const DEFAULT_STOPS = 8;

/** 读不到 PS 前景色时的初值：粉彩对，两个点在色环中段，第一次上手就拖得动 */
const FALLBACK_FIRST = '#9383CA';

export default function GradientPage() {
  const run = useRunCommand();
  const reportFailure = useReportFailure();

  const layerKind = useAppStore((state) => state.layerKind);
  const libraries = useStyleLibraryStore((state) => state.libraries);
  const warehouses = useStyleLibraryStore((state) => state.warehouses);
  const activeIndex = useStyleLibraryStore((state) => state.activeIndex);
  const loadLibrary = useStyleLibraryStore((state) => state.load);

  const [first, setFirst] = useState(FALLBACK_FIRST);
  const [second, setSecond] = useState(() => partnerOf(FALLBACK_FIRST));
  const [route, setRoute] = useState<GradientRoute>('short');
  const [count, setCount] = useState(DEFAULT_STOPS);
  /* 输入框的草稿值：逐键夹值会吃掉合法输入的中间态（打「1」就被抬到 4，再打「6」成了 46 再夹到 32） */
  const [countDraft, setCountDraft] = useState(String(DEFAULT_STOPS));
  /* 明度条控制哪个端点：拖环上哪个点就切到哪个 */
  const [active, setActive] = useState<0 | 1>(0);
  const [reading, setReading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* 起始色取 PS 前景色；读不到就留默认值，并把原因交给 toast（读路径失败不静默） */
  useEffect(() => {
    let cancelled = false;
    void readForegroundHex().then((result) => {
      if (cancelled) return;
      if (result.status === 'error') {
        /* 没开文档是前提不满足（换一下就好），不该在打开面板时弹一条错误；其余失败照常提示 */
        reportFailure(result, { quiet: ['PS_NO_DOC'] });
        return;
      }
      setFirst(result.value);
      setSecond(partnerOf(result.value));
    });
    return () => {
      cancelled = true;
    };
  }, [reportFailure]);

  /* 进页读一次渐变库：保存要给分组下拉，没读过就是空表 */
  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  const stops = useMemo(() => sampleStops(first, second, route, count), [first, second, route, count]);

  /* 预览与烘焙是同一份色标。`--mm-swatch` 是 `STYLE` §14.1 允许的运行时值通道 */
  const preview = useMemo(
    () =>
      `linear-gradient(90deg, ${stops
        .map((hex, index) => `${hex} ${((index / (stops.length - 1)) * 100).toFixed(2)}%`)
        .join(', ')})`,
    [stops]
  );

  const groups: SelectBoxOption[] = useMemo(
    () =>
      (libraries.gradient ?? []).map((group, index) => ({
        value: String(index),
        label: group.name || `分组 ${index + 1}`
      })),
    [libraries.gradient]
  );

  /* 必须取**活动仓库**：分组下标来自 `libraries.gradient`，那也是活动仓库的分组。
     写 warehouses[0] 会把分组写到另一个仓库文件里 —— index 是仓库内的，跨仓库没有意义 */
  const warehouse = warehouses[activeIndex];
  const hasLayer = layerKind !== null;
  const canSave = warehouse !== undefined && groups.length > 0;

  const message = mergeMessages([
    hasLayer ? null : { kind: 'info', text: MSG.gradient.noLayer },
    canSave ? null : { kind: 'info', text: MSG.gradient.noGroup }
  ]);

  /** 提交精度：夹到 4–32 并回写草稿；认不出的输入还原成当前值，不留一个空框 */
  function commitCount(): void {
    const next = Number(countDraft);
    if (!Number.isFinite(next) || countDraft.trim() === '') {
      setCountDraft(String(count));
      return;
    }
    const clamped = Math.min(MAX_STOPS, Math.max(MIN_STOPS, Math.round(next)));
    setCount(clamped);
    setCountDraft(String(clamped));
  }

  const applyToLayer = (): void => {
    if (!hasLayer) return;
    const item = createGradientItem(MSG.gradient.defaultName, stops);
    void run(() => applyGradientToLayer(item.gradient), { success: MSG.gradient.applied, spin: false });
  };

  const save = async (name: string, groupIndex: number): Promise<void> => {
    if (!warehouse) return;
    const item = createGradientItem(name, stops);
    const result = await run(() => addGradientToGroup(warehouse, groupIndex, item), {
      success: MSG.gradient.saved,
      spin: false
    });
    /* 存成功才关浮层：失败了用户还留在原地，改个名再试比重新打开省事 */
    if (result.status === 'ok') setSaving(false);
  };

  return (
    <div className="mm-gradient">
      <section className="mm-gradient__card">
        <div
          className="mm-gradient__preview"
          style={{ '--mm-swatch': preview } as CSSProperties}
          /* 悬停读数：用 `offsetX` 换算，不读锚点矩形（`CONVENTIONS` §4.8 没有第四个矩形入口） */
          onPointerMove={(event) => {
            const width = event.currentTarget.clientWidth;
            if (width === 0) return;
            const t = Math.min(1, Math.max(0, event.nativeEvent.offsetX / width));
            setReading(stops[Math.round(t * (stops.length - 1))] ?? null);
          }}
          onPointerLeave={() => setReading(null)}
        >
          {reading ? <span className="mm-gradient__reading">{reading}</span> : null}
        </div>
        <div className="mm-u-row mm-gradient__ends">
          <span className="mm-gradient__end">
            <i className="mm-gradient__dot" style={{ '--mm-swatch': first } as CSSProperties} />
            <b className="mm-gradient__end-no">01</b>
            <code className="mm-gradient__hex">{first}</code>
          </span>
          <span className="mm-gradient__end">
            <i className="mm-gradient__dot" style={{ '--mm-swatch': second } as CSSProperties} />
            <b className="mm-gradient__end-no">02</b>
            <code className="mm-gradient__hex">{second}</code>
          </span>
        </div>
      </section>

      <section className="mm-gradient__card mm-gradient__card--wheel">
        <ColorWheel
          model={{ first, second, route, active }}
          onActiveChange={setActive}
          onChange={(index, hex) => {
            if (index === 0) setFirst(hex);
            else setSecond(hex);
          }}
        />
        <LightnessBar
          hex={active === 0 ? first : second}
          onChange={(hex) => {
            if (active === 0) setFirst(hex);
            else setSecond(hex);
          }}
        />
      </section>

      <section className="mm-gradient__card">
        <Segment value={route} options={ROUTES} onChange={setRoute} ariaLabel="过渡方式" />
        <div className="mm-u-row mm-gradient__row">
          <label className="mm-gradient__label" htmlFor="mm-gradient-count">
            色标精度
          </label>
          <Input
            id="mm-gradient-count"
            type="number"
            min={MIN_STOPS}
            max={MAX_STOPS}
            value={countDraft}
            onChange={(event) => setCountDraft(event.target.value)}
            onBlur={commitCount}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              commitCount();
              event.currentTarget.blur();
            }}
          />
        </div>
      </section>

      <div className="mm-gradient__actions">
        <Button variant="primary" disabled={!hasLayer} onClick={applyToLayer}>
          应用到图层
        </Button>
        <Button disabled={!canSave} onClick={() => setSaving(true)}>
          保存到样式
        </Button>
      </div>

      <MessageBar message={message} />

      {saving ? (
        <SaveDialog preview={preview} groups={groups} onSave={save} onClose={() => setSaving(false)} />
      ) : null}
    </div>
  );
}
