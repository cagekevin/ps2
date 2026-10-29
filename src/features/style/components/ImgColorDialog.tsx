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
import { Button, stopClickPropagation } from '../../../components/ui';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
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
  /* 模态弹层：Tab 只在层内循环，关掉后焦点回到触发它的按钮 */
  const { containerRef, onKeyDown } = useFocusTrap();

  /**
   * 右键 = 删除这一项。骨架只写一处：原生右键菜单要挡掉，否则删完还弹系统菜单。
   * （色块与渐变块两处都用它，别各写一遍 `preventDefault + remove`。）
   */
  function contextToRemove(remove: () => void) {
    return (event: { preventDefault: () => void }) => {
      event.preventDefault();
      remove();
    };
  }

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
    <div className="mm-modal-mask" onClick={onClose}>
      <div
        ref={containerRef}
        className="mm-imgcolor"
        role="dialog"
        aria-modal="true"
        aria-label="提取的颜色"
        onClick={stopClickPropagation}
        onKeyDown={onKeyDown}
      >
        <div className="mm-imgcolor__title">提取的颜色</div>
        <div className="mm-imgcolor__row">
          {hexes.map((hex, index) => (
            <button
              key={`${hex}-${index}`}
              type="button"
              className="mm-imgcolor__swatch"
              title="左键应用，右键删除"
              onClick={() => onApplyColor(hex)}
              onContextMenu={contextToRemove(() => removeColorAt(index))}
            />
          ))}
        </div>
        <div className="mm-imgcolor__row">
          <Button variant="primary" className="mm-imgcolor__btn" onClick={() => onSaveColorGroup(hexes)}>
            保存到颜色
          </Button>
          <Button className="mm-imgcolor__btn" onClick={() => onSaveSwatch(hexes)}>
            保存到色板
          </Button>
        </div>

        <div className="mm-imgcolor__hr" />

        <div className="mm-imgcolor__title">提取的渐变色</div>
        <div className="mm-imgcolor__row">
          {pairs.map(({ pair, css }) => (
            <button
              key={css}
              type="button"
              className="mm-imgcolor__grad"
              title="左键应用，右键删除"
              onClick={() => onApplyGradient(pair)}
              onContextMenu={contextToRemove(() =>
                removeGradientAt(pairs.findIndex((g) => g.css === css))
              )}
            />
          ))}
        </div>
        <Button
          variant="primary"
          className="mm-imgcolor__btn mm-imgcolor__btn--wide"
          onClick={() => onSaveGradientGroup(hexes)}
        >
          保存渐变
        </Button>
      </div>
    </div>
  );
}
