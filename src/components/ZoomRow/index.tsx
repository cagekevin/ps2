/**
 * 【唯一入口】缩放行 + 翻转行（常用页 / 字体面板共用）。
 *
 * 缩放行 = 「放大 / 缩小」下拉（`IconPanel` 抽屉）+ 4 个常用档位；
 * 翻转行 = 6 个图标按钮。页面只递动作（`onPick` / `onFlip`）与开合状态，
 * 不自己再拼一遍（两页共用这一份实现，`TD-09-19`）。
 */

import { Chevron } from '../Chevron';
import { IconButton } from '../IconButton';
import { IconPanel, IconPanelGroup } from '../IconPanel';
import { Icon, type IconName } from '../icons';
import { Button } from '../ui';
import type { FlipDirection } from '../../commands/common-use';
import { FLIP_ITEMS } from './zoom-items';
import './zoom-row.css';

interface ZoomRowProps {
  id: string;
  icon: IconName;
  label: string;
  /** 行内 4 个常用档位 */
  quick: readonly number[];
  /** 抽屉里的全部档位 */
  all: readonly number[];
  /** 受控开合：两行共用页面级的一个 id，跨行也互斥 */
  openId: string;
  onOpenChange: (openId: string) => void;
  onPick: (value: number) => void;
}

/** 一个缩放档位按钮：宽度由容器决定（行内 4 等分 / 抽屉里 5 列），自己不写宽 */
function ZoomPreset({ value, onClick }: { value: number; onClick: () => void }) {
  return (
    <Button title={String(value)} onClick={onClick}>
      {value}
    </Button>
  );
}

/** 一行缩放：「放大 / 缩小」下拉 + 4 个常用档位；点档位后收起抽屉 */
export function ZoomRow({
  id,
  icon,
  label,
  quick,
  all,
  openId,
  onOpenChange,
  onPick
}: ZoomRowProps) {
  return (
    <IconPanelGroup className="mm-zoom-row" openId={openId} onOpenChange={onOpenChange}>
      <IconPanel
        id={id}
        title={label}
        trigger={(handlers) => (
          <button
            type="button"
            className="mm-zoom-trigger mm-input-surface"
            aria-expanded={handlers['aria-expanded']}
            aria-controls={handlers['aria-controls']}
            onClick={handlers.toggle}
          >
            <Icon name={icon} />
            <span className="mm-zoom-label">{label}</span>
            <Chevron open={handlers['aria-expanded']} />
          </button>
        )}
        panel={(close) => (
          <div className="mm-btn-grid mm-zoom-all">
            {all.map((value) => (
              <ZoomPreset
                key={value}
                value={value}
                onClick={() => {
                  onPick(value);
                  close();
                }}
              />
            ))}
          </div>
        )}
      />
      <div className="mm-zoom-quick">
        {quick.map((value) => (
          <ZoomPreset key={value} value={value} onClick={() => onPick(value)} />
        ))}
      </div>
    </IconPanelGroup>
  );
}

interface FlipRowProps {
  onFlip: (direction: FlipDirection) => void;
}

/** 翻转 6 向：一排图标按钮，横向均分走公共 `.mm-icon-row` */
export function FlipRow({ onFlip }: FlipRowProps) {
  return (
    <div className="mm-u-row mm-u-row--wrap mm-icon-row">
      {FLIP_ITEMS.map((item) => (
        <IconButton
          key={item.direction}
          name={item.icon}
          title={item.title}
          onClick={() => onFlip(item.direction)}
        />
      ))}
    </div>
  );
}
