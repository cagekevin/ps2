/**
 * 【范本】feature 页面结构（同时是诊断页，路由 /debug）
 * 新增页面必须照此结构：
 * - UI 只用 components/ui，不自己写按钮/输入框样式
 * - 状态：页面内 useState，跨页面共享用 store 选择器
 * - 异步：useRunCommand() 包裹（转不转圈用 `spin`），错误提示与留痕由它负责
 * - 请求：request('endpointKey')，类型自动推导，不写泛型
 * - effect 内异步必须带取消标志
 * - 样式只用 Token
 *
 * 骨架分三层，新区块只许挂在第三层的 `__body` 里：
 *   1. `__status`   当前对象（图层），一眼看到排障起点
 *   2. `__actions`  本页能做的动作，横向按 `mm-u-row` 铺满
 *   3. `__body`     内容区，纵向 `flex` + 可滚动；每块是 `__panel`
 *      （`__panel-head` 标题 + 行尾操作，`__rows` 逐行两端对齐）
 * 日志面板带 `--grow`：吃掉剩余高度、日志体自己滚，不带着上面两块一起滚。
 *
 * 诊断行的标签只有一份（`diagRows` / `configRows`），页面渲染与「复制」的纯文本
 * 都取这两份 —— 不各写一套标签，否则复制出来的东西和屏幕上看到的会不一样。
 */

import { useState, type ReactNode } from 'react';
import { useConfirm } from '../../components/Confirm/useConfirm';
import { useRunCommand } from '../../hooks/useRunCommand';
import { useToast } from '../../components/Toast';
import { Button } from '../../components/ui';
import { copyText } from '../../core/clipboard';
import { request } from '../../core/http/client';
import { clearLogText, readLogText } from '../../core/logger';
import { diagVendor, type VendorDiag } from '../../core/ps/diag';
import { useAppStore } from '../../store/app';
import { LAYER_KIND_LABEL } from '../../types/layer';
import { MSG } from '../../types/messages';
import './HomePage.css';

interface DiagRow {
  label: string;
  value: string;
}

/** 官方 jsx 函数：每个值是 typeof 的结果，'function' 才算可用 */
function diagRows(diag: VendorDiag): DiagRow[] {
  return [
    { label: MSG.home.fnDispatch, value: diag.dispatch },
    { label: MSG.home.fnUseStyleColor, value: diag.useStyleColor },
    { label: MSG.home.fnUseGradient, value: diag.useGradient },
    { label: MSG.home.fnBtnUseStyle, value: diag.btnUseStyle },
    { label: MSG.home.fnSetForegroundColor, value: diag.setForegroundColor },
    { label: MSG.home.fnUseShapeFill, value: diag.useShapeFill },
    { label: MSG.home.fnCallAction, value: diag.callAction },
    { label: MSG.home.fnGetActionList, value: diag.getActionList }
  ];
}

/** 官方配置依赖：值只有 true / false 两种，缺了就是 false */
function configRows(diag: VendorDiag): DiagRow[] {
  return [
    { label: MSG.home.cfgSet, value: String(diag.configSet) },
    { label: MSG.home.cfgInterface, value: String(diag.configInterface) },
    { label: MSG.home.cfgAutoFillColor, value: String(diag.autoFillColor) }
  ];
}

function formatDiag(diag: VendorDiag): string {
  const section = (title: string, rows: DiagRow[]): string =>
    [title, ...rows.map((row) => `${row.label}    ${row.value}`), ''].join('\n');
  return (
    section(MSG.home.sectionVendorFns, diagRows(diag)) +
    section(MSG.home.sectionVendorConfig, configRows(diag))
  );
}

/** 值不是 function / true / false 就标出来：那是「函数没加载」或「读到了别的类型」 */
function DiagRowView({ label, value }: DiagRow) {
  const bad = value !== 'function' && value !== 'true' && value !== 'false';
  return (
    <div className={`mm-u-row mm-home__row${bad ? ' mm-home__row--bad' : ''}`}>
      <span className="mm-home__key">{label}</span>
      <span className="mm-home__value">{value}</span>
    </div>
  );
}

function PanelHead({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="mm-u-row mm-home__panel-head">
      <span className="mm-home__panel-title">{title}</span>
      {actions ? <span className="mm-u-row mm-home__panel-actions">{actions}</span> : null}
    </div>
  );
}

export default function HomePage() {
  const toast = useToast();
  /* 命令统一走 `run`：转不转圈由调用点决定，失败留痕由 hook 负责 */
  const run = useRunCommand();
  const confirm = useConfirm();
  /* 当前图层由 app/layer-watcher 统一写入，页面只读 */
  const layerKind = useAppStore((state) => state.layerKind);
  const layerName = useAppStore((state) => state.layerName);
  const [diag, setDiag] = useState<VendorDiag | null>(null);
  const [logText, setLogText] = useState('');

  async function handlePing() {
    /* 诊断页要转圈（等接口），失败留痕由 hook 出 */
    await run(() => request('productList'), { success: MSG.home.reachable });
  }

  async function handleDiag() {
    const result = await run(() => diagVendor());
    if (result.status === 'ok') setDiag(result.value);
  }

  function handleLog() {
    const text = readLogText();
    setLogText(text || MSG.home.emptyLog);
  }

  async function handleClearLog() {
    const agreed = await confirm({
      title: MSG.home.clearTitle,
      message: MSG.home.clearMessage,
      confirmText: MSG.home.clearConfirm
    });
    if (!agreed) return;

    /* 同步命令也走统一入口：失败留痕与成功文案都由 hook 出 */
    const result = await run(async () => clearLogText(), { spin: false, success: MSG.home.cleared });
    if (result.status === 'error') return;
    /* 清完留在原地显示空态：整块消失会让人以为按钮点错了 */
    setLogText(MSG.home.emptyLog);
  }

  async function handleCopy(text: string, success: string) {
    if (!text) {
      toast.error(MSG.home.nothingToCopy);
      return;
    }
    await run(() => copyText(text), { spin: false, success });
  }

  const layerText = layerKind
    ? `${LAYER_KIND_LABEL[layerKind]}${layerName ? `「${layerName}」` : ''}`
    : MSG.home.layerEmpty;

  const copyButton = (text: string, success: string) => (
    <button type="button" className="mm-btn mm-home__link" onClick={() => void handleCopy(text, success)}>
      {MSG.home.copy}
    </button>
  );

  return (
    <section className="mm-home">
      <div className="mm-u-row mm-home__status">
        <span className="mm-home__key">{MSG.home.layerLabel}</span>
        <span className="mm-home__value">{layerText}</span>
      </div>

      <div className="mm-u-row mm-home__actions">
        <Button onClick={handleDiag}>{MSG.home.diagVendor}</Button>
        <Button onClick={handleLog}>{MSG.home.viewLog}</Button>
        <Button variant="primary" onClick={handlePing}>
          {MSG.home.testApi}
        </Button>
      </div>

      <div className="mm-home__body">
        {diag ? (
          <>
            <div className="mm-home__panel">
              <PanelHead
                title={MSG.home.sectionVendorFns}
                actions={copyButton(formatDiag(diag), MSG.home.copiedDiag)}
              />
              <div className="mm-home__rows">
                {diagRows(diag).map((row) => (
                  <DiagRowView key={row.label} label={row.label} value={row.value} />
                ))}
              </div>
            </div>

            <div className="mm-home__panel">
              <PanelHead title={MSG.home.sectionVendorConfig} />
              <div className="mm-home__rows">
                {configRows(diag).map((row) => (
                  <DiagRowView key={row.label} label={row.label} value={row.value} />
                ))}
              </div>
            </div>
          </>
        ) : null}

        {logText ? (
          <div className="mm-home__panel mm-home__panel--grow">
            <PanelHead
              title={MSG.home.sectionLog}
              actions={
                <>
                  {copyButton(logText, MSG.home.copiedLog)}
                  <button type="button" className="mm-btn mm-home__link" onClick={handleLog}>
                    {MSG.home.refresh}
                  </button>
                  <button
                    type="button"
                    className="mm-btn mm-home__link"
                    onClick={() => void handleClearLog()}
                  >
                    {MSG.home.clear}
                  </button>
                </>
              }
            />
            <div className="mm-home__log-body">{logText}</div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
