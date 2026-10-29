/**
 * 【范本】feature 页面结构（同时是调试页，路由 /debug）
 * 新增页面必须照此结构：
 * - UI 只用 components/ui，不自己写按钮/输入框样式
 * - 状态：页面内 useState，跨页面共享用 store 选择器
 * - 异步：useRunCommand() 包裹（转不转圈用 `spin`），错误提示与留痕由它负责
 * - 请求：request('endpointKey')，类型自动推导，不写泛型
 * - effect 内异步必须带取消标志
 * - 样式只用 Token
 */
import { useState } from 'react';
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

function formatDiag(diag: VendorDiag): string {
  return [
    '官方 jsx 函数',
    `ps_onJsx（调度入口）    ${diag.dispatch}`,
    `ys_useStyleColor       ${diag.useStyleColor}`,
    `ys_useGradient         ${diag.useGradient}`,
    `ps_ysBtnUseStyle       ${diag.btnUseStyle}`,
    `ys_setForegroundColor  ${diag.setForegroundColor}`,
    `ys_useShapeFill        ${diag.useShapeFill}`,
    `dz_callAction          ${diag.callAction}`,
    `dz_getActionList       ${diag.getActionList}`,
    '',
    '官方配置依赖',
    `sj_set.json            ${diag.configSet}`,
    `sj_interfaceSet.ini    ${diag.configInterface}`,
    `cyAutoFillColor        ${String(diag.autoFillColor)}`
  ].join('\n');
}

function DiagRow({ label, value }: { label: string; value: string }) {
  const bad = value !== 'function' && value !== 'true' && value !== 'false';
  return (
    <div className={`mm-u-row mm-home__diag-row${bad ? ' mm-home__diag-row--bad' : ''}`}>
      <span className="mm-home__diag-key">{label}</span>
      <span className="mm-home__diag-value">{value}</span>
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

  async function handleCopy(label: string, text: string) {
    if (!text) {
      toast.error(MSG.home.nothingToCopy);
      return;
    }
    await run(() => copyText(text), { spin: false, success: `已复制${label}` });
  }

  return (
    <section className="mm-home">
      <div className="mm-home__row">
        当前图层：
        {layerKind ? `${LAYER_KIND_LABEL[layerKind]}${layerName ? `「${layerName}」` : ''}` : '—'}
      </div>

      <div className="mm-u-row mm-home__actions">
        <Button onClick={handleDiag}>{'诊断官方能力'}</Button>
        <Button onClick={handleLog}>{'查看日志'}</Button>
        <Button variant="primary" onClick={handlePing}>
          测试接口
        </Button>
      </div>


      {diag ? (
        <div className="mm-home__diag">
          <div className="mm-u-row mm-home__diag-head">
            <span className="mm-home__diag-title">{'官方 jsx 函数'}</span>
            <button
              type="button"
              className="mm-btn mm-home__copy"
              onClick={() => void handleCopy('诊断结果', formatDiag(diag))}
            >
              复制
            </button>
          </div>
          <DiagRow label="ps_onJsx（调度入口）" value={diag.dispatch} />
          <DiagRow label="ys_useStyleColor" value={diag.useStyleColor} />
          <DiagRow label="ys_useGradient" value={diag.useGradient} />
          <DiagRow label="ps_ysBtnUseStyle" value={diag.btnUseStyle} />
          <DiagRow label="ys_setForegroundColor" value={diag.setForegroundColor} />
          <DiagRow label="ys_useShapeFill" value={diag.useShapeFill} />
          <DiagRow label="dz_callAction（动作页）" value={diag.callAction} />
          <DiagRow label="dz_getActionList（动作页）" value={diag.getActionList} />

          <div className="mm-home__diag-title">{'官方配置依赖'}</div>
          <DiagRow label="sj_set.json" value={String(diag.configSet)} />
          <DiagRow label="sj_interfaceSet.ini" value={String(diag.configInterface)} />
          <DiagRow label="cyAutoFillColor" value={String(diag.autoFillColor)} />
        </div>
      ) : null}

      {logText ? (
        <div className="mm-home__log">
          <div className="mm-u-row mm-home__diag-head">
            <span className="mm-home__diag-title">{'日志（%TEMP%\\maomao.log）'}</span>
            <span className="mm-u-row mm-home__log-actions">
              <button
              type="button"
              className="mm-btn mm-home__copy"
              onClick={() => void handleCopy('日志', logText)}
            >
                复制
              </button>
              <button type="button" className="mm-btn mm-home__copy" onClick={handleLog}>
                刷新
              </button>
              <button type="button" className="mm-btn mm-home__copy" onClick={() => void handleClearLog()}>
                清空
              </button>
            </span>
          </div>
          <div className="mm-home__log-body">{logText}</div>
        </div>
      ) : null}
    </section>
  );
}
