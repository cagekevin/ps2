/**
 * 字体快选（原版 `fontSetQuick`）
 *
 * 结构：整宽下拉（项内带删除图标）+ 最多 7 个字重图标；下拉底部是「添加当前图层字体」。
 * 对齐原版 `dropDowncom`（`app.v4.js:1344864`）的四个属性：
 *   `text` 当前字体、`selectIndex` 当前项、`bottom` 添加入口、`therrSvg` 项内删除
 *
 * 字重图标是**唯一**真正换字体的入口：点字体只切索引，不应用到图层。
 */

import { SelectBox } from '../../../components/SelectBox';
import { QUICK_FONT_WEIGHT_LIMIT, type QuickFont } from '../../../domain/quick-font';
import { weightIconName } from '../font-panel-constants';
import { IconButton } from '../../../components/IconButton';

interface Props {
  fonts: QuickFont[];
  index: number;
  onSelect: (index: number) => void;
  onApply: (weightIndex: number) => void;
  onAdd: () => void;
  /** 删除某一项（项内删除图标触发，不是删「当前项」） */
  onRemove: (index: number) => void;
}

export function FontQuick({ fonts, index, onSelect, onApply, onAdd, onRemove }: Props) {
  const current = fonts[index] ?? null;
  const weights = current ? current.zz.slice(0, QUICK_FONT_WEIGHT_LIMIT) : [];

  const options = fonts.map((font, position) => ({
    value: String(position),
    label: font.family
  }));

  return (
    <div className="mm-font-panel__quick">
      {fonts.length ? (
        <div className="mm-font-panel__quick-row">
          <SelectBox
            className="mm-font-panel__quick-select"
            options={options}
            value={String(index)}
            inset
            onChange={(value) => onSelect(Number(value))}
            onRemove={(value) => onRemove(Number(value))}
            footer={(close) => (
              <button
                type="button"
                className="mm-font-panel__quick-add"
                onClick={() => {
                  close();
                  onAdd();
                }}
              >
                添加当前图层字体
              </button>
            )}
          />
        </div>
      ) : (
        /* 一个都没有时下拉无从谈起，直接给添加入口 */
        <button type="button" className="mm-font-panel__quick-add" onClick={onAdd}>
          添加当前图层字体
        </button>
      )}

      {weights.length ? (
        <div className="mm-font-panel__quick-weights">
          {weights.map((weight, position) => (
            <IconButton
              key={`${weight}-${position}`}
              name={weightIconName(position)}
              title={weight}
              onClick={() => onApply(position)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
