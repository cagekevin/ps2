/** 底栏：24px 工具条，左侧留白，右侧两个图标 */
import type { PreviewMode } from '../../../store/font';
import { PreviewSetting } from './PreviewSetting';

interface Props {
  mode: PreviewMode;
  onMode: (mode: PreviewMode) => void;
  onToggleText: () => void;
}

export function PageFooter({ mode, onMode, onToggleText }: Props) {
  return (
    <footer className="mm-font__footer">
      <PreviewSetting mode={mode} onMode={onMode} onToggleText={onToggleText} />
    </footer>
  );
}
