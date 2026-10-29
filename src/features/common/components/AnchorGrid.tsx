/**
 * 九宫格锚点（原版 `.svg-wrap-one` / `.svg-wrap-two`，`app.v4.js:36277` 一带）。
 *
 * 只服务「自定义变换」的 `pointIndex 0-8`，所以留在 feature 里（与 `SpacingPanel` 同判据）：
 * 图标是官方锚点图标、语义是 `pointIndex`，放进公共层就会被当成通用九宫格复用。
 *
 * 原版把 9 个格子拆成「6 + 3」，第 4-6 个占位故意复用 9 号图标再 `visibility:hidden`
 * 盖掉——那是原版的排版取巧，不是行为。我们用**一个 6 列栅格**装 9 格：第一行 6 个、
 * 第二行 3 个，**不渲染那 3 个看不见的占位**（渲染了也点不到，只会让 DOM 里多 3 个假锚点）。
 *
 * 选中态换图标（`...weizhilan{n}`，蓝版），不换底色：与官方一致，也避免同页多一种「选中」画法。
 */

import { Icon, type IconName } from '../../../components/icons';
import './anchor-grid.css';

/** 锚点下标 → 图标名后缀（1-9 对应 pointIndex 0-8） */
const ANCHOR_COUNT = 9;

function anchorIcon(index: number, selected: boolean): IconName {
  const suffix = selected ? `lan${index + 1}` : `${index + 1}`;
  return `iconmaodianbianhuandianweizhi${suffix}` as IconName;
}

interface Props {
  /** 当前锚点 0-8（官方默认 0） */
  value: number;
  onChange: (value: number) => void;
}

export function AnchorGrid({ value, onChange }: Props) {
  return (
    <div className="mm-common__anchors" role="radiogroup" aria-label={'锚点位置'}>
      {Array.from({ length: ANCHOR_COUNT }, (_, index) => {
        const selected = index === value;
        return (
          <button
            key={index}
            type="button"
            role="radio"
            aria-checked={selected}
            title={`锚点 ${index + 1}`}
            className={
              selected ? 'mm-common__anchor mm-common__anchor--on' : 'mm-common__anchor'
            }
            onClick={() => onChange(index)}
          >
            <Icon name={anchorIcon(index, selected)} />
          </button>
        );
      })}
    </div>
  );
}
