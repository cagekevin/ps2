/**
 * 模板库 · 大图浮层。
 *
 * 「看不清」的唯一解：按窗口最大显示同一张缩略图（**不另存第二档** —— 多一档就是多一个可选字段）。
 * 关闭两路：点遮罩 / `Esc`，都走 `useDismiss`（全仓唯一点外监听）。
 */
import { useRef } from 'react';
import { Icon } from '../../../components/icons';
import { Portal } from '../../../components/Portal';
import { useDismiss } from '../../../hooks/useDismiss';

interface Props {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImagePreview({ src, alt, onClose }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  /* 点遮罩（`containerRef` 之外）与 Esc 都关 */
  useDismiss(true, boxRef, onClose);

  return (
    <Portal>
      <div className="mm-modal-mask mm-template__mask">
        <img className="mm-template__preview" src={src} alt={alt} />
        <button type="button" className="mm-template__preview-close" onClick={onClose} title="关闭" aria-label="关闭">
          <Icon name="iconguanbi" />
        </button>
      </div>
    </Portal>
  );
}
