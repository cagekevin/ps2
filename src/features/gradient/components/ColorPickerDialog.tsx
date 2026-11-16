/**
 * 取色弹窗：点 01 / 02 色块打开，改的是那个端点的颜色。
 *
 * 壳走公共 `.mm-modal`（与 `ImgColorDialog` 同结构：遮罩点击关闭、`useFocusTrap` 管焦点），
 * **没有确定 / 取消**：拖动即生效、点遮罩即结束，与 PS 拾色器同一姿态。
 *
 * 内部状态是 HSVA 而不是 hex：`hexToHsva` 对灰色给不出色相（h 恒 0），
 * 每次从 hex 反算会让「把饱和度拖到 0 再拖回来」变成换色。所以只在打开时反算一次，
 * 之后拖出来的值同时喂给组件与 `onChange`。
 *
 * 取色件是 `@uiw/react-color` 的 `Saturation` + `Hue(direction="vertical")`：
 * 竖色相条只有它有原生支持（`react-colorful` 的拖拽轴写死水平），尺寸覆盖见同名 css。
 */
import { useState } from 'react';
import Saturation from '@uiw/react-color-saturation';
import Hue from '@uiw/react-color-hue';
import { hexToHsva, hsvaToHex } from '@uiw/color-convert';
import { Portal } from '../../../components/Portal';
import { stopClickPropagation } from '../../../components/ui';
import { useDismiss } from '../../../hooks/useDismiss';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import './color-picker-dialog.css';

interface Props {
  /** 弹窗标题：说清正在改哪个端点，别让用户猜 */
  label: string;
  hex: string;
  onChange: (hex: string) => void;
  onClose: () => void;
}

export function ColorPickerDialog({ label, hex, onChange, onClose }: Props) {
  const [hsva, setHsva] = useState(() => hexToHsva(hex));
  const { containerRef, onKeyDown } = useFocusTrap();
  /* Esc 关闭走公共原语（与 `SaveDialog` 同一套），点外由遮罩的 onClick 兜 */
  useDismiss(true, containerRef, onClose);

  /** 拖色相时组件只回 `{ h }`，合并进当前 hsva 再上抛，避免把 s/v 覆盖成 undefined */
  function commit(next: { h: number; s: number; v: number; a: number }): void {
    setHsva(next);
    onChange(hsvaToHex(next));
  }

  return (
    <Portal>
      <div className="mm-modal-mask" onClick={onClose}>
        <div
          ref={containerRef}
          className="mm-u-col mm-modal mm-gradient__picker"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={stopClickPropagation}
          onKeyDown={onKeyDown}
        >
          <div className="mm-modal__title">{label}</div>
          <div className="mm-modal__body mm-u-tiles mm-gradient__picker-row">
            <Saturation hsva={hsva} onChange={commit} />
            <Hue hue={hsva.h} direction="vertical" onChange={(next) => commit({ ...hsva, ...next })} />
          </div>
        </div>
      </div>
    </Portal>
  );
}
