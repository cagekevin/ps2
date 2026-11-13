/**
 * 超分页（`/dlss`）：整个画幅的可见合成 → DLSS 神经渲染 → 结果层 / 新文档。
 *
 * **超分作用于整个画幅，与选中哪个图层无关**；页面不读图层状态。
 *
 * 【分组按决策顺序，不按控件形态】放大倍率（结果会怎样）→ 参数（怎么微调）；
 * 说明紧贴它解释的控件，不放页尾脚注。
 *
 * 【状态常驻】底部信息行显示「就绪 / 自检中 / 驱动过旧」+ 环境信息；
 * 只有真的跑不了（无 RTX）才整页不可用；驱动低于引擎要求只禁用「处理画幅」并写明要升级到哪一版。
 * 自检实测 4.4 秒，
 * 结果在 `core/dlss/engine` 按目录缓存，本会话第二次进页秒开。
 *
 * 外部动作一律走 `commands/dlss`，不碰 `evalScript` / fs / prefs。
 */

import { useEffect, useState } from 'react';
import { CheckBox } from '../../components/CheckBox';
import { SelectBox, type SelectBoxOption } from '../../components/SelectBox';
import { Slider } from '../../components/Slider';
import { Button, Input } from '../../components/ui';
import { useRunCommand } from '../../hooks/useRunCommand';
import { useToast } from '../../hooks/useToast';
import { chooseRuntime, resolveEngine, runDlss, verifyEngine } from '../../commands/dlss';
import { driverShortfall } from '../../domain/dlss-driver';
import { DLSS_BUILTIN } from '../../domain/dlss-token';
import type { DlssEngineInfo, DlssLook, DlssParams, DlssSrPreset } from '../../types/dlss';
import { MSG } from '../../types/messages';
import './DlssPage.css';

const STYLE_OPTIONS: SelectBoxOption[] = [
  { value: '0', label: '标准' },
  { value: '1', label: '自然' },
  { value: '2', label: '电影感' }
];

const SR_OPTIONS: SelectBoxOption[] = [
  { value: 'default', label: '默认（驱动选择）' },
  { value: 'E', label: 'E · CNN 平滑' },
  { value: 'F', label: 'F · CNN 平滑' },
  { value: 'J', label: 'J · transformer' },
  { value: 'K', label: 'K · transformer 锐' },
  { value: 'L', label: 'L · transformer 锐' },
  { value: 'M', label: 'M · transformer 最新' }
];

/** 五档：5 档超过 `Segment` 的 4 档上限，走等宽按钮排，选中项用 `primary` */
const SCALES = [
  { value: '1', label: '1×' },
  { value: '1.5', label: '1.5×' },
  { value: '2', label: '2×' },
  { value: '3', label: '3×' },
  { value: '4', label: '4×' }
] as const;

/** 六个连续参数：标签照原版，别缩写（用户认的就是这几个词） */
const SLIDERS = [
  { key: 'i', label: 'NR 强度', min: 0, max: 2 },
  { key: 'd', label: '细节保留', min: 0, max: 2 },
  /* 色彩采用的上限是 1，不是 2（默认参数契约见 `docs/plan/23` §7）——六个滑杆里只有它不同 */
  { key: 'c', label: '色彩采用', min: 0, max: 1 },
  { key: 'ls', label: '局部结构', min: 0, max: 2 },
  { key: 'lt', label: '局部色调', min: 0, max: 2 },
  { key: 'sk', label: '皮肤处理', min: -1, max: 2 }
] as const;

type SliderKey = (typeof SLIDERS)[number]['key'];

interface Draft extends Record<SliderKey, number> {
  st: 0 | 1 | 2;
  sr: DlssSrPreset;
  am: boolean;
  ui: boolean;
  scale: string;
  useWidth: boolean;
  width: string;
}

type EngineState =
  | { kind: 'checking' }
  | { kind: 'ready'; dir: string; probing: boolean; info: DlssEngineInfo | null }
  | { kind: 'no-engine'; tried: string[] }
  /** reason 直接取生产者给的那一句：超时 / 无 Node / 无 RTX 各不相同，页面不再自己造句 */
  | { kind: 'failed'; reason: string; detail: string };

function toNumber(text: string): number {
  const value = Number(text);
  return Number.isFinite(value) ? value : 0;
}

function isSrPreset(value: string): value is DlssSrPreset {
  return value === 'default' || ['E', 'F', 'J', 'K', 'L', 'M'].includes(value);
}

/** 下拉值 → 风格档位：查表收窄，不用 `as`（值是下拉给的，不是可信联合） */
const STYLE_OF: Record<string, 0 | 1 | 2> = { '0': 0, '1': 1, '2': 2 };

function draftOf(look: DlssLook): Draft {
  return {
    i: look.i,
    d: look.d,
    c: look.c,
    ls: look.ls,
    lt: look.lt,
    sk: look.sk,
    st: look.st,
    sr: look.sr,
    am: look.am === 1,
    ui: look.ui === 1,
    /* 初始倍率 1×：第一次处理是原位新层，不另开文档（默认参数见 `docs/plan/23` §7） */
    scale: '1',
    useWidth: false,
    /* 勾上「指定宽度」即带出 1920（同上） */
    width: '1920'
  };
}

/** 勾了「指定输出宽度」且填了合法值才走宽度档（与 jsx 的「w 优先」同一判据） */
function buildParams(draft: Draft): DlssParams {
  const look: DlssLook = {
    i: draft.i,
    d: draft.d,
    c: draft.c,
    ls: draft.ls,
    lt: draft.lt,
    sk: draft.sk,
    st: draft.st,
    sr: draft.sr,
    am: draft.am ? 1 : 0,
    ui: draft.ui ? 1 : 0
  };

  const width = toNumber(draft.width);
  if (draft.useWidth && width >= 1) return { ...look, w: width };

  const scale = toNumber(draft.scale);
  return { ...look, sc: scale >= 1 ? scale : 1 };
}

/**
 * 底部信息行：状态 + 环境信息合成一行。
 *
 * 本页**不设页头**（`STYLE` §6：导航上已写着页名，页内再加标题是白占一行），
 * 所以「就绪 / 自检中 / 驱动过旧」也常驻在这一行，而不是另起一条标题栏。
 *
 * 状态词不能只写「就绪」：自检只证明引擎能加载，**证明不了驱动够新**（`domain/dlss-driver`）。
 */
function footerInfo(engine: EngineState, shortfall: string | null): string {
  if (engine.kind !== 'ready') return MSG.dlss.checking;

  const state = engine.probing
    ? MSG.dlss.checking
    : shortfall
      ? `驱动过旧（需 ${shortfall}+）`
      : '就绪';
  const info = engine.info;
  const env = info ? `${info.gpu} · 驱动 ${info.driver} · 引擎 ${info.version}` : null;
  return env ? `${state} · ${env}` : state;
}

export default function DlssPage() {
  const run = useRunCommand();
  const toast = useToast();

  const [engine, setEngine] = useState<EngineState>({ kind: 'checking' });
  const [recheck, setRecheck] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => draftOf(DLSS_BUILTIN.standard));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    /* 同步找目录（毫秒级），不 spawn */
    const found = resolveEngine();
    if (found.status === 'error') {
      setEngine({ kind: 'failed', reason: found.reason, detail: found.detail });
      return;
    }
    if (found.value.state === 'no-engine') {
      setEngine({ kind: 'no-engine', tried: found.value.tried });
      return;
    }

    const dir = found.value.dir;
    setEngine({ kind: 'ready', dir, probing: true, info: null });

    /* 自检在后台跑：首次约 4.4 秒，之后走缓存 */
    void verifyEngine(dir).then((result) => {
      if (cancelled) return;
      setEngine(
        result.status === 'error'
          ? { kind: 'failed', reason: result.reason, detail: result.detail }
          : { kind: 'ready', dir, probing: false, info: result.value }
      );
    });

    return () => {
      cancelled = true;
    };
  }, [recheck]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]): void {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleChooseRuntime(): Promise<void> {
    const picked = await run(() => chooseRuntime(), { spin: false });
    if (picked.status === 'ok' && picked.value) setRecheck((count) => count + 1);
  }

  /**
   * 「环境自检」强制重跑（换显卡 / 装 NGX / 改驱动之后）；
   * 「刷新信息」走缓存，只把环境信息补回来。两者共用同一个命令，不是两套实现。
   * 失败只翻整页不可用态，不再弹 toast 说第二遍。
   */
  async function handleProbe(force: boolean): Promise<void> {
    if (engine.kind !== 'ready') return;

    const dir = engine.dir;
    setEngine({ kind: 'ready', dir, probing: true, info: engine.info });
    const result = await run(() => verifyEngine(dir, force), {
      spin: false,
      /* 自检的失败一律由整页不可用态说一次，不弹 toast 说第二遍（ADR-0003） */
      quiet: ['PS_UNREADY', 'IO_ERROR', 'TIMEOUT']
    });
    setEngine(
      result.status === 'error'
        ? { kind: 'failed', reason: result.reason, detail: result.detail }
        : { kind: 'ready', dir, probing: false, info: result.value }
    );
  }

  async function handleRun(): Promise<void> {
    if (engine.kind !== 'ready' || engine.probing) return;

    setBusy(true);
    const result = await run(() => runDlss(buildParams(draft), engine.dir), {
      tip: MSG.dlss.running
    });
    setBusy(false);
    if (result.status === 'error') return;

    const placed = result.value;
    toast.info(
      placed.mode === 'document'
        ? `${MSG.dlss.doneDocument} ${placed.width}×${placed.height}`
        : `${MSG.dlss.done} ${placed.width}×${placed.height}`
    );
  }

  const blocked = engine.kind === 'no-engine' || engine.kind === 'failed';

  /* 自检通过 ≠ 能跑：驱动低于引擎要求时引擎进程会直接退出，提前算出来当按钮的禁用依据 */
  const shortfall =
    engine.kind === 'ready' && engine.info ? driverShortfall(engine.info) : null;

  const width = toNumber(draft.width);
  const widthInvalid = draft.useWidth && width < 1;
  const canRun =
    engine.kind === 'ready' && !engine.probing && !busy && !widthInvalid && !shortfall;

  return (
    <div className="mm-dlss">
      {blocked ? (
        <div className="mm-dlss__blocked">
          <div className="mm-dlss__blocked-title">
            {engine.kind === 'no-engine'
              ? MSG.dlss.noEngine
              : engine.kind === 'failed'
                ? engine.reason
                : MSG.dlss.probeFailed}
          </div>
          {engine.kind === 'no-engine' ? (
            <div className="mm-dlss__hint" title={engine.tried.join(' | ')}>
              可手动指定 runtime 目录
            </div>
          ) : (
            <div className="mm-dlss__hint">
              当前机器未通过引擎自检
              {engine.kind === 'failed' && engine.detail ? (
                <span className="mm-dlss__blocked-detail">（{engine.detail}）</span>
              ) : null}
            </div>
          )}
          {engine.kind === 'no-engine' ? (
            <Button variant="primary" onClick={() => void handleChooseRuntime()}>
              指定引擎路径
            </Button>
          ) : null}
          <Button onClick={() => setRecheck((count) => count + 1)}>重新检测</Button>
        </div>
      ) : (
        <>
          <div className="mm-dlss__body">
            {/* ① 结果多大 / 落到哪（说明紧贴它解释的控件） */}
            <section className="mm-dlss__group">
              <div className="mm-dlss__group-title">放大倍率</div>
              <div className="mm-btn-grid mm-dlss__scales">
                {SCALES.map((scale) => (
                  <Button
                    key={scale.value}
                    variant={draft.scale === scale.value ? 'primary' : undefined}
                    disabled={draft.useWidth}
                    onClick={() => update('scale', scale.value)}
                  >
                    {scale.label}
                  </Button>
                ))}
              </div>
              <div className="mm-u-row mm-dlss__row">
                <CheckBox
                  label="指定输出宽度"
                  checked={draft.useWidth}
                  onChange={(checked) => update('useWidth', checked)}
                />
                <Input
                  type="number"
                  min={64}
                  max={16384}
                  step={2}
                  className="mm-dlss__width-input"
                  disabled={!draft.useWidth}
                  value={draft.width}
                  onChange={(event) => update('width', event.target.value)}
                />
              </div>
              <div className="mm-dlss__hint">1× 原位新层；放大档另开文档</div>
            </section>

            {/* ② 怎么微调 */}
            <section className="mm-dlss__group">
              <div className="mm-dlss__group-title">参数</div>
              <div className="mm-dlss__sliders">
                {SLIDERS.map((slider) => (
                  <Slider
                    key={slider.key}
                    label={slider.label}
                    min={slider.min}
                    max={slider.max}
                    step={0.05}
                    value={draft[slider.key]}
                    onChange={(value) => update(slider.key, value)}
                  />
                ))}
              </div>
              <div className="mm-u-row mm-dlss__row">
                <span className="mm-dlss__row-label">NR 风格</span>
                <SelectBox
                  className="mm-dlss__select"
                  options={STYLE_OPTIONS}
                  value={String(draft.st)}
                  onChange={(value) => {
                    const next = STYLE_OF[value];
                    if (next !== undefined) update('st', next);
                  }}
                />
              </div>
              <div className="mm-u-row mm-dlss__row">
                <span className="mm-dlss__row-label">SR 模型</span>
                <SelectBox
                  className="mm-dlss__select"
                  options={SR_OPTIONS}
                  value={draft.sr}
                  onChange={(value) => {
                    if (isSrPreset(value)) update('sr', value);
                  }}
                />
              </div>
              <div className="mm-dlss__inline">
                <CheckBox
                  label="自动遮罩"
                  title="保护文字 / UI 区域"
                  checked={draft.am}
                  onChange={(checked) => update('am', checked)}
                />
                <CheckBox
                  label="UI 修正"
                  checked={draft.ui}
                  onChange={(checked) => update('ui', checked)}
                />
              </div>
            </section>
          </div>

          <div className="mm-divider" />

          {shortfall && engine.kind === 'ready' && engine.info ? (
            <div className="mm-dlss__hint">
              驱动 {engine.info.driver} 低于引擎 {engine.info.version} 要求的 {shortfall}：现在处理必定失败（引擎直接退出），请先升级显卡驱动。
            </div>
          ) : null}

          <div className="mm-dlss__footer">
            <div className="mm-dlss__info">{footerInfo(engine, shortfall)}</div>
            <Button
              variant="primary"
              className="mm-dlss__run"
              disabled={!canRun}
              title={shortfall ? `驱动需 ${shortfall} 以上` : undefined}
              onClick={() => void handleRun()}
            >
              处理画幅
            </Button>
            <div className="mm-btn-grid mm-dlss__actions">
              <Button
                disabled={engine.kind !== 'ready' || engine.probing}
                onClick={() => void handleProbe(true)}
              >
                环境自检
              </Button>
              <Button
                disabled={engine.kind !== 'ready' || engine.probing}
                onClick={() => void handleProbe(false)}
              >
                刷新信息
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


