/**
 * 字体管理页底栏：右侧两个图标（预览档位 + 预览文案）。
 *
 * 壳用公共件 `components/BottomBar`（26 高、深底、hover 纯底色）——
 * 原先这里是自绘的 24 高 `#545454` + 两个 20×20 带框按钮，与样式页底栏两套。
 * 高度 24→26、底色 `#545454`→`#535353` 的差异记在 `05` 计划 A-8 同类偏离里（视觉统一，非功能变化）。
 */
import { BottomBar } from '../../../components/BottomBar';
import type { PreviewMode } from '../../../store/font';
import { PreviewSetting } from './PreviewSetting';

interface Props {
  mode: PreviewMode;
  onMode: (mode: PreviewMode) => void;
  onToggleText: () => void;
}

export function PageFooter({ mode, onMode, onToggleText }: Props) {
  return (
    <BottomBar>
      <PreviewSetting mode={mode} onMode={onMode} onToggleText={onToggleText} />
    </BottomBar>
  );
}
