/**
 * 【范本】折叠行（原版 `.opencom`）
 *
 * 整行 100% × 24、箭头位 20×13、上下间距 12（`05-常用-尺寸与状态表` 实测）。
 * 箭头用 `Chevron`：官方靠 `rotate(-90deg)` 表示收起，不换图标、也不用文本字符。
 *
 * 收起时**不渲染内容**（不是 `display:none`）：折叠区里可能有请求与订阅，
 * 收起来还留着它们等于白付开销。要保留 DOM 就别用这个组件。
 *
 * 折叠态本身不在这里存：它是界面偏好（`core/prefs`），由页面通过 `usePersisted` 持有。
 */

import { useId, type ReactNode } from 'react';
import { Chevron } from '../Chevron';
import './collapse.css';

interface Props {
  /** 整行的标题（区域名） */
  title: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

/** 一行标题 +（展开时的）内容 */
export function Collapse({ title, open, onToggle, children, className = '' }: Props) {
  const bodyId = useId();

  return (
    <div className={`mm-collapse${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="mm-collapse__head"
        aria-expanded={open}
        aria-controls={open ? bodyId : undefined}
        onClick={() => onToggle(!open)}
      >
        <span className="mm-collapse__arrow">
          <Chevron open={open} size={12} />
        </span>
        <span className="mm-collapse__title">{title}</span>
      </button>
      {open ? (
        <div id={bodyId} className="mm-collapse__body">
          {children}
        </div>
      ) : null}
    </div>
  );
}
