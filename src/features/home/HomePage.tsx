/**
 * 【范本】feature 页面结构（同时是调试页，路由 /debug）
 * 新增页面必须照此结构：
 * - UI 只用 components/ui，不自己写按钮/输入框样式
 * - 状态：页面内 useState，跨页面共享用 store 选择器
 * - 异步：useLoading().run() 包裹，错误用 useToast()
 * - 请求：request('endpointKey')，类型自动推导，不写泛型
 * - effect 内异步必须带取消标志
 * - 样式只用 Token
 */
import { useState } from 'react';
import { useConfirm } from '../../components/Confirm/useConfirm';
import { useLoading } from '../../components/Loading';
import { useToast } from '../../components/Toast';
import { Button } from '../../components/ui';
import { copyText } from '../../core/clipboard';
import { request } from '../../core/http/client';
import { clearLogText, readLogText } from '../../core/logger';
import { diagVendor, type VendorDiag } from '../../core/ps/diag';
import { useAppStore } from '../../store/app';
import { LAYER_KIND_LABEL } from '../../types/layer';
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
    <div className={`mm-home__diag-row${bad ? ' mm-home__diag-row--bad' : ''}`}>
      <span className="mm-home__diag-key">{label}</span>
      <span className="mm-home__diag-value">{value}</span>
    </div>
  );
}

export default function HomePage() {
  const toast = useToast();
  const loading = useLoading();
  const confirm = useConfirm();
  /* 当前图层由 app/layer-watcher 统一写入，页面只读 */
  const layerKind = useAppStore((state) => state.layerKind);
  const layerName = useAppStore((state) => state.layerName);
  const [diag, setDiag] = useState<VendorDiag | null>(null);
  const [logText, setLogText] = useState('');

  async function handlePing() {
    const result = await loading.run(() => request('productList'));
    if (result.status === 'ok') {
      toast.info('接口可达');
      return;
    }
    toast.error(`${result.code}: ${result.reason}`);
  }

  async function handleDiag() {
    const result = await loading.run(() => diagVendor());
    if (result.status === 'ok') {
      setDiag(result.value);
      return;
    }
    toast.error(result.reason);
  }

  function handleLog() {
    const text = readLogText();
    setLogText(text || '（日志为空）');
  }

  async function handleClearLog() {
    const agreed = await confirm({
      title: '清空日志？',
      message: '清空后无法恢复。',
      confirmText: '清空'
    });
    if (!agreed) return;

    const result = clearLogText();
    if (result.status === 'error') {
      toast.error(result.reason);
      return;
    }
    /* 清完留在原地显示空态：整块消失会让人以为按钮点错了 */
    setLogText('（日志为空）');
    toast.info('日志已清空');
  }

  async function handleCopy(label: string, text: string) {
    if (!text) {
      toast.error('没有可复制的内容');
      return;
    }
    const result = await copyText(text);
    if (result.status === 'ok') toast.info(`已复制${label}`);
    else toast.error(result.reason);
  }

  return (
    <section className="mm-home">
      <p className="mm-home__row">
        当前图层：
        {layerKind ? `${LAYER_KIND_LABEL[layerKind]}${layerName ? `「${layerName}」` : ''}` : '—'}
      </p>

      <div className="mm-home__actions">
        <Button onClick={handleDiag}>诊断官方能力</Button>
        <Button onClick={handleLog}>查看日志</Button>
        <Button variant="primary" onClick={handlePing}>
          测试接口
        </Button>
      </div>


      {diag ? (
        <div className="mm-home__diag">
          <div className="mm-home__diag-head">
            <span className="mm-home__diag-title">官方 jsx 函数</span>
            <button
              type="button"
              className="mm-home__copy"
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

          <p className="mm-home__diag-title">官方配置依赖</p>
          <DiagRow label="sj_set.json" value={String(diag.configSet)} />
          <DiagRow label="sj_interfaceSet.ini" value={String(diag.configInterface)} />
          <DiagRow label="cyAutoFillColor" value={String(diag.autoFillColor)} />
        </div>
      ) : null}

      {logText ? (
        <div className="mm-home__log">
          <div className="mm-home__diag-head">
            <span className="mm-home__diag-title">日志（%TEMP%\maomao.log）</span>
            <span className="mm-home__log-actions">
              <button type="button" className="mm-home__copy" onClick={() => void handleCopy('日志', logText)}>
                复制
              </button>
              <button type="button" className="mm-home__copy" onClick={handleLog}>
                刷新
              </button>
              <button type="button" className="mm-home__copy" onClick={() => void handleClearLog()}>
                清空
              </button>
            </span>
          </div>
          <pre className="mm-home__log-body">{logText}</pre>
        </div>
      ) : null}
    </section>
  );
}
