/**
 * 设置页（`/set`）
 *
 * 结构照原版（`app.v4.js:1983563` / `ps/src/pages/set/index.vue:213-217`）：
 * 标题「设置」→ 分组「使用设置」→ 一行「单位：」+ 下拉。
 *
 * 单位写 `sj_set.json` 的 `appUnit`（走 `commands/font-set.saveSettings`），
 * **写失败要回滚 UI**：原版 `set/index.vue:154-156` 就是这么做的，
 * 不回滚会让用户看到新值、文件里还是旧的。
 *
 * 它影响的是「数值输入框的默认单位」（原版补单位函数 `app.v4.js:2268567`），
 * 不是字体面板字号后面的后缀——那一个来自 PS 文档属性 `TypeUnits.*`。
 *
 * 本版只做「单位」一行；原版同页还有「基本设置」三个勾选与左侧栏菜单，
 * 没有设计定稿前不摆空分组。
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckBox } from '../../components/CheckBox';
import { useConfirm } from '../../components/Confirm/useConfirm';
import { SelectBox } from '../../components/SelectBox';
import { Button } from '../../components/ui';
import { useRunCommand } from '../../hooks/useRunCommand';
import { useToast } from '../../hooks/useToast';
import { download, upload } from '../../commands/cloud';
import { resetAll, setOption, setShow } from '../../commands/common-use';
import { saveSettings } from '../../commands/font-set';
import { booleanOptionOf } from '../../domain/common-use-options';
import { UNITS, unitIndexOf } from '../../domain/units';
import { useCloudStore } from '../../store/cloud';
import { useCommonUseStore } from '../../store/common-use';
import { useFontSetStore } from '../../store/font-set';
import { MSG } from '../../types/messages';
import './SettingsPage.css';

/** 台账时间只显示到分钟：秒没有信息量，还会让状态行抖动 */
function formatSyncedAt(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function SettingsPage() {
  /* 设置项都是瞬时写：不转圈，失败留痕由 hook 负责 */
  const run = useRunCommand();
  const settings = useFontSetStore((state) => state.settings);
  const load = useFontSetStore((state) => state.load);
  const setLocalSettings = useFontSetStore((state) => state.setLocalSettings);
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const cloudLedger = useCloudStore((state) => state.ledger);
  const cloudBusy = useCloudStore((state) => state.busy);
  const setCloudBusy = useCloudStore((state) => state.setBusy);
  const loadCloud = useCloudStore((state) => state.load);

  /*
   * 订阅派生布尔而不是整个 options：另外 15 个键变化与本页无关。
   * 判据走 `booleanOptionOf`（官方默认表），不写 `!== false` —— 那是页面里的第二份默认值。
   */
  const showZoom = useCommonUseStore((state) => booleanOptionOf(state.options, 'cyShowZoom'));
  const showTransformation = useCommonUseStore((state) =>
    booleanOptionOf(state.options, 'cyShowTransformation')
  );
  const tiles = useCommonUseStore((state) => state.tiles);
  const loadOptions = useCommonUseStore((state) => state.load);

  useEffect(() => {
    load();
    loadOptions();
    loadCloud();
  }, [load, loadOptions, loadCloud]);

  const current = UNITS[unitIndexOf(settings.appUnit)] ?? UNITS[0];

  function changeUnit(value: string): void {
    if (saving || value === settings.appUnit) return;

    const previous = settings.appUnit;
    setSaving(true);
    setLocalSettings({ appUnit: value });

    /* 失败提示由 hook 出（带 `log.warn(code, detail)`），这里只管把乐观值回滚 */
    void run(() => saveSettings({ appUnit: value }), { spin: false }).then((result) => {
      setSaving(false);
      if (result.status === 'error') setLocalSettings({ appUnit: previous });
    });
  }

  /**
   * 常用页两块区域的显隐：写 `sj_set.json` 的 `cyShowZoom` / `cyShowTransformation`。
   * 只改这两个键，文件里别的页面的设置原样保留（`repo/common-use-repo` 负责）。
   */
  function toggleSection(key: 'cyShowZoom' | 'cyShowTransformation', visible: boolean): void {
    void run(() => setOption(key, visible), { spin: false });
  }

  /**
   * 单个功能项的显隐：写 `sj_commonFunction.json` 的 `isShow`。
   *
   * **入口只放这里**：网格那三层手势（左键 / 右键 / Ctrl+右键）已经定死，
   * 再加「右键出菜单隐藏」就是第四种，违反 `03` 计划 §9 第 7 条。
   */
  function toggleTile(id: string, visible: boolean): void {
    void run(() => setShow(id, visible), { spin: false });
  }

  /**
   * 上传：全站唯一的一次确认在这里。
   *
   * 命令只回 `needs-confirm`（不弹窗）；确认后带 `force` 再调一次，`force` 只跳过那一处判定。
   * 失败提示由 `useRunCommand` 出（`reason` 由命令给），成功提示在确认完成之后。
   */
  async function syncUpload(force: boolean): Promise<void> {
    setCloudBusy('upload');
    const result = await run(() => upload({ force }));
    setCloudBusy(null);

    if (result.status === 'error') return;

    if (result.value.status === 'needs-confirm') {
      const confirmed = await confirm({
        title: MSG.cloud.overwriteAsk,
        confirmText: MSG.cloud.overwrite
      });
      if (confirmed) await syncUpload(true);
      return;
    }

    toast.info(MSG.cloud.done);
    loadCloud();
  }

  /** 下载：不做比较，点了就覆盖本地（`.bak` 由 `core/storage` 留，不是这里加的防御） */
  async function syncDownload(): Promise<void> {
    setCloudBusy('download');
    const result = await run(download);
    setCloudBusy(null);

    if (result.status === 'error') return;

    toast.info(MSG.cloud.done);
    loadCloud();
  }

  return (
    <div className="mm-settings">
      {/* 没有页头：导航上已写着「设置」，标题行白占 40 高（全站页面一致） */}
      <div className="mm-u-col mm-settings__body">
        <div className="mm-settings__section">使用设置</div>

        <div className="mm-u-row mm-settings__row">
          <span className="mm-settings__label">单位：</span>
          <SelectBox
            className="mm-u-grow"
            options={UNITS.map((unit) => ({ value: unit.value, label: unit.label }))}
            value={current?.value ?? 'px'}
            onChange={changeUnit}
            disabled={saving}
          />
        </div>

        <div className="mm-settings__section">常用功能面板</div>

        <CheckBox
          label="显示缩放区"
          checked={showZoom}
          onChange={(visible) => toggleSection('cyShowZoom', visible)}
        />

        <CheckBox
          label="显示变换区"
          checked={showTransformation}
          onChange={(visible) => toggleSection('cyShowTransformation', visible)}
        />

        <div className="mm-settings__section">显示的功能项</div>

        <div className="mm-settings__tiles">
          {tiles.map((tile) => (
            <CheckBox
              key={tile.id}
              label={tile.name}
              title={tile.title || tile.name}
              checked={tile.visible}
              onChange={(visible) => toggleTile(tile.id, visible)}
            />
          ))}
        </div>

        {/*
         * 「重置常用功能排序」——官方 `:1991384` 把它放在**设置页的常用功能区最后一行**，
         * 不在常用页页头（v1 放错过，2026-10-29 改回）。
         * 官方文案是「重置常用功能排序」，但 `resetConfig()` 返回的是整份 14 项默认配置
         * （顺序 + 显隐 + title/svg 全恢复）——名字只说排序会骗人，所以文案改成「重置常用功能」，
         * 句式保持官方原样、只删一个词。**这是登记的文案偏离**（`03` §4.5），别顺手改回官方原文，
         * 也别改成「恢复默认常用功能」（会与设置页的「恢复默认设置」混淆，那是重置整个客户端）。
         */}
        <Button onClick={() => void run(resetAll, { spin: false })}>
          重置常用功能
        </Button>

        <div className="mm-settings__section">云同步</div>

        <div className="mm-u-row mm-settings__row">
          <span className="mm-settings__label">上次同步</span>
          <span className="mm-settings__status">
            {cloudLedger
              ? `${formatSyncedAt(cloudLedger.syncedAt)} · rev ${cloudLedger.rev}`
              : MSG.cloud.never}
          </span>
        </div>

        {/* 一排两个等宽按钮走组合层 `.mm-btn-grid`（只注入列数），
            不塞进 `.mm-u-row`（那是两端铺满，两个按钮会被推到左右两端、宽度按文字）。
            这两个是同等操作，**都不给 `variant="primary"`** —— 蓝底只留给「一行里唯一要突出的那个」。 */}
        <div className="mm-btn-grid mm-settings__actions">
          <Button disabled={cloudBusy !== null} onClick={() => void syncUpload(false)}>
            上传到云端
          </Button>
          <Button disabled={cloudBusy !== null} onClick={() => void syncDownload()}>
            从云端下载
          </Button>
        </div>

        {/* 诊断：原来在面板头部占一整行（应用名 + 版本 + 诊断），现在收进设置页 ——
            它是排查入口，不是每天要点的东西（2026-10-31） */}
        <div className="mm-settings__section">诊断</div>
        {/* 一排一个按钮就**直接放 Button**，不包一层 `.mm-u-row`
            （同页「重置常用功能」就是这个形态；单元素进 space-between 没有意义） */}
        <Button onClick={() => navigate('/debug')}>打开诊断页</Button>
      </div>
    </div>
  );
}
