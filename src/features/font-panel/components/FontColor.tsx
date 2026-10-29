/**
 * 字体属性（原版 `fontSetColor`）
 *
 * 行序固定：字体家族 → 字重 + 颜色 → 样式行（粗 / 斜 / 大写 / 3 向对齐）→
 * 字号 + 行距 → 字距 + 文字视觉调整；每行下面挂自己的预设档位。
 *
 * 三个修饰键语义（原版 `ft.f()` 只认 ctrlKey，别自己发明）：
 *   点击 = 点文本对齐；Ctrl = 段落对齐；Shift = 保留给点文本切换
 *
 * 三个预设区（字号 / 行距 / 字距）的开关归 `IconPanelGroup`：
 *   字号与行距同组且 `exclusive={false}`——**可以同时展开**；
 *   字距单独一组。点数字框右侧的小箭头就开，不是只能右键。
 *
 * 本组件不发命令：所有动作都通过 props 交回页面，页面再调 `commands/font-set`。
 */

import { useMemo } from 'react';
import { CheckBox } from '../../../components/CheckBox';
import { IconButton } from '../../../components/IconButton';
import { IconPanel, IconPanelGroup } from '../../../components/IconPanel';
import { SelectBox } from '../../../components/SelectBox';
import type { FontItem } from '../../../domain/font-item';
import type { TextInfo } from '../../../domain/text-info';
import { ALIGN_TIP, ALIGN_TITLES } from '../font-panel-constants';
import { NumberField } from './NumberField';

export type StyleKind = 'caps' | 'kerning' | 'italic' | 'bold';

interface Props {
  info: TextInfo;
  fonts: FontItem[];
  fontsLoading: boolean;
  defaults: { size: number[]; leading: number[]; tracking: number[] };
  onFontName: (input: {
    postScriptName: string;
    name: string;
    weight: string;
    family: string;
  }) => void;
  onSize: (value: number) => void;
  onLeading: (value: number) => void;
  onTracking: (value: number) => void;
  onColor: () => void;
  onStyle: (kind: StyleKind, value: boolean) => void;
  onAlign: (input: { index: number; shift: boolean; paragraph: boolean }) => void;
}

const ALIGN_ICONS = ['iconwenbenduiqi1', 'iconwenbenduiqi2', 'iconwenbenduiqi3'] as const;
const ALIGN_JUSTIFY = ['left', 'center', 'right'] as const;

export function FontColor({
  info,
  fonts,
  fontsLoading,
  defaults,
  onFontName,
  onSize,
  onLeading,
  onTracking,
  onColor,
  onStyle,
  onAlign
}: Props) {
  /**
   * 系统字体可能有上千个家族，`fonts.find` 每次渲染都全表扫。
   * 建一次 Map 复用（换字体列表才重建），选择时也走同一张表。
   */
  const fontIndex = useMemo(() => {
    const map = new Map<string, FontItem>();
    for (const font of fonts) map.set(font.family, font);
    return map;
  }, [fonts]);

  const selectedFont = fontIndex.get(info.family) ?? null;

  /**
   * 当前家族可能来自图层而系统列表里没有（或还是默认占位），补一条让它显示出来。
   * 一次遍历同时判断「有没有」，不再 `map` + `includes` + `map` 走三遍。
   */
  const familyOptions: Array<{ value: string; label: string }> = [];
  let familyMatched = false;
  for (const font of fonts) {
    if (font.family === info.family) familyMatched = true;
    familyOptions.push({ value: font.family, label: font.family });
  }
  if (info.family && !familyMatched) {
    familyOptions.unshift({ value: info.family, label: info.family });
  }

  const weightOptions = (selectedFont?.weights ?? []).map((weight) => ({
    value: weight,
    label: weight
  }));

  function applyFamily(family: string): void {
    const font = fontIndex.get(family);
    if (!font) return;
    onFontName({
      postScriptName: font.postScriptNames[0] ?? '',
      name: font.names[0] ?? family,
      weight: font.weights[0] ?? '',
      family
    });
  }

  function applyWeight(weight: string): void {
    if (!selectedFont) return;
    const index = selectedFont.weights.indexOf(weight);
    if (index < 0) return;
    onFontName({
      postScriptName: selectedFont.postScriptNames[index] ?? '',
      name: selectedFont.names[index] ?? selectedFont.family,
      weight,
      family: selectedFont.family
    });
  }


  return (
    <div className="mm-font-panel__color">
      <div className="mm-font-panel__color-row">
        <SelectBox
          className="mm-font-panel__family"
          options={familyOptions}
          value={info.family}
          onChange={applyFamily}
          disabled={fontsLoading && fonts.length === 0}
        />
      </div>

      <div className="mm-font-panel__color-row">
        <SelectBox
          className="mm-font-panel__weight"
          options={weightOptions}
          value={info.weight}
          onChange={applyWeight}
          disabled={!selectedFont}
        />
        <span className="mm-font-panel__color-label" title="颜色">
          颜色：
        </span>
        <button
          type="button"
          className="mm-font-panel__swatch"
          title="设置颜色"
          aria-label="设置颜色"
          onClick={onColor}
        />
      </div>

      <div className="mm-row mm-row--wrap mm-font-panel__styles">
        <IconButton
          name="iconzihaodaxiao7"
          title="加粗"
          active={info.fauxBold}
          onClick={() => onStyle('bold', !info.fauxBold)}
        />
        <IconButton
          name="iconqingxie"
          title="倾斜"
          active={info.fauxItalic}
          onClick={() => onStyle('italic', !info.fauxItalic)}
        />
        <IconButton
          name="iconquanbudaxie"
          title="全部大写"
          active={info.capitalization === 'allCaps'}
          onClick={() => onStyle('caps', info.capitalization !== 'allCaps')}
        />

        <span className="mm-font-panel__divider" />

        {ALIGN_TITLES.map((title, index) => (
          <IconButton
            key={title}
            name={ALIGN_ICONS[index] ?? 'iconwenbenduiqi1'}
            title={`${title}${ALIGN_TIP}`}
            active={info.justification === ALIGN_JUSTIFY[index]}
            onClick={(event) =>
              onAlign({ index, shift: event.shiftKey, paragraph: event.ctrlKey })
            }
          />
        ))}
      </div>

      {/* 字号 / 行距的预设互不排斥：可以同时展开 */}
      <IconPanelGroup exclusive={false}>
        <div className="mm-font-panel__metric">
          <div className="mm-font-panel__half">
            <IconPanel
              id="size-preset"
              title="字号预设"
              trigger={({ toggle, active }) => (
                <NumberField
                  value={info.size}
                  title="设置字体大小"
                  icon="iconshezhizitidaxiao"
                  min={1}
                  presetOpen={active}
                  onCommit={onSize}
                  onPreset={toggle}
                />
              )}
              panel={
                <div className="mm-font-panel__presets">
                  {defaults.size.map((value) => (
                    <button
                      key={`size-${value}`}
                      type="button"
                      className="mm-font-panel__preset"
                      onClick={() => onSize(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              }
            />
          </div>

          <div className="mm-font-panel__gutter" />

          <div className="mm-font-panel__half">
            <IconPanel
              id="leading-preset"
              title="行距预设"
              trigger={({ toggle, active }) => (
                <NumberField
                  /* 原版：自动行距显示「(自动)」（`app.v4.js:1421662`），不显示 0 */
                  value={info.useAutoLeading ? '(自动)' : String(info.leading)}
                  title="设置行距"
                  icon="iconshezhihangju"
                  min={0}
                  presetOpen={active}
                  onCommit={onLeading}
                  onPreset={toggle}
                />
              )}
              panel={
                <div className="mm-font-panel__presets">
                  {defaults.leading.map((value) => (
                    <button
                      key={`leading-${value}`}
                      type="button"
                      className="mm-font-panel__preset"
                      onClick={() => onLeading(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              }
            />
          </div>
        </div>
      </IconPanelGroup>

      <IconPanelGroup exclusive={false}>
        <div className="mm-font-panel__metric">
          <div className="mm-font-panel__half">
            <IconPanel
              id="tracking-preset"
              title="字距预设"
              trigger={({ toggle, active }) => (
                <NumberField
                  value={String(info.tracking)}
                  title="设置字间距"
                  icon="iconshezhijianju"
                  presetOpen={active}
                  onCommit={onTracking}
                  onPreset={toggle}
                />
              )}
              panel={
                <div className="mm-font-panel__presets">
                  {defaults.tracking.map((value) => (
                    <button
                      key={`tracking-${value}`}
                      type="button"
                      className="mm-font-panel__preset"
                      onClick={() => onTracking(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              }
            />
          </div>

          <div className="mm-font-panel__gutter" />

          <div className="mm-font-panel__half mm-font-panel__half--center">
            <CheckBox
              label="文字视觉调整"
              title="设置两个字符间的字距为视觉"
              checked={info.autoKerning === 'opticalKern'}
              onChange={(value) => onStyle('kerning', value)}
            />
          </div>
        </div>
      </IconPanelGroup>
    </div>
  );
}
