/**
 * 【唯一入口】区域不可用遮罩 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】区域遮罩：内容照常渲染，提示盖在上面。
 *
 * 为什么不是「把内容换成一行提示」：那会让下面的东西整体上移。字体面板选文字图层 /
 * 不选时属性区一塌一展，两行图标跟着跳——用户看到的就是「面板在动」。
 * 遮罩不参与布局，高度由下面的内容撑住，位置不动。
 *
 * 文案与语气**不在这里定**：内部渲染 `StateHint`，全项目只有一套「空态 / 失败」措辞。
 *
 * 盖住就够了：用户点不到下面的东西，所以被盖住的控件**不需要**再逐个加 `disabled`。
 *
 * 新增同类「区域不可用」提示照此结构：不要自己写绝对定位 + 文案。
 */
import type { ReactNode } from 'react';
import type { Result } from '../../types/result';
import { StateHint } from '../StateHint';
import './state-mask.css';

/** 与 `StateHint` 同一支：`empty` 是「本来就没有」，`result` 是「读取失败」 */
type Overlay = { empty: string } | { result: Result<unknown>; onRetry?: () => void };

interface Props {
  /** null = 不盖；非 null 时盖住并显示提示 */
  overlay: Overlay | null;
  children: ReactNode;
}

export function StateMask({ overlay, children }: Props) {
  return (
    <div className="mm-state-mask">
      {children}
      {overlay ? (
        <div className="mm-state-mask__cover">
          <StateHint {...overlay} />
        </div>
      ) : null}
    </div>
  );
}
