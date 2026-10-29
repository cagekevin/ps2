/**
 * 【唯一入口】全屏加载 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】UI 横切 · 加载（**只渲染，不持有状态**）
 *
 * **全屏加载的唯一入口**：异步任务统一 `useLoading().run(task, tip?)` 包裹，
 * 页面不自己维护 loading 状态、不自己渲染遮罩。
 *
 * 状态在 `core/feedback/loading.ts`（与 `Toast` 同因：状态放渲染层会让 `hooks` 反向依赖
 * `components`）。这里只订阅文案栈并渲染遮罩。
 *
 * 遮罩内容照原版 `GlobalLoading` + `NewSpin`：全屏半透明底 + 转圈 + 文案。
 * 支持嵌套（计数器）与文案栈：后进的 run 覆盖提示语，全部结束后遮罩才消失。
 */
import { useEffect, type ReactNode } from 'react';
import { DEFAULT_LOADING_TIP, mountLoading } from '../../core/feedback/loading';
import { useLoadingTips } from '../../hooks/useLoading';
import { Spin } from '../Spin';
import './Loading.css';

export { useLoading } from '../../hooks/useLoading';
export type { LoadingActions } from '../../core/feedback/loading';

export function LoadingProvider({ children }: { children: ReactNode }) {
  const tips = useLoadingTips();

  /* 挂载登记：为 0 时 `loading.show` 会留痕「转圈不会显示」，不静默 */
  useEffect(() => mountLoading(), []);

  const visible = tips.length > 0;
  /* 文案栈顶：嵌套时显示最内层的提示 */
  const tip = tips[tips.length - 1] ?? DEFAULT_LOADING_TIP;

  return (
    <>
      {children}
      {visible ? (
        <div className="mm-loading__mask">
          <Spin tip={tip} />
        </div>
      ) : null}
    </>
  );
}
