/** 底栏预览设置：眼睛（5 档）+ Aa（预览文案输入） */
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../components/icons';
import { useDismiss } from '../../../hooks/useDismiss';
import { PREVIEW_LABEL, PREVIEW_MODES, type PreviewMode } from '../../../store/font';

interface Props {
  mode: PreviewMode;
  onMode: (mode: PreviewMode) => void;
  onToggleText: () => void;
}

export function PreviewSetting({ mode, onMode, onToggleText }: Props) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useDismiss(open, cardRef, () => setOpen(false));

  return (
    <div className="mm-font__preview-setting">
      <button
        type="button"
        className="mm-font__preview-icon"
        aria-label="预览设置"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="iconxianshi" size={16} />
      </button>
      <button type="button" className="mm-font__preview-icon" aria-label="编辑预览文案" onClick={onToggleText}>
        <Icon name="iconzihaodaxiao1" size={16} />
      </button>

      {open
        ? createPortal(
            <div
              ref={cardRef}
              className="mm-font__preview-card"
              role="dialog"
              aria-label="预览设置"
            >
              {PREVIEW_MODES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`mm-font__preview-item${mode === item ? ' mm-font__preview-item--active' : ''}`}
                  onClick={() => {
                    setOpen(false);
                    onMode(item);
                  }}
                >
                  {mode === item ? (
                    <Icon name="icongouxuan" size={12} className="mm-font__preview-check" />
                  ) : null}
                  <span>{PREVIEW_LABEL[item]}</span>
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
