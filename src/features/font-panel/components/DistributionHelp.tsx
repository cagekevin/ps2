/**
 * 分布弹窗里的「高级用法」折叠块（原版 `app.v4.js:1321235`）
 *
 * 原版是 `f-baseX cursor` 的一行 + 箭头（`rotate-90` 收起 / `rotate0` 展开），
 * 点击切换；文案逐字照抄。
 */

import { useState } from 'react';
import { Icon } from '../../../components/icons';

export function DistributionHelp() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="mm-font-panel__advanced"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        高级用法
        <Icon
          name="iconzhankaizhedie"
          size={8}
          className={`mm-font-panel__caret${open ? ' mm-font-panel__caret--open' : ''}`}
        />
      </button>

      {open ? (
        <div className="mm-font-panel__help">
          <p>固定间距：高度1，高度2，高度3</p>
          <p>如：20,30,40</p>
          <p>比例间距：高度=比例</p>
          <p>如20=1:2:1</p>
          <p>递增间距：高度+=比例，如20=5</p>
        </div>
      ) : null}
    </>
  );
}
