/**
 * 拆分文本面板（原版 `split`）：2×2 四个按钮，点了直接发命令。
 *
 * 原版「先探一次再执行」的两步在 `commands/font-set.split` 里，页面只管发 mode。
 */

import { SPLIT_BUTTONS, SPLIT_TITLES } from '../font-panel-constants';

const MODES = [1, 2, 3, 4] as const;

interface Props {
  onSplit: (mode: 1 | 2 | 3 | 4) => void;
}

export function SplitPanel({ onSplit }: Props) {
  return (
    <div className="mm-u-col mm-font-panel__panel mm-font-panel__split">
      {SPLIT_BUTTONS.map((text, index) => (
        <button
          key={text}
          type="button"
          className="mm-font-panel__split-btn"
          title={SPLIT_TITLES[index]}
          onClick={() => onSplit(MODES[index] ?? 1)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
