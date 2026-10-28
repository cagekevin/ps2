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
import { CheckBox } from '../../components/CheckBox';
import { PageHeader } from '../../components/PageHeader';
import { SelectBox } from '../../components/SelectBox';
import { useRunCommand } from '../../hooks/useRunCommand';
import { setOption, setShow } from '../../commands/common-use';
import { saveSettings } from '../../commands/font-set';
import { UNITS, unitIndexOf } from '../../domain/units';
import { useCommonUseStore } from '../../store/common-use';
import { useFontSetStore } from '../../store/font-set';
import './SettingsPage.css';

export default function SettingsPage() {
  /* 设置项都是瞬时写：不转圈，失败留痕由 hook 负责 */
  const run = useRunCommand();
  const settings = useFontSetStore((state) => state.settings);
  const load = useFontSetStore((state) => state.load);
  const setLocalSettings = useFontSetStore((state) => state.setLocalSettings);
  const [saving, setSaving] = useState(false);

  /* 订阅派生布尔而不是整个 options：另外 15 个键变化与本页无关 */
  const showZoom = useCommonUseStore((state) => state.options.cyShowZoom !== false);
  const showTransformation = useCommonUseStore(
    (state) => state.options.cyShowTransformation !== false
  );
  const tiles = useCommonUseStore((state) => state.tiles);
  const loadOptions = useCommonUseStore((state) => state.load);

  useEffect(() => {
    load();
    loadOptions();
  }, [load, loadOptions]);

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

  return (
    <div className="mm-settings">
      <PageHeader title="设置" />

      <div className="mm-settings__body">
        <h2 className="mm-settings__section">使用设置</h2>

        <div className="mm-settings__row">
          <span className="mm-settings__label">单位：</span>
          <SelectBox
            className="mm-settings__select"
            options={UNITS.map((unit) => ({ value: unit.value, label: unit.label }))}
            value={current?.value ?? 'px'}
            onChange={changeUnit}
            disabled={saving}
          />
        </div>

        <h2 className="mm-settings__section">常用功能面板</h2>

        <div className="mm-settings__row">
          <CheckBox
            label="显示缩放区"
            checked={showZoom}
            onChange={(visible) => toggleSection('cyShowZoom', visible)}
          />
        </div>

        <div className="mm-settings__row">
          <CheckBox
            label="显示变换区"
            checked={showTransformation}
            onChange={(visible) => toggleSection('cyShowTransformation', visible)}
          />
        </div>

        <h2 className="mm-settings__section">显示的功能项</h2>

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
      </div>
    </div>
  );
}
