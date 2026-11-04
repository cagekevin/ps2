/**
 * 字体列表项：家族名 + 操作区 / 预览 / 字重行。
 * `memo`：列表 30+ 条时，父级菜单开关不应让每一行重渲染。
 *
 * 字体栈（`--mm-preview-family`）只在这一处注入：家族名与预览文案共用同一份，
 * `font-family` 由 `FontList.css` 消费（`STYLE.md` §14.1：JS 只交变量）。
 * 只有「普通列表」档的家族名用它渲染；有预览时家族名是灰色 UI 字体（预览才是主角）。
 */
import { memo, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import { IconButton } from '../../../components/IconButton';
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
  /** `"PostScript名", "家族名"`（`domain/font-stack` 拼好），本项当前字重 */
  previewFamily: string;
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
  previewFamily,
  currentWeight,
  unavailableReason,
  onApply,
  onRate,
  onOpenTags
}: Props) {
  const unavailable = unavailableReason.length > 0;
  const familyStyle = { '--mm-preview-family': previewFamily } as CSSProperties;

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
            style={familyStyle}
          >
            {font.family}
          </span>
          <div className="mm-font__actions">
            <IconButton
              name="iconbiaoqian"
              title="管理标签"
              className="mm-icon-btn--inline"
              onClick={(event) => {
                event.stopPropagation();
                onOpenTags(event, font.family);
              }}
            />
            <Rating selected={star} onRate={(value) => onRate(font.family, value)} />
          </div>
        </div>

        {previewMode !== 'none' ? (
          /* 用 div 而不是 pre：pre 带 UA 默认的 margin，页面上不许有 margin 声明。
             换行保留靠 CSS 的 `white-space: pre-wrap` */
          <div className={`mm-font__preview mm-font__preview--${previewMode}`} style={familyStyle}>
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
