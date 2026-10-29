/**
 * 字体列表项：家族名 + 操作区 / 预览 / 字重行。
 * `memo`：列表 30+ 条时，父级菜单开关不应让每一行重渲染。
 */
import { memo, type KeyboardEvent, type MouseEvent } from 'react';
import { Icon } from '../../../components/icons';
import type { FontItem } from '../../../domain/font-item';
import type { PreviewMode } from '../../../store/font';
import { FontWeight } from './FontWeight';
import { Rating } from './Rating';

interface Props {
  font: FontItem;
  star: number;
  active: boolean;
  previewMode: PreviewMode;
  sample: string;
  currentWeight: number;
  /** 非空 = 当前字重不能应用；内容就是失败原因（判据在 `domain/font-item`） */
  unavailableReason: string;
  onApply: (font: FontItem, index?: number) => void;
  onRate: (family: string, value: number) => void;
  onOpenTags: (event: MouseEvent<HTMLButtonElement>, family: string) => void;
}

function FontListItemInner({
  font,
  star,
  active,
  previewMode,
  sample,
  currentWeight,
  unavailableReason,
  onApply,
  onRate,
  onOpenTags
}: Props) {
  const unavailable = unavailableReason.length > 0;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onApply(font);
    }
  }

  return (
    <div
      className={`mm-font__item mm-font__item--${previewMode}${active ? ' mm-font__item--active' : ''}${
        unavailable ? ' mm-font__item--unavailable' : ''
      }`}
      tabIndex={0}
      aria-label={`应用字体 ${font.family}`}
      title={unavailable ? unavailableReason : undefined}
      onClick={() => onApply(font)}
      onKeyDown={onKeyDown}
    >
      <div className="mm-font__item-body">
        <div className="mm-font__name-row">
          <span
            className={`mm-font__family${previewMode === 'none' ? ' mm-font__family--name-only' : ''}`}
          >
            {font.family}
          </span>
          <div className="mm-font__actions">
            <button
              type="button"
              className="mm-btn mm-font__act"
              aria-label="管理标签"
              onClick={(event) => {
                event.stopPropagation();
                onOpenTags(event, font.family);
              }}
            >
              <Icon name="iconbiaoqian" />
            </button>
            <Rating selected={star} onRate={(value) => onRate(font.family, value)} />
          </div>
        </div>

        {previewMode !== 'none' ? (
          /* 用 div 而不是 pre：pre 带 UA 默认的 margin，页面上不许有 margin 声明。
             换行保留靠 CSS 的 `white-space: pre-wrap` */
          <div className={`mm-font__preview mm-font__preview--${previewMode}`}>
            {sample}
          </div>
        ) : null}

        <FontWeight
          font={font}
          current={currentWeight}
          onSelect={(index) => onApply(font, index)}
        />
      </div>
    </div>
  );
}

export const FontListItem = memo(FontListItemInner);
