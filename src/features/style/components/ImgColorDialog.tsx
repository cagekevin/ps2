/**
 * 【范本】图片取色弹层（原版 imgColor 组件 `app.v4.js:51635-51717`）。
 *
 * 结构：提取的颜色（色圈列表，左键应用 / 右键删）→ 保存到颜色 / 保存到色板
 * → 分隔线 → 提取的渐变色（两两组合的渐变条，左键应用 / 右键删）→ 保存渐变。
 *
 * 颜色与渐变对都是本地 state（照原版 arrCol / arrGrads）：删一个色，含它的渐变对一起消失。
 * 落盘 / 应用通过回调交给页面。
 */
import { useState } from 'react';
import { buildColorPairGradients } from '../../../domain/image-color';
import './img-color-dialog.css';

interface Props {
  /** 量化出的颜色（`#rrggbb` 小写，照 app 的 ImageColor.hex） */
  colors: string[];
  onApplyColor: (hex: string) => void;
  onApplyGradient: (pair: [string, string]) => void;
  onSaveSwatch: (hexes: string[]) => void;
  onSaveColorGroup: (hexes: string[]) => void;
  onSaveGradientGroup: (hexes: string[]) => void;
  onClose: () => void;
}

export function ImgColorDialog({
  colors: initialColors,
  onApplyColor,
  onApplyGradient,
  onSaveSwatch,
  onSaveColorGroup,
  onSaveGradientGroup,
  onClose
}: Props) {
  const [hexes, setHexes] = useState<string[]>(initialColors);
  const [pairs, setPairs] = useState<{ pair: [string, string]; css: string }[]>(() =>
    buildColorPairGradients(initialColors)
  );

  function removeColorAt(index: number) {
    const hex = hexes[index];
    if (hex === undefined) return;
    setHexes((prev) => prev.filter((_, i) => i !== index));
    /* 含这个色的渐变对一起删（原版 watch colors 重建整个 arrGrads，语义等价） */
    setPairs((prev) => prev.filter((g) => g.pair[0] !== hex && g.pair[1] !== hex));
  }

  function removeGradientAt(index: number) {
    setPairs((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="mm-imgcolor__mask" onClick={onClose}>
      <div
        className="mm-imgcolor"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="mm-imgcolor__title">提取的颜色</p>
        <div className="mm-imgcolor__row">
          {hexes.map((hex, index) => (
            <button
              key={`${hex}-${index}`}
              type="button"
              className="mm-imgcolor__swatch"
              style={{ background: hex }}
              title="左键应用，右键删除"
              onClick={() => onApplyColor(hex)}
              onContextMenu={(event) => {
                event.preventDefault();
                removeColorAt(index);
              }}
            />
          ))}
        </div>
        <div className="mm-imgcolor__row">
          <button
            type="button"
            className="mm-imgcolor__btn mm-imgcolor__btn--primary"
            onClick={() => onSaveColorGroup(hexes)}
          >
            保存到颜色
          </button>
          <button
            type="button"
            className="mm-imgcolor__btn mm-imgcolor__btn--second"
            onClick={() => onSaveSwatch(hexes)}
          >
            保存到色板
          </button>
        </div>

        <hr className="mm-imgcolor__hr" />

        <p className="mm-imgcolor__title">提取的渐变色</p>
        <div className="mm-imgcolor__row">
          {pairs.map(({ pair, css }) => (
            <button
              key={css}
              type="button"
              className="mm-imgcolor__grad"
              style={{ background: css }}
              title="左键应用，右键删除"
              onClick={() => onApplyGradient(pair)}
              onContextMenu={(event) => {
                event.preventDefault();
                removeGradientAt(pairs.findIndex((g) => g.css === css));
              }}
            />
          ))}
        </div>
        <button
          type="button"
          className="mm-imgcolor__btn mm-imgcolor__btn--primary mm-imgcolor__btn--wide"
          onClick={() => onSaveGradientGroup(hexes)}
        >
          保存渐变
        </button>
      </div>
    </div>
  );
}
