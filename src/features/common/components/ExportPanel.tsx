/**
 * 导出图片面板（原版 `comexport`，`app.v4.js:36435`）。
 *
 * 11 个 `cyExport` 字段 + `compress` 的 4 个子键，逐条照 `13-常用-V2` §1.1-E / §5.5。
 * 写设置一律 `setOption('cyExport.<字段>')` / `('cyExport.compress.<子键>')`，**面板不读写文件**。
 *
 * 三处与原版不同（都是已登记的偏离，别顺手改回去）：
 *   - **A-3**：品质框 Enter 提交（官方 blur）。不为一处 blur 给 `TextField` 加第五种提交时机。
 *   - **A-4**：PNG 档用 `Segment`（PNG-24 / PNG-8），官方是白底下拉；同页不出现第二套 28/30 高控件。
 *   - 批量 PSD 的 `>30` 确认：页面先 `listPsdFiles()` 拿数量 → 超阈值才 `useConfirm` →
 *     再调 `exportPsdFiles(files)`。**阈值与判据只有一处**（`domain.needsBatchConfirm`），
 *     命令层不再重复判（那条分支不可达，已删）。
 *
 * 图层名跟随读 `store/app.layerName`（A-1）：`app/layer-watcher` 是全项目唯一图层订阅者，
 * 这里不再订阅事件。
 */

import { useMemo } from 'react';
import { IconPanel, IconPanelGroup, sectionTrigger } from '../../../components/IconPanel';
import { IconButton } from '../../../components/IconButton';
import { Segment } from '../../../components/Segment';
import { TextField } from '../../../components/TextField';
import { CheckBox } from '../../../components/CheckBox';
import { RadioButton } from '../../../components/RadioButton';
import { Button } from '../../../components/ui';
import { useConfirm } from '../../../components/Confirm/useConfirm';
import {
  exportLayers,
  exportPsdFiles,
  listPsdFiles,
  openDirectory,
  setOption
} from '../../../commands/common-use';
import { chooseFolder, openFile } from '../../../core/dialog';
import { needsBatchConfirm } from '../../../domain/common-use';
import { MSG } from '../../../types/messages';
import { exportConfigOf, type ExportCompressKey } from '../../../domain/common-use-options';
import { useDraft } from '../../../hooks/useDraft';
import { useRunCommand } from '../../../hooks/useRunCommand';
import { useToast } from '../../../hooks/useToast';
import { useAppStore } from '../../../store/app';
import { useCommonUseStore } from '../../../store/common-use';
import './panel.css';

/** `cyExport` 里被当作字符串用的键 */
const text = (value: unknown): string => (typeof value === 'string' ? value : '');
/** 布尔键：值由 `exportConfigOf` 补过默认，这里只做收窄 */
const flag = (value: unknown): boolean => value === true;
/** 数值键同上 */
const num = (value: unknown): number => (typeof value === 'number' ? value : 0);

/** 反斜杠（手输路径归一用）。模块级常量：每次输入都 new 一个 RegExp 是白费 */
const BACKSLASH = /\\/g;

/** 品质越界统一置 100（官方 `checkQuality`） */
function clampQuality(text: string): number {
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0 || value > 100) return 100;
  return Math.round(value);
}

export function ExportPanel() {
  const options = useCommonUseStore((state) => state.options);
  const config = useMemo(() => exportConfigOf(options), [options]);
  const layerName = useAppStore((state) => state.layerName);

  const run = useRunCommand();
  const toast = useToast();
  const confirm = useConfirm();

  const compress = useMemo(() => {
    const raw = config.compress;
    return typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  }, [config]);

  /*
   * 文本类字段用受控草稿（`hooks/useDraft` 的范本用法）：Enter 提交才落盘（逐键写设置代价太大），
   * 但**源值一变就回填**——原先用 6 个独立 `useState`，别处改了设置后本地草稿永远是旧的。
   * `useDraft` 按内容比较，所以每次渲染重建这个对象不会冲掉用户正在输入的值。
   */
  const fields = useMemo(
    () => ({
      path: text(config.path),
      name: text(config.name),
      quality: String(num(config.quality)),
      width: text(compress.width),
      height: text(compress.height),
      watermark: text(compress.watermark)
    }),
    [config, compress]
  );
  const { draft, setDraft } = useDraft(Object.values(fields).join('\u0000'), () => fields);
  const setField = (key: keyof typeof fields, value: string): void => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  function write(key: string, value: unknown): void {
    void run(() => setOption(`cyExport.${key}`, value), { spin: false });
  }

  function writeCompress(key: ExportCompressKey, value: unknown): void {
    void run(() => setOption(`cyExport.compress.${key}`, value), { spin: false });
  }

  function pickFolder(): void {
    const picked = chooseFolder('保存到');
    if (!picked) {
      toast.error(MSG.common.cancel);
      return;
    }
    setField('path', picked);
    write('path', picked);
  }

  function pickWatermark(): void {
    const picked = openFile('选择水印文件', ['png', 'jpg', 'jpeg', 'psd']);
    if (!picked) {
      toast.error(MSG.common.cancelPick);
      setField('watermark', '');
      writeCompress('watermark', '');
      return;
    }
    setField('watermark', picked);
    writeCompress('watermark', picked);
  }

  function commitQuality(): void {
    const value = clampQuality(draft.quality);
    setField('quality', String(value));
    if (String(value) !== draft.quality.trim()) toast.error(MSG.common.qualityRange);
    write('quality', value);
  }

  /** 批量 PSD：先拿数量 → 超过阈值才问确认 → 带 `confirmed` 调同一条命令 */
  async function exportPsdFolder(): Promise<void> {
    const listed = await run(listPsdFiles, { tip: MSG.common.tipRootFolder });
    if (listed.status === 'error') return;

    const files = listed.value;
    if (needsBatchConfirm(files.length)) {
      const accepted = await confirm({
        title: MSG.common.confirmTitle,
        message: MSG.common.confirmBatch,
        confirmText: MSG.common.confirmContinue
      });
      if (!accepted) return;
    }
    void run(() => exportPsdFiles(files), { spin: false });
  }

  return (
    <div className="mm-common__panel">
      {/* 第一行：格式 + 品质 */}
      <div className="mm-u-row mm-common__panel-row">
        <Segment
          ariaLabel={'导出格式'}
          value={text(config.ext) === 'PNG' ? 'PNG' : 'JPG'}
          options={[
            { value: 'JPG', label: 'JPG' },
            { value: 'PNG', label: 'PNG' }
          ]}
          onChange={(value) => write('ext', value)}
        />
        {text(config.ext) === 'PNG' ? (
          <Segment
            ariaLabel={'PNG 位深'}
            value={flag(config.png8) ? 'PNG-8' : 'PNG-24'}
            options={[
              { value: 'PNG-24', label: 'PNG-24' },
              { value: 'PNG-8', label: 'PNG-8' }
            ]}
            onChange={(value) => write('png8', value === 'PNG-8')}
          />
        ) : (
          <TextField
            /** 官方 title 是「品质1-100」（可见前缀「品质」在官方是独立文字，本仓输入框无可见前缀） */
            title={'品质1-100'}
            variant="wide"
            inputMode="decimal"
            value={draft.quality}
            onChange={(next) => setField('quality', next)}
            onSubmit={commitQuality}
          />
        )}
      </div>

      {/* 第二行：保存到 + 路径类型 */}
      <div className="mm-u-row mm-common__panel-row">
        <TextField
          /** 官方：可见前缀「保存到」+ title「选择自定义目录」；本仓输入框无可见前缀，故 title 走官方、前缀进 placeholder */
          title={'选择自定义目录'}
          placeholder={'保存到'}
          variant="fill"
          value={draft.path}
          onChange={(next) => setField('path', next)}
          onSubmit={(value) => {
            /* 官方 blur 时把 `\` 转 `/`：手输的 Windows 路径不转，jsx 那边拼目录会对不上 */
            const next = value.trim().replace(BACKSLASH, '/');
            setField('path', next);
            write('path', next);
          }}
          rightSlot={<IconButton name="iconwenjianjiaguanli" title={'选择目录'} size={14} onClick={pickFolder} />}
        />
        <RadioButton
          name="mm-common-path-type"
          label={'桌面'}
          title={'保存到桌面'}
          checked={num(config.pathType) === 1}
          onChange={() => write('pathType', 1)}
        />
        <RadioButton
          name="mm-common-path-type"
          label={'文件所在目录'}
          title={'保存到文件所在目录'}
          checked={num(config.pathType) === 2}
          onChange={() => write('pathType', 2)}
        />
      </div>

      {/* 第三行：命名 */}
      <div className="mm-u-row mm-common__panel-row">
        <TextField
          title={'命名'}
          variant="fill"
          value={flag(config.layerName) ? layerName : draft.name}
          onChange={(next) => setField('name', next)}
          onSubmit={(value) => write('name', value.trim())}
        />
        <CheckBox
          label={'图层名'}
          title={'使用当前图层名字'}
          checked={flag(config.layerName)}
          onChange={(value) => write('layerName', value)}
        />
        <CheckBox
          label={'自动编号'}
          title={'不覆盖原图，使用数字编号命名。不支持多个切片哦'}
          checked={flag(config.isNumber)}
          onChange={(value) => write('isNumber', value)}
        />
      </div>

      <div className="mm-common__panel-rule" />

      <RadioButton
        name="mm-common-save-type"
        label={'使用导出Web方式(可以切片)'}
        checked={num(config.saveType) === 1}
        onChange={() => write('saveType', 1)}
      />
      <RadioButton
        name="mm-common-save-type"
        title={'与ctrl+shift+s保存一样'}
        label={'使用另存为方式(不压缩)'}
        checked={num(config.saveType) === 2}
        onChange={() => write('saveType', 2)}
      />

      <div className="mm-common__panel-rule" />

      <IconPanelGroup
        exclusive={false}
        openId={flag(options.cyShowCompress) ? 'compress' : ''}
        onOpenChange={(next) =>
          void run(() => setOption('cyShowCompress', next === 'compress'), { spin: false })
        }
      >
        <IconPanel id="compress" title={'压缩尺寸 & 加水印'} trigger={sectionTrigger('压缩尺寸 & 加水印')} panel={<>
        <div className="mm-u-row mm-common__panel-row">
          <TextField
            title={'导出宽度'}
            variant="half"
            value={draft.width}
            onChange={(next) => setField('width', next)}
            onSubmit={(value) => writeCompress('width', value.trim())}
          />
          <TextField
            title={'导出高度'}
            variant="half"
            value={draft.height}
            onChange={(next) => setField('height', next)}
            onSubmit={(value) => writeCompress('height', value.trim())}
          />
        </div>
        <TextField
          title={'水印文件'}
          variant="fill"
          value={draft.watermark}
          onChange={(next) => setField('watermark', next)}
          onSubmit={(value) => {
            const next = value.trim().replace(BACKSLASH, '/');
            setField('watermark', next);
            writeCompress('watermark', next);
          }}
          rightSlot={
            <IconButton name="iconwenjianjiaguanli" title={'选择水印文件'} size={14} onClick={pickWatermark} />
          }
        />
        <CheckBox
          label={'同时导出原图'}
          checked={flag(compress.exportOriginalGraph)}
          onChange={(value) => writeCompress('exportOriginalGraph', value)}
        />
        </>}
        />
      </IconPanelGroup>

      <IconPanelGroup
        exclusive={false}
        openId={flag(options.cyShowSetFolder) ? 'setFolder' : ''}
        onOpenChange={(next) =>
          void run(() => setOption('cyShowSetFolder', next === 'setFolder'), { spin: false })
        }
      >
        <IconPanel id="setFolder" title={'所在目录设置'} trigger={sectionTrigger('所在目录设置')} panel={<>
        <div className="mm-u-row mm-common__panel-row">
          <Button className="mm-common__panel-btn" onClick={() => void run(openDirectory)}>
            打开所在目录
          </Button>
        </div>
        <CheckBox
          label={'保存后自动打开所在目录'}
          checked={flag(config.autoOpenFolder)}
          onChange={(value) => write('autoOpenFolder', value)}
        />
        </>}
        />
      </IconPanelGroup>

      <IconPanelGroup
        exclusive={false}
        openId={flag(options.cyShowBatch) ? 'batch' : ''}
        onOpenChange={(next) =>
          void run(() => setOption('cyShowBatch', next === 'batch'), { spin: false })
        }
      >
        <IconPanel id="batch" title={'批量导出功能'} trigger={sectionTrigger('批量导出功能')} panel={<>
        <div className="mm-u-row mm-common__panel-row">
          <Button
            className="mm-common__panel-btn mm-common__panel-btn--half"
            onClick={() => void run(() => exportLayers(1), { tip: MSG.common.progressExportFirst })}
          >
            导出一级图层
          </Button>
          <Button
            className="mm-common__panel-btn mm-common__panel-btn--half"
            onClick={() => void run(() => exportLayers(2), { tip: MSG.common.progressExportSecond })}
          >
            导出二级图层
          </Button>
        </div>
        <div className="mm-u-row mm-common__panel-row">
          <Button className="mm-common__panel-btn" onClick={() => void exportPsdFolder()}>
            批量导出文件夹所有PSD
          </Button>
        </div>
        </>}
        />
      </IconPanelGroup>

    </div>
  );
}
