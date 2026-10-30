/** 底栏预览设置：眼睛（5 档）+ Aa（预览文案输入） */
import { useRef, useState } from 'react';
import { BottomBarButton } from '../../../components/BottomBar';
import { Portal } from '../../../components/Portal';
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
      <BottomBarButton
        title="预览设置"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="iconxianshi" />
      </BottomBarButton>
      <BottomBarButton title="编辑预览文案" onClick={onToggleText}>
        <Icon name="iconzihaodaxiao1" />
      </BottomBarButton>

      {open
        ? <Portal>
            <div
              ref={cardRef}
              className="mm-popover mm-font__preview-card"
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
                    <Icon name="icongouxuan" className="mm-font__preview-check" />
                  ) : null}
                  <span>{PREVIEW_LABEL[item]}</span>
                </button>
              ))}
            </div>
          </Portal>
        : null}
    </div>
  );
}
